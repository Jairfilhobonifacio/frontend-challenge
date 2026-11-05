const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { buildSync } = require('esbuild');
const Module = require('node:module');
const path = require('node:path');
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k), key: i => [...storage.keys()][i], get length() { return storage.size; } };
const result = buildSync({ stdin: { contents: `export * from './src/lib/eth-math'; export * from './src/lib/catalog-search'; export * from './src/mocks/db'; export * from './src/mocks/accounts';`, resolveDir: path.resolve(__dirname, '../..') }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent' });
const compiled = new Module(path.resolve(__dirname, 'runtime.cjs'));
compiled._compile(result.outputFiles[0].text, path.resolve(__dirname, 'runtime.cjs'));
const E = compiled.exports;
beforeEach(() => E.resetMockDb());
const accept = () => { for (const item of E.dbState.cartsByOwner[E.getOwnerKey()] || []) item.addedVersion = E.dbState.nfts.find(n => n.id === item.nftId).version; return E.buildQuoteForCurrentOwner(); };
const registration = { name: 'Ari Archive', handle: '@ari.archive', email: 'ari@example.test', password: 'Archive123!', confirmPassword: 'Archive123!' };

test('01 · catálogo: 12 obras, filtros combinados, ordenação, paginação e busca normalizada', () => {
  const filters = E.validateMarketplaceSearch({ page: '2' });
  const page2 = E.selectCatalog(E.dbState.nfts, filters);
  assert.equal(page2.total, 12); assert.equal(page2.items.length, 6); assert.equal(page2.items[0].code, 'K—007');
  const filtered = E.selectCatalog(E.dbState.nfts, E.validateMarketplaceSearch({ q: 'maya', category: 'generative', standard: 'ERC-721', available: '1', sort: 'price_asc' }));
  assert.equal(filtered.total, 4); assert.equal(filtered.items[0].id, 'k-004');
  assert.equal(E.validateMarketplaceSearch({ page: NaN, sort: 'oops', standard: 'oops', view: 'oops' }).page, 1);
  assert.equal(E.safeReturnTo('//evil.test'), undefined); assert.equal(E.safeReturnTo('/checkout'), '/checkout');
});
test('02 · detalhe, supply 1/1, edição esgotada e precisão de 1 Wei', () => {
  assert.equal(E.dbState.nfts[0].editions[0].maxPerCollector, 1);
  assert.ok(E.dbState.nfts[11].editions.every(e => e.availableSupply === 0));
  assert.equal(E.formatWeiToEth(E.parseEthToWei('0.1') + E.parseEthToWei('0.2')), '0.300000000000000000');
  assert.equal(E.parseEthToWei('0.180000000000000001') % 10n, 1n);
  assert.equal(E.weiToBrlCents(E.parseEthToWei('1')), 1520000);
  assert.throws(() => E.parseEthToWei('0.0000000000000000001'));
});
test('03 · cadastro, login, conflito 409, senha com salt e merge de visitante', async () => {
  E.switchMockSession(null); E.dbState.cartsByOwner.guest.push({ nftId: 'k-004', editionId: 'study', quantity: 2, addedVersion: 1 });
  const user = await E.registerAccount(registration);
  assert.equal(E.getCurrentUser().id, user.id); assert.equal(E.buildQuoteForCurrentOwner().items[0].quantity, 2);
  assert.equal(E.dbState.cartsByOwner.guest.length, 0); assert.ok(E.dbState.credentials[user.id].salt); assert.equal(E.dbState.credentials[user.id].hash.length, 64);
  assert.ok(!JSON.stringify(E.dbState).includes(registration.password));
  await assert.rejects(E.registerAccount(registration), e => e.status === 409);
  E.switchMockSession(null); await assert.rejects(E.loginAccount({ email: registration.email, password: 'wrong' }), e => e.code === 'INVALID_CREDENTIALS');
  await E.loginAccount({ email: registration.email.toUpperCase(), password: registration.password }); assert.equal(E.getCurrentUser().id, user.id);
});
test('04 · favoritos e dados privados pertencem à conta correta', () => {
  assert.deepEqual(E.getCurrentUser().favorites, ['k-001', 'k-003']);
  const copy = E.getCurrentUser(); copy.favorites.push('k-012'); assert.equal(E.getCurrentUser().favorites.length, 2);
  E.switchMockSession('user-theo'); assert.deepEqual(E.getCurrentUser().favorites, ['k-002']);
  E.switchMockSession(null); assert.equal(E.getCurrentUser(), null); assert.throws(() => E.updateProfile({ name: 'Bad' }), e => e.status === 401);
});
test('05 · cotação, cupom, quantidades e merge com limite por edição', () => {
  const quote = E.buildQuoteForCurrentOwner(); assert.equal(quote.couponCode, 'KRONOS10');
  assert.equal(quote.subtotalEth, '0.180000000000000001'); assert.equal(quote.discountEth, '0.018000000000000000');
  assert.equal(E.parseEthToWei(quote.totalEth), E.parseEthToWei(quote.subtotalEth) - E.parseEthToWei(quote.discountEth) + E.parseEthToWei(quote.networkFeeEth));
  E.switchMockSession(null); E.dbState.cartsByOwner.guest.push({ nftId: 'k-001', editionId: 'study', quantity: 3, addedVersion: 1 });
  E.switchMockSession('user-maya'); assert.equal(E.buildQuoteForCurrentOwner().items[0].quantity, 3);
});
test('06 · compra confirmada, recibo imutável e baixa apenas dos itens comprados', () => {
  const quote = E.buildQuoteForCurrentOwner(), stock = E.dbState.nfts[0].editions[1].availableSupply;
  E.executeMockOrderSettlement(quote, 'stripe-pix', 'flow-06', 'PENDING');
  E.dbState.cartsByOwner['user-maya'].push({ nftId: 'k-004', editionId: 'study', quantity: 1, addedVersion: 1 });
  const result = E.executeMockOrderSettlement(quote, 'stripe-pix', 'flow-06', 'CONFIRMED');
  assert.equal(result.order.status, 'CONFIRMED'); assert.equal(E.dbState.nfts[0].editions[1].availableSupply, stock - 1);
  assert.equal(E.buildQuoteForCurrentOwner().items[0].nftId, 'k-004');
  const locked = result.order.totalEth; E.dbState.nfts[0].editions[1].priceEth = '99.000000000000000000'; assert.equal(result.order.totalEth, locked);
});
test('07 · recusa, replay idempotente, chave ausente e conflito de payload', () => {
  const quote = E.buildQuoteForCurrentOwner();
  assert.throws(() => E.executeMockOrderSettlement(quote, 'stripe-pix', '', 'CONFIRMED'), e => e.code === 'VALIDATION_ERROR');
  const first = E.executeMockOrderSettlement(quote, 'stripe-pix', 'flow-07', 'REFUSED');
  assert.equal(E.buildQuoteForCurrentOwner().items.length, 1); assert.equal(first.order.krnRewardEarned, '0,00 KRN');
  const replay = E.executeMockOrderSettlement(quote, 'stripe-pix', 'flow-07', 'CONFIRMED'); assert.equal(replay.order.status, 'REFUSED'); assert.equal(replay.replayed, true); assert.equal(E.dbState.orders.length, 1);
  assert.throws(() => E.executeMockOrderSettlement({ ...quote, totalEth: '0' }, 'stripe-pix', 'flow-07', 'CONFIRMED'), e => e.code === 'IDEMPOTENCY_CONFLICT');
});
test('08 · perfil, senha e carteiras validados, incluindo quatro redes', async () => {
  E.updateProfile({ name: 'Maya Archive', email: 'MAYA@kronos.archive', handle: '@maya.collector' }); assert.equal(E.getCurrentUser().name, 'Maya Archive');
  assert.throws(() => E.updateProfile({ email: 'theo@kronos.archive' }), e => e.status === 409);
  assert.throws(() => E.updateProfile({ avatarUrl: 'javascript:alert(1)' }), e => e.status === 422);
  await E.changePassword({ currentPassword: 'Kronos123!', password: 'NewArchive9!', confirmPassword: 'NewArchive9!' });
  await assert.rejects(E.loginAccount({ email: 'maya@kronos.archive', password: 'Kronos123!' }));
  await E.loginAccount({ email: 'maya@kronos.archive', password: 'NewArchive9!' });
  E.saveWallet({ label: 'Zora Vault', address: `0x${'a'.repeat(40)}`, network: 'zora-network', status: 'REFUSED', isPrimary: true });
  const wallet = E.getCurrentUser().wallets.find(w => w.label === 'Zora Vault'); assert.equal(E.getCurrentUser().wallets.filter(w => w.isPrimary).length, 1);
  E.saveWallet({ status: 'CONNECTED', network: 'arbitrum-one' }, wallet.id); E.deleteWallet(wallet.id); assert.equal(E.getCurrentUser().wallets.filter(w => w.isPrimary).length, 1);
});
test('09 · preço/estoque desatualizados bloqueiam liquidação até revalidar', () => {
  const old = E.buildQuoteForCurrentOwner();
  assert.equal(E.applyMockNftUpdate('k-001', 'study', '0.25', 11, 2, 'update-09'), true);
  assert.equal(E.buildQuoteForCurrentOwner().isStale, true);
  assert.throws(() => E.executeMockOrderSettlement(old, 'stripe-pix', 'flow-09', 'CONFIRMED'), e => e.code === 'STALE_QUOTE');
  assert.equal(accept().isStale, false);
});
test('10 · duplicatas, eventos antigos, pedido pendente e isolamento da chave', () => {
  assert.equal(E.applyMockNftUpdate('k-001', 'study', '0.2', 12, 3, 'event-10'), true);
  assert.equal(E.applyMockNftUpdate('k-001', 'study', '9', 1, 3, 'other-event'), false);
  assert.equal(E.applyMockNftUpdate('k-001', 'study', '9', 1, 4, 'event-10'), false);
  const quote = accept(), a = E.executeMockOrderSettlement(quote, 'stripe-pix', 'shared-key', 'PENDING');
  assert.equal(E.dbState.nfts[0].editions[1].availableSupply, 12); assert.equal(a.order.status, 'PENDING');
  E.switchMockSession('user-theo'); assert.throws(() => E.executeMockOrderSettlement(quote, 'stripe-pix', 'shared-key', 'CONFIRMED'), e => e.code === 'STALE_QUOTE');
});
test('11 · validação de formulários e proteção de saldos e payloads manipulados', async () => {
  await assert.rejects(E.registerAccount({ ...registration, confirmPassword: 'no' }), e => !!e.fields.confirmPassword);
  assert.throws(() => E.saveWallet({ label: 'bad', address: '0x1', network: 'zora-network', status: 'CONNECTED' }), e => !!e.fields.address);
  const quote = E.buildQuoteForCurrentOwner(); assert.throws(() => E.executeMockOrderSettlement({ ...quote, totalEth: '0' }, 'stripe-pix', 'tampered', 'CONFIRMED'), e => e.code === 'STALE_QUOTE');
  assert.throws(() => E.executeMockOrderSettlement({ ...quote, expiresAt: 1 }, 'stripe-pix', 'expired', 'CONFIRMED'), e => e.code === 'STALE_QUOTE');
});
test('12 · reset persistente e SHA-256 real dos bytes da obra cunhada', async () => {
  const media = Buffer.from('deterministic artwork');
  const nft = await E.createNewMintedArtifact({ title: 'Unit mint', collectionName: 'Archive', creatorHandle: '@maya.collector', category: 'generative', description: 'Test', standard: 'ERC-721', priceEth: '0.45', totalSupply: 1, maxPerCollector: 1, royaltyBps: 500, mediaDataUrl: `data:image/png;base64,${media.toString('base64')}`, recipe: { algorithm: 'orbital-copper', seedHex: '0xabcd', complexity: 10, accentHue: 230 } });
  assert.equal(nft.sha256Hash, require('node:crypto').createHash('sha256').update(media).digest('hex'));
  assert.equal(nft.code, 'K—013'); assert.equal(E.dbState.nfts[0].id, nft.id);
  E.resetMockDb(); assert.equal(E.dbState.nfts.length, 12); assert.equal(E.dbState.orders.length, 0);
  assert.equal(JSON.parse(localStorage.getItem('kronos.modular-db.v2')).nfts.length, 12);
});
