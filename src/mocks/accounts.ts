import type { CollectorUser, CollectorWallet, NetworkChain } from '@/contracts/kronos.types';
import { dbState, getCurrentUser, persistDb, switchMockSession } from '@/mocks/db';

export class MockApiError extends Error {
  constructor(public code: string, message: string, public status = 422, public fields: Record<string, string> = {}) { super(message); }
}
const fail = (field: string, message: string): never => { throw new MockApiError('VALIDATION_ERROR', message, 422, { [field]: message }); };
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export function requireUser() {
  const user = getCurrentUser();
  if (!user) throw new MockApiError('UNAUTHORIZED', 'Entre na sua conta para continuar.', 401);
  return dbState.users[user.id]!;
}
function profileValues(body: Record<string, unknown>) {
  const name = text(body.name), email = text(body.email).toLowerCase(), handle = text(body.handle).toLowerCase();
  if (name.length < 2 || name.length > 80) fail('name', 'Informe um nome entre 2 e 80 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail('email', 'Informe um e-mail válido.');
  if (!/^@[a-z0-9_.]{3,30}$/.test(handle)) fail('handle', 'Use @ e entre 3 e 30 letras, números, pontos ou sublinhados.');
  return { name, email, handle };
}
function unique(email: string, handle: string, except?: string) {
  for (const u of Object.values(dbState.users)) {
    if (u.id === except) continue;
    const field = u.email.toLowerCase() === email ? 'email' : u.handle.toLowerCase() === handle ? 'handle' : null;
    if (field) throw new MockApiError('ACCOUNT_CONFLICT', field === 'email' ? 'Este e-mail já está cadastrado.' : 'Este handle já está em uso.', 409, { [field]: 'Já cadastrado.' });
  }
}
function validatePassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128 || !/[a-z]/i.test(value) || !/\d/.test(value)) fail('password', 'Use de 8 a 128 caracteres, com letras e números.');
  return value as string;
}
async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}
async function credential(password: string) {
  const salt = crypto.randomUUID();
  return { salt, hash: await hashPassword(password, salt) };
}
async function ensureDemoCredential(id: string) {
  if (!dbState.credentials[id] && ['user-maya', 'user-theo'].includes(id)) {
    dbState.credentials[id] = await credential('Kronos123!');
    persistDb();
  }
}
export async function registerAccount(body: Record<string, unknown>): Promise<CollectorUser | null> {
  const values = profileValues(body);
  unique(values.email, values.handle);
  const password = validatePassword(body.password);
  if (body.confirmPassword !== password) fail('confirmPassword', 'As senhas não coincidem.');
  const stored = await credential(password);
  unique(values.email, values.handle);
  const id = `user-${crypto.randomUUID()}`;
  dbState.users[id] = { id, ...values, ethBalance: '0.000000000000000000', krnUnits: 0, krnBalance: '0,00 KRN', favorites: [], wallets: [] };
  dbState.credentials[id] = stored;
  return switchMockSession(id);
}
export async function loginAccount(body: Record<string, unknown>) {
  const email = text(body.email).toLowerCase();
  const user = Object.values(dbState.users).find(u => u.email.toLowerCase() === email);
  if (user) await ensureDemoCredential(user.id);
  const stored = user ? dbState.credentials[user.id] : undefined;
  if (!user || !stored || typeof body.password !== 'string' || await hashPassword(body.password, stored.salt) !== stored.hash) {
    throw new MockApiError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', 401, { password: 'Confira suas credenciais.' });
  }
  return switchMockSession(user.id);
}
export function updateProfile(body: Record<string, unknown>) {
  const user = requireUser(), values = profileValues({ ...user, ...body });
  unique(values.email, values.handle, user.id);
  const avatarUrl = body.avatarUrl === undefined ? user.avatarUrl : text(body.avatarUrl);
  if (avatarUrl && (!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(avatarUrl) || avatarUrl.length > 750000)) fail('avatarUrl', 'Use uma imagem PNG, JPEG ou WebP de até 500 KB.');
  Object.assign(user, values, { avatarUrl });
  persistDb();
  return getCurrentUser();
}
export async function changePassword(body: Record<string, unknown>) {
  const user = requireUser();
  await ensureDemoCredential(user.id);
  const stored = dbState.credentials[user.id];
  if (!stored || typeof body.currentPassword !== 'string' || await hashPassword(body.currentPassword, stored.salt) !== stored.hash) fail('currentPassword', 'A senha atual está incorreta.');
  const password = validatePassword(body.password);
  if (body.confirmPassword !== password) fail('confirmPassword', 'As senhas não coincidem.');
  dbState.credentials[user.id] = await credential(password);
  persistDb();
}
export const networks: NetworkChain[] = ['ethereum-mainnet', 'base-mainnet', 'arbitrum-one', 'zora-network'];
export function saveWallet(body: Record<string, unknown>, id?: string) {
  const user = requireUser(), existing = user.wallets.find(w => w.id === id);
  if (id && !existing) throw new MockApiError('NOT_FOUND', 'Carteira não encontrada.', 404);
  const values = { ...existing, ...body };
  const label = text(values.label), address = text(values.address);
  if (label.length < 2 || label.length > 80) fail('label', 'Informe um nome entre 2 e 80 caracteres.');
  if (address !== existing?.address && !/^0x[a-f0-9]{40}$/i.test(address)) fail('address', 'Informe um endereço EVM de 42 caracteres.');
  if (!networks.includes(values.network as NetworkChain)) fail('network', 'Selecione uma rede válida.');
  if (!['CONNECTED', 'DISCONNECTED', 'REFUSED'].includes(String(values.status))) fail('status', 'Estado de conexão inválido.');
  if (user.wallets.some(w => w.id !== id && w.address.toLowerCase() === address.toLowerCase() && w.network === values.network)) throw new MockApiError('WALLET_CONFLICT', 'Esta carteira já existe nesta rede.', 409);
  const wallet: CollectorWallet = { id: id || `wallet-${crypto.randomUUID()}`, label, address, network: values.network as NetworkChain, status: values.status as CollectorWallet['status'], isPrimary: values.isPrimary === true || user.wallets.length === 0 };
  if (existing?.isPrimary && !wallet.isPrimary && user.wallets.length === 1) fail('isPrimary', 'Mantenha uma carteira principal.');
  if (wallet.isPrimary) user.wallets.forEach(w => { w.isPrimary = false; });
  if (existing) Object.assign(existing, wallet); else user.wallets.push(wallet);
  if (!user.wallets.some(w => w.isPrimary)) user.wallets.find(w => w.id !== id)!.isPrimary = true;
  persistDb();
  return getCurrentUser();
}
export function deleteWallet(id: string) {
  const user = requireUser();
  if (!user.wallets.some(w => w.id === id)) throw new MockApiError('NOT_FOUND', 'Carteira não encontrada.', 404);
  user.wallets = user.wallets.filter(w => w.id !== id);
  if (user.wallets.length && !user.wallets.some(w => w.isPrimary)) user.wallets[0]!.isPrimary = true;
  persistDb();
  return getCurrentUser();
}
