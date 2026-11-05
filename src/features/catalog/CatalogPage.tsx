import React from 'react';
import { useFavorite } from './useFavorite';
import type { NftArtifact, TokenStandard } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { formatBrlCents, formatShortEth, parseEthToWei, weiToBrlCents } from '@/lib/eth-math';
import { GenerativeMedia } from '@/components/ui/GenerativeMedia';
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer';
import { KronosIcon } from '@/components/icons/KronosIcons';

export interface CatalogFilterState {
  q: string;
  category: '' | NftArtifact['category'];
  standard: '' | TokenStandard;
  sort: 'recent' | 'price_asc' | 'price_desc' | 'popular';
  onlyAvailable: boolean;
  page: number;
}

interface CatalogPageProps {
  items: NftArtifact[];
  isLoading: boolean;
  featured?: NftArtifact;
  total: number;
  totalPages: number;
  filters: CatalogFilterState;
  onUpdateFilters: (next: Partial<CatalogFilterState>) => void;
  onResetFilters: () => void;
  onSelectNft: (nftId: string) => void;
  onOpenMintStudio: () => void;
  onToast: (message: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  items,
  featured,
  total,
  totalPages,
  isLoading,
  filters,
  onUpdateFilters,
  onResetFilters,
  onSelectNft,
  onOpenMintStudio,
  onToast
}) => {
  const favMutation = useFavorite(onToast);

  const filtered = items;
  const heroNft = featured || items[0];

  return (
    <section>
      <div className="hero-banner">
        <div className="hero-copy">
          <span className="eyebrow">
            // EXPOSIÇÃO GENESIS • ARTE GENERATIVA ON-CHAIN + LIQUIDAÇÃO STRIPE &amp; WEB3
          </span>
          <h1>
            O TEMPO PASSA.
            <br />A ARTE FICA.
          </h1>
          <p className="muted" style={{ maxWidth: '52ch', fontSize: 15 }}>
            Adquira edições algorítmicas verificadas com precisão de 1 Wei em ETH, Token de Curadoria{' '}
            <strong>$KRN</strong> ou liquidação fiduciária instantânea via{' '}
            <strong>Stripe (Cartão 3DS e PIX)</strong>.
          </p>
          <div className="hero-metrics">
            <div>
              <span className="eyebrow">PADRÕES SUPORTADOS</span>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                ERC-721 + ERC-1155
              </div>
            </div>
            <div>
              <span className="eyebrow">LIQUIDAÇÃO DUAL-RAIL</span>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                ETH / $KRN / STRIPE BRL
              </div>
            </div>
            <div>
              <span className="eyebrow">PROVENIÊNCIA</span>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                IPFS CID + EIP-712
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {heroNft && (
              <button type="button" className="btn primary" onClick={() => onSelectNft(heroNft.id)}>
                <span>Inspecionar Lote {heroNft.code}</span>
                <KronosIcon name="arrow-ne" />
              </button>
            )}
            <button type="button" className="btn" onClick={onOpenMintStudio}>
              <span>Cunhar Nova Obra no Estúdio</span>
            </button>
          </div>
        </div>

        {heroNft ? (
          <figure className="art-frame cut">
            <GenerativeMedia nft={heroNft} size={640} />
            <div className="card-reg-bar" style={{ borderBottom: 0, paddingBottom: 2 }}>
              <span>
                <strong>// {heroNft.code}</strong> · {heroNft.title.toUpperCase()} · {heroNft.creatorHandle}
              </span>
              <span className="version-tag">v:{heroNft.version}</span>
            </div>
          </figure>
        ) : (
          <SkeletonShimmer aspectRatio="1 / 1" />
        )}
      </div>

      {/* Filter Bar synced with URL Search Params */}
      <div className="filter-bar">
        <label className="search-input-wrap">
          <KronosIcon name="search" />
          <input
            type="search"
            aria-label="Buscar obras"
            placeholder="Buscar por título, código K—NNN, coleção ou artista…"
            value={filters.q}
            onChange={(e) => onUpdateFilters({ q: e.target.value, page: 1 })}
          />
        </label>

        <select
          className="select-ctrl"
          aria-label="Filtrar por categoria"
          value={filters.category}
          onChange={(e) => onUpdateFilters({ category: e.target.value as CatalogFilterState['category'], page: 1 })}
        >
          <option value="">Todas as categorias</option>
          <option value="generative">Arte Generativa</option>
          <option value="monolith">Monólitos Arquitetônicos</option>
          <option value="zero-knowledge">Sistemas Zero-Knowledge</option>
        </select>

        <select
          className="select-ctrl"
          aria-label="Filtrar por padrão"
          value={filters.standard}
          onChange={(e) => onUpdateFilters({ standard: e.target.value as '' | TokenStandard, page: 1 })}
        >
          <option value="">Todos os padrões (ERC-721 / 1155)</option>
          <option value="ERC-721">Somente ERC-721 (1/1)</option>
          <option value="ERC-1155">Somente ERC-1155 (Edições)</option>
        </select>

        <select
          className="select-ctrl"
          aria-label="Ordenar obras"
          value={filters.sort}
          onChange={(e) =>
            onUpdateFilters({
              sort: e.target.value as CatalogFilterState['sort'],
              page: 1
            })
          }
        >
          <option value="recent">Ordem de Tombo (K—NNN)</option>
          <option value="price_asc">Menor Preço (ETH)</option>
          <option value="price_desc">Maior Preço (ETH)</option>
          <option value="popular">Mais Favoritadas</option>
        </select>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, paddingInline: 8 }}>
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => onUpdateFilters({ onlyAvailable: e.target.checked, page: 1 })}
          />
          Somente disponíveis
        </label>
      </div>

      {isLoading ? (
        <div className="catalog-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonShimmer key={idx} aspectRatio="1 / 1" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            marginBlock: 32,
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            textAlign: 'center'
          }}
        >
          <h3 style={{ fontSize: 36 }}>Nenhuma obra encontrada neste recorte.</h3>
          <p className="muted" style={{ marginBlock: '10px 18px' }}>
            Limpe os filtros combinados para restaurar o catálogo completo.
          </p>
          <button type="button" className="btn primary" onClick={onResetFilters}>
            Restaurar Catálogo Completo
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((nft) => {
            const isFav = Boolean((nft as NftArtifact & { isFavorited?: boolean }).isFavorited);
            const stock = nft.editions.reduce((acc, e) => acc + e.availableSupply, 0);
            const stds = nft.editions.map((e) => e.standard).join(' + ');
            const floorWei = parseEthToWei(nft.floorPriceEth);
            const brlStr = formatBrlCents(weiToBrlCents(floorWei));

            return (
              <article className="nft-card" key={nft.id}>
                <button
                  type="button"
                  className="fav-btn"
                  aria-pressed={isFav}
                  aria-label={`Favoritar ${nft.title}`}
                  disabled={favMutation.isPending}
                  onClick={() => favMutation.mutate(nft.id)}
                >
                  ♥
                </button>
                <a
                  href={`/nfts/${nft.id}`}
                  className="art-frame cut"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onSelectNft(nft.id);
                  }}
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  <GenerativeMedia nft={nft} size={480} />
                </a>
                <div className="card-reg-bar">
                  <span>
                    <strong>// {nft.code}</strong> · {stds}
                  </span>
                  <span className="version-tag">v:{nft.version}</span>
                </div>
                <h3>
                  <a
                    href={`/nfts/${nft.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectNft(nft.id);
                    }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {nft.title}
                  </a>
                </h3>
                <p className="muted" style={{ fontSize: 12 }}>
                  {nft.collectionName} · {nft.creatorHandle} · Royalty {(nft.royaltyBps / 100).toFixed(1)}%
                </p>
                <div className="card-price-footer">
                  <div>
                    <span className="eyebrow" style={{ display: 'block' }}>
                      A PARTIR DE
                    </span>
                    <strong className="eth" style={{ fontSize: 16 }}>
                      {formatShortEth(nft.floorPriceEth)}
                    </strong>
                    <span className="mono muted" style={{ display: 'block', fontSize: 10.5 }}>
                      ≈ {brlStr} (Stripe)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>
                      {stock > 0 ? `${stock} disp.` : 'ESGOTADO'}
                    </span>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ minHeight: 38, padding: '6px 12px' }}
                      onClick={() => onSelectNft(nft.id)}
                    >
                      Inspecionar ↗
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!isLoading && <nav className="pagination" aria-label="Paginação do catálogo"><span className="mono">{total} obras · Página {filters.page} de {totalPages}</span><div className="button-row"><button className="btn" disabled={filters.page <= 1} onClick={() => onUpdateFilters({ page: filters.page - 1 })}>Página anterior</button><button className="btn" disabled={filters.page >= totalPages} onClick={() => onUpdateFilters({ page: filters.page + 1 })}>Próxima página</button></div></nav>}
    </section>
  );
};
