import React, { useEffect, useState } from 'react';
import { subscribeRealtimeEvents } from '@/lib/socket-client';
import { errorMessage } from '@/lib/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CollectorUser,
  MultiCurrencyQuote,
  OrderReceiptSnapshot,
  PaymentRail
} from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { formatShortEth, formatWeiToEth, parseEthToWei } from '@/lib/eth-math';
import { KronosIcon } from '@/components/icons/KronosIcons';

interface CheckoutPageProps {
  user: CollectorUser | null;
  quote: MultiCurrencyQuote | undefined;
  onNavigateAccount: () => void;
  onNavigateExplore: () => void;
  onToast: (message: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  user,
  quote,
  onNavigateAccount,
  onNavigateExplore,
  onToast
}) => {
  const queryClient = useQueryClient();
  const attemptStorageKey = `kronos.checkout.${user?.id || 'guest'}`;
  const readAttempt = () => { try { return JSON.parse(localStorage.getItem(attemptStorageKey) || 'null') as { key: string; quote: MultiCurrencyQuote; rail: PaymentRail; outcome: 'CONFIRMED' | 'REFUSED' } | null; } catch { return null; } };
  const [recovering, setRecovering] = useState(!!readAttempt());
  const [walletId, setWalletId] = useState(user?.wallets.find(w => w.isPrimary)?.id || '');
  const wallet = user?.wallets.find(w => w.id === walletId);
  const [collectorName, setCollectorName] = useState(user?.name || '');
  const [collectorEmail, setCollectorEmail] = useState(user?.email || '');
  const [, setClock] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { setReviewed(false); }, [quote?.totalEth, quote?.isStale]);
  const [reviewed, setReviewed] = useState(false);
  const [selectedRail, setSelectedRail] = useState<PaymentRail>(readAttempt()?.rail || 'stripe-pix');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => readAttempt()?.key || `idem_${crypto.randomUUID()}`);
  const [completedOrder, setCompletedOrder] = useState<OrderReceiptSnapshot | null>(null);
  const [lockedQuoteSnapshot, setLockedQuoteSnapshot] = useState<MultiCurrencyQuote | null>(() => readAttempt()?.quote || null);

  useEffect(() => {
    const attempt = readAttempt();
    if (!attempt) return;
    let cancelled = false;
    void apiClient.get<{ order: OrderReceiptSnapshot }>(`/orders/${encodeURIComponent(attempt.key)}`).then(res => {
      if (!cancelled) setCompletedOrder(res.data.order);
    }).catch(() => { /* The persisted attempt can be safely retried with its original key. */ }).finally(() => { if (!cancelled) setRecovering(false); });
    return () => { cancelled = true; };
  }, [attemptStorageKey]);
  useEffect(() => subscribeRealtimeEvents(event => {
    if (event.type === 'order.updated' && event.userId === user?.id && readAttempt()) {
      void apiClient.get<{ order: OrderReceiptSnapshot }>(`/orders/${encodeURIComponent(idempotencyKey)}`).then(res => setCompletedOrder(res.data.order)).catch(() => undefined);
    }
  }), [user?.id, idempotencyKey]);
  useEffect(() => {
    if (completedOrder?.status !== 'PENDING') return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void apiClient.get<{ order: OrderReceiptSnapshot }>(`/orders/${encodeURIComponent(idempotencyKey)}`).then(res => { if (!cancelled) setCompletedOrder(res.data.order); }).catch(() => undefined);
    }, 500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [completedOrder?.status, idempotencyKey]);
  function startNewAttempt() {
    localStorage.removeItem(attemptStorageKey); setCompletedOrder(null); setLockedQuoteSnapshot(null);
    setIdempotencyKey(`idem_${crypto.randomUUID()}`); setReviewed(false); orderMutation.reset();
  }

  const revalidateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/quotes/revalidate');
      return res.data;
    },
    onSuccess: () => {
      startNewAttempt();
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      onToast('Cotação revalidada e desbloqueada para pagamento.');
    },
    onError: error => onToast(errorMessage(error))
  });

  const orderMutation = useMutation({
    mutationFn: async (vars: {
      quoteToSubmit: MultiCurrencyQuote;
      paymentRail: PaymentRail;
      outcome: 'CONFIRMED' | 'REFUSED';
    }) => {
      localStorage.setItem(attemptStorageKey, JSON.stringify({ key: idempotencyKey, quote: vars.quoteToSubmit, rail: vars.paymentRail, outcome: vars.outcome }));
      const res = await apiClient.post<{ order: OrderReceiptSnapshot; replayed: boolean }>(
        '/orders',
        {
          quote: vars.quoteToSubmit,
          paymentRail: vars.paymentRail,
          outcome: vars.outcome,
          collectorName, collectorEmail, walletId
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setCompletedOrder(data.order);
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['nfts'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['session'] });
      onToast(
        data.order.status === 'PENDING' ? 'Pedido pendente. Aguardando liquidação simulada.' :
        data.replayed
          ? `IDEMPOTÊNCIA COMPROVADA: Mesma chave ${idempotencyKey} recuperou o pedido ${data.order.orderId} sem duplicar!`
          : data.order.status === 'CONFIRMED'
            ? `Pedido ${data.order.orderId} confirmado com sucesso!`
            : 'Pagamento recusado. Itens preservados no Cofre.'
      );
    },
    onError: (err) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onToast(e.response?.data?.message || e.message || 'Erro ao processar pagamento.');
    }
  });

  const simulateLivePriceChangeInCheckout = async () => {
    const first = quote?.items[0];
    if (!first) return;
    const nextWei = parseEthToWei(first.unitPriceEth) + parseEthToWei('0.020000000000000000');
    await apiClient.post('/__mock/ws-emit', {
      nftId: first.nftId,
      editionId: first.editionId,
      newPriceEth: formatWeiToEth(nextWei),
      newAvailableSupply: first.availableSupply,
      version: first.nftVersion + 1
    });
    onToast(`Evento Socket.IO nft.updated recebido: cotação marcada como STALE_QUOTE.`);
  };

  if (recovering) return <section className="error-panel" role="status"><h2>Recuperando sua aquisição…</h2><p>Consultando a tentativa anterior com a mesma chave de proteção.</p></section>;
  if (completedOrder?.status === 'PENDING') return <section className="error-panel" role="status"><h2>Pedido pendente.</h2><p>Aguardando confirmação da simulação. Você pode recarregar esta página: a mesma tentativa será recuperada.</p><p className="mono">{completedOrder.orderId}</p></section>;
  if (completedOrder) {
    return (
      <section style={{ paddingBlock: 36 }}>
        <div className="quote-summary-card cut" style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow">// RECIBO DE LIQUIDAÇÃO IMUTÁVEL (SNAPSHOT CONGELADO)</span>
            <span className="version-tag">
              STATUS: {completedOrder.status} · v:{completedOrder.version}
            </span>
          </div>
          <h2 style={{ fontSize: 52, marginBlock: 10 }}>
            {completedOrder.status === 'CONFIRMED'
              ? '✓ AQUISIÇÃO CONFIRMADA NO ARQUIVO'
              : '✕ PAGAMENTO RECUSADO (ITENS PRESERVADOS)'}
          </h2>
          <p className="muted" style={{ marginBottom: 18 }}>
            {completedOrder.status === 'CONFIRMED'
              ? 'A simulação de rede confirmou a aquisição e removeu do carrinho apenas os itens comprados.'
              : completedOrder.failureReason}
          </p>

          <div className="provenance-box" style={{ marginBottom: 20 }}>
            <div>
              <span>ORDER ID:</span>
              <strong>{completedOrder.orderId}</strong>
            </div>
            <div>
              <span>IDEMPOTENCY-KEY:</span>
              <strong>{completedOrder.idempotencyKey}</strong>
            </div>
            <div>
              <span>TRILHO DE PAGAMENTO:</span>
              <strong>{completedOrder.paymentRail.toUpperCase()}</strong>
            </div>
            <div>
              <span>STRIPE PAYMENT INTENT (SIMULADO):</span>
              <span>{completedOrder.stripePaymentIntentId || 'N/A (Liquidação Web3 Direta)'}</span>
            </div>
            <div>
              <span>HASH ON-CHAIN (TX):</span>
              <span>{completedOrder.txHash || 'Não emitido'}</span>
            </div>
            <div>
              <span>TOTAL CONGELADO NO RECIBO:</span>
              <strong className="eth">
                {completedOrder.totalEth} ETH ({completedOrder.totalBrlFormatted})
              </strong>
            </div>
            <div>
              <span>RECOMPENSA CREDITADA:</span>
              <strong>{completedOrder.status === 'CONFIRMED' ? `+${completedOrder.krnRewardEarned}` : 'Nenhuma recompensa creditada'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {lockedQuoteSnapshot && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  orderMutation.mutate({
                    quoteToSubmit: lockedQuoteSnapshot,
                    paymentRail: selectedRail,
                    outcome: 'CONFIRMED'
                  })
                }
                disabled={orderMutation.isPending}
              >
                🔁 Testar Reenvio com Mesma Idempotency-Key (Anti-Duplicação)
              </button>
            )}
            <button className="btn" onClick={startNewAttempt}>Iniciar nova aquisição</button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setCompletedOrder(null);
                setIdempotencyKey(`idem_krn_${Date.now().toString(36)}`);
                onNavigateAccount();
              }}
            >
              Ver Histórico de Recibos na Conta ↗
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!quote || quote.items.length === 0) {
    return (
      <section style={{ paddingBlock: 48 }}>
        <div style={{ padding: 48, border: '1px solid var(--ink)', background: 'var(--paper)', textAlign: 'center' }}>
          <h3 style={{ fontSize: 36 }}>Nenhum item pendente para checkout.</h3>
          <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={onNavigateExplore}>
            Voltar ao Catálogo
          </button>
        </div>
      </section>
    );
  }

  const isStale = quote.isStale || quote.expiresAt <= Date.now();
  const validCollector = collectorName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collectorEmail);
  const blockedWallet = selectedRail.startsWith('web3') && (!wallet || wallet.status !== 'CONNECTED');

  return (
    <section>
      <div
        style={{
          paddingTop: 32,
          borderBottom: '1px solid var(--ink)',
          paddingBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <span className="eyebrow">
            04 // LIQUIDAÇÃO DUAL-RAIL • STRIPE PAYMENTINTENTS (CARTÃO / PIX) &amp; WEB3 (ETH / $KRN)
          </span>
          <h2 style={{ fontSize: 'clamp(42px, 5.5vw, 76px)', lineHeight: 0.92, marginTop: 8 }}>
            Revisão &amp; Liquidação Idempotente.
          </h2>
        </div>
        <button type="button" className="btn" onClick={() => void simulateLivePriceChangeInCheckout()}>
          ⚡ Simular Mudança de Preço Durante o Checkout
        </button>
      </div>

      <div className="commerce-grid">
        <div className="form-panel cut">
          <span className="eyebrow">// 1. ESCOLHA O TRILHO DE LIQUIDAÇÃO (GATEWAY STRIPE OU WEB3 NATIVO)</span>
          <h3 style={{ fontSize: 32, marginBlock: '8px 14px' }}>Método de Pagamento</h3>

          {isStale && (
            <div className="stale-lock-banner" role="alert">
              <strong>⚠ BLOQUEIO DE SEGURANÇA (STALE_QUOTE — {quote.staleReason}):</strong>
              <br />O preço ou estoque de uma obra mudou via evento Socket.IO. O envio do pedido está travado
              até que você atualize e aprove a nova cotação.
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn ink" onClick={() => revalidateMutation.mutate()}>
                  Atualizar e Aceitar Nova Cotação ({quote.totalEth} ETH)
                </button>
              </div>
            </div>
          )}

          <div className="field-row-2"><div className="field-group"><label htmlFor="checkout-name">Nome do colecionador</label><input className="field-input" id="checkout-name" autoComplete="name" value={collectorName} onChange={e => { setCollectorName(e.target.value); setReviewed(false); }} /></div><div className="field-group"><label htmlFor="checkout-email">E-mail do colecionador</label><input className="field-input" type="email" id="checkout-email" autoComplete="email" value={collectorEmail} onChange={e => { setCollectorEmail(e.target.value); setReviewed(false); }} /></div></div>
          <div className="field-group"><label htmlFor="checkout-wallet">Carteira de recebimento</label><select id="checkout-wallet" className="field-input" value={walletId} onChange={e => { setWalletId(e.target.value); setReviewed(false); }}><option value="">Selecione uma carteira</option>{user?.wallets.map(w => <option key={w.id} value={w.id}>{w.label} · {w.network} · {w.status}</option>)}</select></div>
          {!user?.wallets.length && <button className="btn" onClick={onNavigateAccount}>Cadastrar carteira na conta</button>}
          {blockedWallet && <p className="field-error" role="alert">Conecte a carteira selecionada na sua conta para pagar via Web3.</p>}
          <div className="rail-selector" role="group" aria-label="Trilho de pagamento">
            <button
              type="button"
              className="rail-option"
              aria-pressed={selectedRail === 'stripe-pix'}
              onClick={() => { setReviewed(false); setSelectedRail('stripe-pix'); }}
            >
              <span className="eyebrow">STRIPE GATEWAY · INSTANTÂNEO</span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 4 }}>PIX QR Code (BRL)</strong>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {quote.totalBrlFormatted}
              </span>
            </button>

            <button
              type="button"
              className="rail-option"
              aria-pressed={selectedRail === 'stripe-card'}
              onClick={() => { setReviewed(false); setSelectedRail('stripe-card'); }}
            >
              <span className="eyebrow">STRIPE GATEWAY · 3DS</span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 4 }}>Cartão de Crédito</strong>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {quote.totalBrlFormatted} em 1x
              </span>
            </button>

            <button
              type="button"
              className="rail-option"
              aria-pressed={selectedRail === 'web3-eth'}
              onClick={() => { setReviewed(false); setSelectedRail('web3-eth'); }}
            >
              <span className="eyebrow">WEB3 NATIVO · MAINNET</span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 4 }}>Carteira ETH (1 Wei)</strong>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {formatShortEth(quote.totalEth)}
              </span>
            </button>

            <button
              type="button"
              className="rail-option"
              aria-pressed={selectedRail === 'web3-krn'}
              onClick={() => { setReviewed(false); setSelectedRail('web3-krn'); }}
            >
              <span className="eyebrow">PROTOCOL TOKEN · 50% OFF TAXA</span>
              <strong style={{ display: 'block', fontSize: 15, marginTop: 4 }}>Saldo Token $KRN</strong>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {quote.totalKrnFormatted}
              </span>
            </button>
          </div>

          <div className="mono muted" style={{ fontSize: 11, marginBottom: 14 }}>
            HEADER DE PROTEÇÃO ATIVO: <strong>Idempotency-Key: {idempotencyKey}</strong>
          </div>

          {orderMutation.isPending && <p role="status">Pedido pendente. Aguardando resposta da simulação…</p>}
          {orderMutation.isError && <div className="stale-lock-banner" role="alert"><p>{errorMessage(orderMutation.error)}</p>{lockedQuoteSnapshot && <button className="btn ink" disabled={orderMutation.isPending} onClick={() => orderMutation.mutate({ quoteToSubmit: lockedQuoteSnapshot, paymentRail: readAttempt()?.rail || selectedRail, outcome: readAttempt()?.outcome || 'CONFIRMED' })}>Recuperar pedido com a mesma chave</button>}</div>}
          {readAttempt() && !completedOrder && !orderMutation.isPending && !orderMutation.isError && <div className="stale-lock-banner"><p>Há uma tentativa anterior preservada.</p><button className="btn" onClick={() => { const attempt = readAttempt()!; orderMutation.mutate({ quoteToSubmit: attempt.quote, paymentRail: attempt.rail, outcome: attempt.outcome }); }}>Retomar tentativa anterior</button></div>}
          <label className="review-consent"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> Revisei os itens, as taxas e o total desta cotação.</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              style={{ flex: 1.4 }}
              disabled={isStale || !user || orderMutation.isPending || !reviewed || !validCollector || !wallet || blockedWallet || !!readAttempt()}
              onClick={() => {
                setLockedQuoteSnapshot(quote);
                orderMutation.mutate({
                  quoteToSubmit: quote,
                  paymentRail: selectedRail,
                  outcome: 'CONFIRMED'
                });
              }}
            >
              <span>
                Confirmar &amp; Liquidar (
                {selectedRail.startsWith('stripe') ? quote.totalBrlFormatted : formatShortEth(quote.totalEth)})
              </span>
              <KronosIcon name="arrow-ne" />
            </button>

            <button
              type="button"
              className="btn"
              style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
              disabled={isStale || !user || orderMutation.isPending || !reviewed || !validCollector || !wallet || blockedWallet || !!readAttempt()}
              onClick={() => {
                setLockedQuoteSnapshot(quote);
                orderMutation.mutate({
                  quoteToSubmit: quote,
                  paymentRail: selectedRail,
                  outcome: 'REFUSED'
                });
              }}
            >
              Simular Pagamento Recusado
            </button>
          </div>
        </div>

        <div className="quote-summary-card cut">
          <span className="eyebrow">// 2. ESPELHO DO PEDIDO &amp; ITENS SELECIONADOS</span>
          <h3 style={{ fontSize: 30, marginBlock: '8px 16px' }}>Snapshot da Cotação</h3>
          {quote.items.map((i) => (
            <div className="summary-line" key={`${i.nftId}:${i.editionId}`}>
              <span>
                {i.quantity}× {i.title} ({i.editionLabel})
              </span>
              <strong className="eth">{formatShortEth(i.lineSubtotalEth)}</strong>
            </div>
          ))}
          <div className="summary-line">
            <span>Desconto ({quote.couponCode || '—'})</span>
            <span className="eth">-{quote.discountEth} ETH</span>
          </div>
          <div className="summary-line">
            <span>Taxa de Rede</span>
            <span className="eth">+{quote.networkFeeEth} ETH</span>
          </div>
          <div className="summary-line total">
            <span>TOTAL EM ETH</span>
            <span className="eth">{quote.totalEth} ETH</span>
          </div>
          <div className="summary-line total" style={{ color: 'var(--action)' }}>
            <span>TOTAL STRIPE (BRL)</span>
            <span className="mono">{quote.totalBrlFormatted}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
