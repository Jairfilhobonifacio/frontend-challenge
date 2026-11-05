import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NftArtifact } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import {
  formatBrlCents,
  formatShortEth,
  formatWeiToEth,
  parseEthToWei,
  weiToBrlCents,
  weiToKrnFormatted
} from '@/lib/eth-math';
import { GenerativeMedia } from '@/components/ui/GenerativeMedia';
import { useFavorite } from './useFavorite';
import { KronosIcon } from '@/components/icons/KronosIcons';

interface NftDetailPageProps {
  nft: NftArtifact | undefined;
  onBack: () => void;
  onProceedCheckout: () => void;
  onToast: (message: string) => void;
}

export const NftDetailPage: React.FC<NftDetailPageProps> = ({
  nft,
  onBack,
  onProceedCheckout,
  onToast
}) => {
  const queryClient = useQueryClient();
  const favorite = useFavorite(onToast);
  const defaultEd = nft?.editions.find((e) => e.availableSupply > 0) || nft?.editions[0];
  const [selectedEditionId, setSelectedEditionId] = useState<string>(defaultEd?.editionId || 'study');
  const [quantity, setQuantity] = useState<number>(1);

  const addCartMutation = useMutation({
    mutationFn: async (vars: { nftId: string; editionId: string; quantity: number }) => {
      const res = await apiClient.put('/cart/items', { ...vars, mode: 'add' });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  if (!nft) {
    return (
      <section style={{ paddingBlock: 48 }}>
        <div style={{ padding: 48, border: '1px solid var(--error)', background: 'var(--paper)' }}>
          <span className="eyebrow" style={{ color: 'var(--error)' }}>
            // ERRO 404 • ARTEFATO INEXISTENTE NO ARQUIVO
          </span>
          <h1 style={{ fontSize: 48, marginBlock: 12 }}>Obra não encontrada.</h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            O identificador solicitado não consta no registro KRONOS // ARCHIVE.
          </p>
          <button type="button" className="btn primary" onClick={onBack}>
            ← Voltar ao Arquivo Completo
          </button>
        </div>
      </section>
    );
  }

  const ed = nft.editions.find((e) => e.editionId === selectedEditionId) || nft.editions[0]!;
  const maxQty = Math.max(1, Math.min(ed.availableSupply || 1, ed.maxPerCollector));
  const safeQty = Math.min(quantity, maxQty);
  const unitWei = parseEthToWei(ed.priceEth);
  const lineWei = unitWei * BigInt(safeQty);
  const lineBrl = formatBrlCents(weiToBrlCents(lineWei));
  const lineKrn = weiToKrnFormatted(lineWei);

  const handleAcquire = async (goCheckout: boolean) => {
    try {
      await addCartMutation.mutateAsync({
        nftId: nft.id,
        editionId: ed.editionId,
        quantity: safeQty
      });
      onToast(`${safeQty}× ${nft.title} (${ed.label}) adicionado ao Cofre.`);
      if (goCheckout) onProceedCheckout();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onToast(e.response?.data?.message || e.message || 'Erro ao adicionar ao cofre.');
    }
  };

  return (
    <section>
      <div style={{ paddingTop: 24 }}>
        <button type="button" className="btn" onClick={onBack}>
          ← Voltar ao Arquivo Completo
        </button>
      </div>

      <button className="btn detail-favorite" aria-pressed={!!(nft as NftArtifact & { isFavorited?: boolean }).isFavorited} disabled={favorite.isPending} onClick={() => favorite.mutate(nft.id)}>Favoritar {nft.title}</button>
      <div className="detail-layout">
        <div>
          <figure className="art-frame cut">
            <GenerativeMedia nft={nft} size={760} />
            <div className="card-reg-bar" style={{ borderBottom: 0 }}>
              <span>
                <strong>// {nft.code}</strong> · {nft.title.toUpperCase()}
              </span>
              <span className="version-tag">v:{nft.version}</span>
            </div>
          </figure>

          <div className="provenance-box">
            <div className="eyebrow" style={{ borderBottom: '1px solid var(--ink)', paddingBottom: 8, marginBottom: 6 }}>
              // REGISTRO ON-CHAIN &amp; PROVENIÊNCIA CRIPTOGRÁFICA
            </div>
            <div>
              <span>CRIADOR / CARTEIRA:</span>
              <span>
                {nft.creatorHandle} ({nft.creatorAddress.slice(0, 10)}…)
              </span>
            </div>
            <div>
              <span>ROYALTY ON-CHAIN (EIP-2981):</span>
              <span>{(nft.royaltyBps / 100).toFixed(2)}% perpétuo</span>
            </div>
            <div>
              <span>IPFS METADATA CID:</span>
              <span>{nft.ipfsCid}</span>
            </div>
            <div>
              <span>HASH SHA-256 DA OBRA:</span>
              <span>{nft.sha256Hash.slice(0, 32)}…</span>
            </div>
            <div>
              <span>ASSINATURA EIP-712:</span>
              <span>{nft.eip712Signature.slice(0, 30)}…</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow">
              {nft.collectionName} · {nft.category.toUpperCase()}
            </span>
            <span className="stamp">{ed.standard}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(44px, 5vw, 76px)', lineHeight: 0.92, marginBlock: '10px 14px' }}>
            {nft.title}
          </h1>
          <p className="muted" style={{ marginBottom: 24, fontSize: 14.5 }}>
            {nft.description}
          </p>

          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            // 1. SELECIONE A EDIÇÃO
          </span>
          <div>
            {nft.editions.map((item) => (
              <button
                key={item.editionId}
                type="button"
                className="edition-card"
                aria-pressed={item.editionId === ed.editionId}
                onClick={() => {
                  setSelectedEditionId(item.editionId);
                  setQuantity(1);
                }}
              >
                <div>
                  <strong>
                    {item.label} · <span className="mono">{item.standard}</span>
                  </strong>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {item.availableSupply > 0
                      ? `${item.availableSupply} de ${item.totalSupply} disponíveis (máx. ${item.maxPerCollector} por colecionador)`
                      : `Edição Esgotada (0/${item.totalSupply})`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="eth">{formatShortEth(item.priceEth)}</strong>
                  <div className="mono muted" style={{ fontSize: 10 }}>
                    {formatBrlCents(weiToBrlCents(parseEthToWei(item.priceEth)))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBlock: 18,
              paddingBlock: 14,
              borderBlock: '1px solid var(--hair)'
            }}
          >
            <div>
              <span className="eyebrow">2. QUANTIDADE INTEIRA</span>
              <div className="muted" style={{ fontSize: 11.5 }}>
                Máximo permitido: {maxQty} unidade(s)
              </div>
            </div>
            <div className="stepper">
              <button
                type="button"
                disabled={safeQty <= 1 || ed.availableSupply === 0}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <output>{safeQty}</output>
              <button
                type="button"
                disabled={safeQty >= maxQty || ed.availableSupply === 0}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--plate)', border: '1px solid var(--ink)', padding: 16, marginBottom: 18 }}>
            <span className="eyebrow">
              // COTAÇÃO UNITÁRIA EXATA (18 CASAS WEI + EQUIVALÊNCIA STRIPE &amp; $KRN)
            </span>
            <div className="eth" style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
              {formatWeiToEth(lineWei)} ETH
            </div>
            <div className="mono muted" style={{ fontSize: 11.5, marginTop: 4 }}>
              Equivalente Stripe: <strong>{lineBrl}</strong> · Ou em Token: <strong>{lineKrn}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              disabled={ed.availableSupply === 0 || addCartMutation.isPending}
              onClick={() => void handleAcquire(false)}
            >
              + Adicionar ao Cofre
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ flex: 1.3 }}
              disabled={ed.availableSupply === 0 || addCartMutation.isPending}
              onClick={() => void handleAcquire(true)}
            >
              <span>Adquirir Agora (Stripe / Web3)</span>
              <KronosIcon name="arrow-ne" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
