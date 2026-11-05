import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CollectorUser, CollectorWallet, OrderReceiptSnapshot } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { purgeSessionCache } from '@/lib/query-client';
import { disconnectRealtimeSocket } from '@/lib/socket-client';
import { errorMessage } from '@/lib/errors';
import { ApiForm, type FormField } from './AccountForms';

const networks = ['ethereum-mainnet', 'base-mainnet', 'arbitrum-one', 'zora-network'];
function WalletEditor({ wallet, saved, onToast }: { wallet?: CollectorWallet; saved: (user: CollectorUser | null) => void; onToast: (message: string) => void }) {
  const deletion = useMutation({ mutationFn: async () => (await apiClient.delete<{ user: CollectorUser }>(`/wallets/${wallet!.id}`)).data.user, onSuccess: saved, onError: e => onToast(errorMessage(e)) });
  const fields: FormField[] = [
    { name: 'label', label: 'Nome da carteira', value: wallet?.label, required: true, minLength: 2 },
    { name: 'address', label: 'Endereço EVM', value: wallet?.address, required: true },
    { name: 'network', label: 'Rede', value: wallet?.network || networks[0], options: networks },
    { name: 'status', label: 'Estado da conexão', value: wallet?.status || 'CONNECTED', options: ['CONNECTED', 'DISCONNECTED', 'REFUSED'] },
    { name: 'isPrimary', label: 'Carteira principal', type: 'checkbox', checked: wallet?.isPrimary }
  ];
  return <details className="wallet-editor" open={!wallet}><summary>{wallet ? `${wallet.label} · ${wallet.isPrimary ? 'Principal' : 'Secundária'} · ${wallet.status}` : 'Cadastrar nova carteira'}</summary><ApiForm id={wallet?.id || 'new-wallet'} fields={fields} endpoint={wallet ? `/wallets/${wallet.id}` : '/wallets'} method={wallet ? 'patch' : 'post'} submit={wallet ? 'Salvar carteira' : 'Cadastrar carteira'} onSuccess={saved} />{wallet && <button className="btn danger" disabled={deletion.isPending} onClick={() => deletion.mutate()}>Excluir carteira</button>}</details>;
}
export function AccountPage({ user, orders, onToast, onAuthenticate }: { user: CollectorUser | null; orders: OrderReceiptSnapshot[]; onToast: (message: string) => void; onAuthenticate: (mode: 'login' | 'register') => void }) {
  const queryClient = useQueryClient();
  const saved = (nextUser: CollectorUser | null) => { queryClient.setQueryData(['session'], nextUser); onToast('Alterações salvas no arquivo.'); };
  const switchAccount = useMutation({
    mutationFn: async (userId: string | null) => { await queryClient.cancelQueries(); disconnectRealtimeSocket(); return (await apiClient.post<{ user: CollectorUser | null }>(userId ? '/auth/switch' : '/auth/logout', { userId })).data.user; },
    onSuccess: async next => { await purgeSessionCache(); queryClient.setQueryData(['session'], next); onToast(next ? `Sessão iniciada: ${next.handle}.` : 'Sessão encerrada.'); },
    onError: e => onToast(errorMessage(e))
  });
  const reset = useMutation({ mutationFn: async () => { await apiClient.post('/__mock/reset'); disconnectRealtimeSocket(); await purgeSessionCache(); }, onSuccess: () => { void queryClient.invalidateQueries(); onToast('Arquivo de demonstração restaurado.'); } });
  return <section><div className="page-heading"><span className="eyebrow">05 // IDENTIDADE & ACERVO PESSOAL</span><h1>Seu registro no arquivo.</h1></div>
    <details className="demo-controls"><summary>Contas e controles de demonstração</summary><div className="button-row"><button className="btn" disabled={switchAccount.isPending} onClick={() => switchAccount.mutate('user-maya')}>Maya Lin (@maya.collector)</button><button className="btn" disabled={switchAccount.isPending} onClick={() => switchAccount.mutate('user-theo')}>Theo Void (@theo.archive)</button><button className="btn" disabled={switchAccount.isPending} onClick={() => switchAccount.mutate(null)}>Fazer Logout (Visitante)</button><button className="btn" disabled={reset.isPending} onClick={() => reset.mutate()}>Resetar Banco MSW</button></div></details>
    {!user ? <div className="error-panel"><h2>Entre para acessar seu acervo.</h2><p>Seu carrinho de visitante será preservado ao entrar.</p><div className="button-row"><button className="btn primary" onClick={() => onAuthenticate('login')}>Entrar na conta</button><button className="btn" onClick={() => onAuthenticate('register')}>Criar conta</button></div></div> : <div className="commerce-grid">
      <div><div className="form-panel cut"><div className="profile-heading">{user.avatarUrl && <img className="avatar" src={user.avatarUrl} alt={`Avatar de ${user.name}`} />}<div><span className="eyebrow">// PERFIL DO COLECIONADOR</span><h2>{user.name}</h2><p className="mono">{user.handle}</p></div></div><ApiForm id="profile" endpoint="/profile" method="patch" submit="Salvar perfil" onSuccess={saved} fields={[{ name: 'name', label: 'Nome', value: user.name, required: true, minLength: 2, autoComplete: 'name' }, { name: 'email', label: 'E-mail', value: user.email, type: 'email', required: true, autoComplete: 'email' }, { name: 'handle', label: 'Handle', value: user.handle, required: true, pattern: '@[a-zA-Z0-9_.]{3,30}' }]} /></div>
      <div className="form-panel account-block"><h2>Alterar senha</h2><p className="muted">Use ao menos 8 caracteres, com letras e números.</p><ApiForm id="password" endpoint="/profile/password" submit="Atualizar senha" onSuccess={() => onToast('Senha atualizada.')} fields={[{ name: 'currentPassword', label: 'Senha atual', type: 'password', required: true, autoComplete: 'current-password' }, { name: 'password', label: 'Nova senha', type: 'password', required: true, minLength: 8, autoComplete: 'new-password' }, { name: 'confirmPassword', label: 'Confirmar nova senha', type: 'password', required: true, minLength: 8, autoComplete: 'new-password' }]} /></div>
      <div className="form-panel account-block"><h2>Carteiras ({user.wallets.length})</h2><p className="muted">Gerencie endereços, rede e conexão simulada.</p>{user.wallets.map(wallet => <WalletEditor key={wallet.id} wallet={wallet} saved={saved} onToast={onToast} />)}<WalletEditor saved={saved} onToast={onToast} /></div></div>
      <aside className="quote-summary-card cut"><span className="eyebrow">// RECIBOS DESTA CONTA ({orders.length})</span><h2>Histórico de aquisições</h2><p className="mono balance-row">{user.ethBalance} ETH<br />{user.krnBalance} · {user.favorites.length} favoritos</p>{orders.length === 0 ? <p className="muted">Nenhum recibo registrado para a sessão atual.</p> : orders.map(o => <article className="receipt-item" key={o.orderId}><strong className="mono">{o.orderId}</strong><p className="version-tag">{o.status} · {o.paymentRail}</p><p className="eth">{o.totalEth} ETH</p><p>{o.totalBrlFormatted}</p><p>{o.items.map(i => `${i.quantity}× ${i.title}`).join(', ')}</p><details><summary>Dados do recibo</summary><p className="mono">Chave: {o.idempotencyKey}<br />Transação: {o.txHash || 'Não emitida'}<br />Stripe: {o.stripePaymentIntentId || 'Web3'}</p></details></article>)}</aside>
    </div>}
  </section>;
}
