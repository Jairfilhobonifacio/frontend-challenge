import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GenerativeRecipe, MintArtifactInput, NftArtifact, TokenStandard } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { deterministicHex, generateIpfsCid } from '@/lib/crypto-provenance';
import { renderGenerativeArtworkToCanvas } from '@/lib/generative-canvas';
import { KronosIcon } from '@/components/icons/KronosIcons';

interface MintStudioPageProps {
  catalogCount: number;
  onMintedSuccess: (created: NftArtifact) => void;
  onToast: (message: string) => void;
}

export const MintStudioPage: React.FC<MintStudioPageProps> = ({
  catalogCount,
  onMintedSuccess,
  onToast
}) => {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [title, setTitle] = useState('Isochronic Resonance #07');
  const [collectionName, setCollectionName] = useState('Temporal Instruments');
  const [category, setCategory] = useState<NftArtifact['category']>('generative');
  const [algorithm, setAlgorithm] = useState<GenerativeRecipe['algorithm']>('lissajous-ribbon');
  const [complexity, setComplexity] = useState<number>(38);
  const [seedHex, setSeedHex] = useState<string>('0x9f8c41e21b04');
  const [standard, setStandard] = useState<TokenStandard>('ERC-721');
  const [totalSupply, setTotalSupply] = useState<number>(1);
  const [priceEth, setPriceEth] = useState<string>('0.450000000000000000');
  const [royaltyBps, setRoyaltyBps] = useState<number>(500);
  const [description, setDescription] = useState(
    'Estrutura gerada por semente determinística e fixada em protocolo IPFS com assinatura EIP-712 verificável.'
  );

  useEffect(() => {
    if (canvasRef.current) {
      renderGenerativeArtworkToCanvas(canvasRef.current, {
        algorithm,
        seedHex,
        complexity,
        accentHue: 230
      });
    }
  }, [algorithm, seedHex, complexity, title]);

  const mintMutation = useMutation({
    mutationFn: async (input: MintArtifactInput) => {
      const res = await apiClient.post<{ nft: NftArtifact }>('/mint', input);
      return res.data.nft;
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['nfts'] });
      onToast(`NFT ${created.code} cunhado com IPFS CID e publicado no catálogo!`);
      onMintedSuccess(created);
    },
    onError: (err) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      onToast(e.response?.data?.message || e.message || 'Falha ao cunhar artefato.');
    }
  });

  const nextCode = `K—${String(catalogCount + 1).padStart(3, '0')}`;
  const previewSha = deterministicHex(`${nextCode}:${title}:${seedHex}`, 64);
  const previewCid = generateIpfsCid(previewSha);

  const handleMintSubmit = () => {
    const mediaDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/jpeg', 0.88) : '';
    mintMutation.mutate({
      title,
      collectionName,
      creatorHandle: '@maya.collector',
      category,
      description,
      standard,
      priceEth,
      totalSupply: standard === 'ERC-721' ? 1 : totalSupply,
      maxPerCollector: standard === 'ERC-721' ? 1 : 3,
      royaltyBps,
      mediaDataUrl,
      recipe: {
        algorithm,
        seedHex,
        complexity,
        accentHue: 230
      }
    });
  };

  return (
    <section>
      <div style={{ paddingTop: 32, borderBottom: '1px solid var(--ink)', paddingBottom: 20 }}>
        <span className="eyebrow">
          02 // ESTÚDIO DE CUNHAGEM ON-CHAIN (EIP-712 LAZY MINT + IPFS CIDv1 + SHA-256)
        </span>
        <h2 style={{ fontSize: 'clamp(42px, 5.5vw, 76px)', lineHeight: 0.92, marginTop: 8 }}>
          Cunhar Artefato Único no Arquivo.
        </h2>
      </div>

      <div className="studio-grid">
        <div>
          <div className="art-frame cut">
            <canvas
              ref={canvasRef}
              width={720}
              height={720}
              style={{ width: '100%', aspectRatio: '1 / 1' }}
            />
            <div className="card-reg-bar" style={{ borderBottom: 0 }}>
              <span>
                // NOVO TOMBO {nextCode} · {title.toUpperCase()}
              </span>
              <span className="version-tag">SEED DETERMINÍSTICA</span>
            </div>
          </div>

          <div className="provenance-box">
            <div className="eyebrow" style={{ borderBottom: '1px solid var(--ink)', paddingBottom: 8, marginBottom: 6 }}>
              // MANIFESTO CRIPTOGRÁFICO GERADO EM TEMPO REAL
            </div>
            <div>
              <span>ALGORITMO / SEED:</span>
              <strong>
                {seedHex} ({algorithm})
              </strong>
            </div>
            <div>
              <span>SHA-256 DA MÍDIA:</span>
              <span>{previewSha.slice(0, 36)}…</span>
            </div>
            <div>
              <span>IPFS CIDv1:</span>
              <span>{previewCid.slice(0, 38)}…</span>
            </div>
            <div>
              <span>VOUCHER EIP-712:</span>
              <span style={{ color: 'var(--action)' }}>PRONTO PARA ASSINATURA DO CRIADOR</span>
            </div>
          </div>
        </div>

        <div className="form-panel cut">
          <span className="eyebrow">// PARÂMETROS DO CONTRATO INTELIGENTE &amp; SEMENTE</span>
          <h3 style={{ fontSize: 34, marginBlock: '8px 20px' }}>Ficha de Emissão do NFT</h3>

          <div className="field-group">
            <label htmlFor="m-title">Título da Obra</label>
            <input
              id="m-title"
              type="text"
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label htmlFor="m-collection">Série / Coleção</label>
              <input
                id="m-collection"
                type="text"
                className="field-input"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="m-category">Categoria Curatorial</label>
              <select
                id="m-category"
                className="field-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as NftArtifact['category'])}
              >
                <option value="generative">Arte Generativa</option>
                <option value="monolith">Monólito Arquitetônico</option>
                <option value="zero-knowledge">Sistema Zero-Knowledge</option>
              </select>
            </div>
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label htmlFor="m-algo">Motor Algorítmico (Canvas)</label>
              <select
                id="m-algo"
                className="field-input"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as GenerativeRecipe['algorithm'])}
              >
                <option value="lissajous-ribbon">Fita Harmônica Lissajous</option>
                <option value="brutalist-slabs">Planos Monolíticos em Sombra</option>
                <option value="zk-interference">Interferência Óptica ZK</option>
                <option value="orbital-copper">Órbitas Elípticas de Precisão</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="m-complexity">Densidade / Frequência ({complexity})</label>
              <input
                id="m-complexity"
                type="range"
                min={12}
                max={72}
                value={complexity}
                className="field-input"
                onChange={(e) => setComplexity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label htmlFor="m-standard">Padrão On-Chain</label>
              <select
                id="m-standard"
                className="field-input"
                value={standard}
                onChange={(e) => {
                  const next = e.target.value as TokenStandard;
                  setStandard(next);
                  setTotalSupply(next === 'ERC-721' ? 1 : 12);
                }}
              >
                <option value="ERC-721">ERC-721 (Obra Única 1/1)</option>
                <option value="ERC-1155">ERC-1155 (Edição Múltipla)</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="m-supply">Tiragem Total (Supply)</label>
              <input
                id="m-supply"
                type="number"
                className="field-input"
                value={standard === 'ERC-721' ? 1 : totalSupply}
                min={1}
                max={100}
                disabled={standard === 'ERC-721'}
                onChange={(e) => setTotalSupply(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label htmlFor="m-price">Preço de Emissão (ETH String)</label>
              <input
                id="m-price"
                type="text"
                className="field-input mono"
                value={priceEth}
                onChange={(e) => setPriceEth(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="m-royalty">Royalty Perpétuo EIP-2981 (%)</label>
              <select
                id="m-royalty"
                className="field-input"
                value={royaltyBps}
                onChange={(e) => setRoyaltyBps(Number(e.target.value))}
              >
                <option value={500}>5.00% (500 bps — Padrão)</option>
                <option value={750}>7.50% (750 bps — Curadoria)</option>
                <option value={1000}>10.00% (1000 bps — Institucional)</option>
              </select>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="m-desc">Nota Curatorial da Obra</label>
            <textarea
              id="m-desc"
              rows={3}
              className="field-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
            <button
              type="button"
              className="btn"
              onClick={() =>
                setSeedHex(`0x${Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')}`)
              }
            >
              Gerar Nova Semente (0x…)
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ flex: 1 }}
              disabled={mintMutation.isPending}
              onClick={handleMintSubmit}
            >
              <span>Assinar Voucher EIP-712 &amp; Publicar NFT no Arquivo</span>
              <KronosIcon name="arrow-ne" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
