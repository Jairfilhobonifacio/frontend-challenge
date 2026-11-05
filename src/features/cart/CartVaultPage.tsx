import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MultiCurrencyQuote } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { formatShortEth, formatWeiToEth, parseEthToWei } from '@/lib/eth-math';
import { KronosIcon } from '@/components/icons/KronosIcons';

interface CartVaultPageProps {
  quote: MultiCurrencyQuote | undefined;
  onExplore: () => void;
  onProceedCheckout: () => void;
  onToast: (message: string) => void;
}

export const CartVaultPage: React.FC<CartVaultPageProps> = ({
  quote,
  onExplore,
  onProceedCheckout,
  onToast
}) => {
  const queryClient = useQueryClient();
  const [couponInput, setCouponInput] = useState(quote?.couponCode || 'KRONOS10');

  const updateQtyMutation = useMutation({
    mutationFn: async (vars: { nftId: string; editionId: string; quantity: number }) => {
      const res = await apiClient.put('/cart/items', { ...vars, mode: 'set' });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onToast(e.response?.data?.message || e.message || 'Erro ao atualizar quantidade.');
    }
  });

  const couponMutation = useMutation({
    mutationFn: async (code: string | null) => {
      const res = await apiClient.post('/cart/coupon', { code });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      onToast('Cupom processado pela cotação da API.');
    },
    onError: (err) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onToast(e.response?.data?.message || e.message || 'Cupom inválido ou expirado.');
    }
  });

  const revalidateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/quotes/revalidate');
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      onToast('Cotação revalidada e desbloqueada.');
    }
  });

  const simulateSocketPriceChange = async () => {
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
    onToast(`Evento Socket.IO nft.updated emitido para ${first.code} (v:${first.nftVersion + 1}).`);
  };

  if (!quote || quote.items.length === 0) {
    return (
      <section style={{ paddingBlock: 48 }}>
        <div style={{ padding: 48, border: '1px solid var(--ink)', background: 'var(--paper)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 42 }}>Seu Cofre de Aquisição está vazio.</h2>
          <p className="muted" style={{ marginBlock: '10px 20px' }}>
            Explore o catálogo ou cunhe uma obra inédita no Mint Studio.
          </p>
          <button type="button" className="btn primary" onClick={onExplore}>
            Explorar Catálogo
          </button>
        </div>
        {quote?.couponCode && <button className="btn" disabled={couponMutation.isPending} onClick={() => couponMutation.mutate(null)}>Remover cupom</button>}
    </section>
    );
  }

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
          <span className="eyebrow">03 // COFRE DE AQUISIÇÃO • PRECISÃO DE 1 WEI + COTAÇÃO EM TEMPO REAL</span>
          <h2 style={{ fontSize: 'clamp(42px, 5.5vw, 76px)', lineHeight: 0.92, marginTop: 8 }}>
            Seu Cofre de Seleção.
          </h2>
        </div>
        <button type="button" className="btn" onClick={() => void simulateSocketPriceChange()}>
          ⚡ Simular WS nft.updated (+0.02 ETH no Cofre)
        </button>
      </div>

      <div className="commerce-grid">
        <div>
          {quote.isStale && (
            <div className="stale-lock-banner" role="alert">
              <strong>⚠ ATUALIZAÇÃO EM TEMPO REAL RECEBIDA ({quote.staleReason}):</strong>
              <br />O preço ou disponibilidade de um item mudou via Socket.IO enquanto o cofre estava aberto.
              Revalide os valores abaixo.
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn ink" onClick={() => revalidateMutation.mutate()}>
                  Revalidar e Aceitar Nova Cotação
                </button>
              </div>
            </div>
          )}

          {quote.items.map((item) => (
            <div className="cart-row" key={`${item.nftId}:${item.editionId}`}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  display: 'grid',
                  placeItems: 'center',
                  font: '700 14px var(--mono)'
                }}
              >
                {item.code}
              </div>
              <div>
                <span className="eyebrow">
                  // {item.code} · {item.editionLabel} ({item.standard}) · v:{item.nftVersion}
                </span>
                <h3 style={{ fontSize: 28, marginBlock: 4 }}>{item.title}</h3>
                <div className="eth muted" style={{ fontSize: 12 }}>
                  Unitário: {item.unitPriceEth} ETH
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.title}`}
                      disabled={updateQtyMutation.isPending}
                      onClick={() =>
                        updateQtyMutation.mutate({
                          nftId: item.nftId,
                          editionId: item.editionId,
                          quantity: item.quantity - 1
                        })
                      }
                    >
                      −
                    </button>
                    <output>{item.quantity}</output>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.title}`}
                      disabled={updateQtyMutation.isPending || item.quantity >= Math.min(item.availableSupply, item.maxPerCollector)}
                      onClick={() =>
                        updateQtyMutation.mutate({
                          nftId: item.nftId,
                          editionId: item.editionId,
                          quantity: item.quantity + 1
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ minHeight: 36, padding: '6px 10px', fontSize: 11 }}
                    onClick={() =>
                      updateQtyMutation.mutate({
                        nftId: item.nftId,
                        editionId: item.editionId,
                        quantity: 0
                      })
                    }
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="eyebrow">SUBTOTAL LINHA</span>
                <div className="eth" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {formatShortEth(item.lineSubtotalEth)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="quote-summary-card cut">
          <span className="eyebrow">// RESUMO FINANCEIRO &amp; CUPOM DE CURADORIA</span>
          <h3 style={{ fontSize: 34, marginBlock: '8px 16px' }}>Cotação Oficial da API</h3>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              type="text"
              className="field-input mono"
              aria-label="Cupom de desconto"
              placeholder="Ex: KRONOS10, ARCHIVE20 ou EXPIRED50"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <button type="button" className="btn ink" disabled={couponMutation.isPending} onClick={() => couponMutation.mutate(couponInput)}>
              Aplicar
            </button>
          </div>

          <div className="summary-line">
            <span>Subtotal Bruto (Wei)</span>
            <span className="eth">{quote.subtotalEth} ETH</span>
          </div>
          <div className="summary-line">
            <span>Desconto Cupom ({quote.couponCode || 'Nenhum'})</span>
            <span className="eth">-{quote.discountEth} ETH</span>
          </div>
          <div className="summary-line">
            <span>Royalties Criadores (EIP-2981 incl.)</span>
            <span className="eth">{quote.creatorRoyaltyEth} ETH</span>
          </div>
          <div className="summary-line">
            <span>Taxa Estimada de Rede</span>
            <span className="eth">+{quote.networkFeeEth} ETH</span>
          </div>
          <div className="summary-line total">
            <span>TOTAL EM ETH (18 CASAS)</span>
            <span className="eth">{quote.totalEth} ETH</span>
          </div>

          <div style={{ background: 'var(--plate)', padding: 14, marginBlock: 16, font: '11.5px/1.6 var(--mono)' }}>
            <div>
              <strong>EQUIVALÊNCIA STRIPE (BRL):</strong> {quote.totalBrlFormatted}
            </div>
            <div>
              <strong>OU EM TOKEN $KRN:</strong> {quote.totalKrnFormatted}
            </div>
            <div style={{ color: 'var(--action)' }}>
              <strong>RECOMPENSA DE CURADORIA:</strong> +{quote.krnRewardEarned}
            </div>
          </div>

          <button type="button" className="btn primary" style={{ width: '100%' }} onClick={onProceedCheckout}>
            <span>Avançar para Pagamento (Stripe / Web3)</span>
            <KronosIcon name="arrow-ne" />
          </button>
        </div>
      </div>
      {quote?.couponCode && <button className="btn" disabled={couponMutation.isPending} onClick={() => couponMutation.mutate(null)}>Remover cupom</button>}
    </section>
  );
};

