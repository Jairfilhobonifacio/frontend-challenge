import type { NftArtifact, TokenStandard } from '@/contracts/kronos.types';
import { parseEthToWei } from '@/lib/eth-math';

export const views = ['explore', 'detail', 'mint', 'cart', 'checkout', 'account', 'login', 'register', 'design'] as const;
export type RouteView = typeof views[number];
export const scenarios = ['normal', 'latency', 'http-500', 'fav-500', 'session-expired', 'timeout-order'] as const;
export type MockScenario = typeof scenarios[number];
export interface MarketplaceSearch {
  q: string;
  category: '' | NftArtifact['category'];
  standard: '' | TokenStandard;
  sort: 'recent' | 'price_asc' | 'price_desc' | 'popular';
  available: boolean;
  page: number;
  view?: RouteView;
  nft?: string;
  scenario: MockScenario;
  returnTo?: string;
}

export function safeReturnTo(value: unknown): string | undefined {
  return typeof value === 'string' && /^\/(?!\/)[^\\]*$/.test(value) && !/^\/(login|register)([/?]|$)/.test(value) ? value : undefined;
}

export function validateMarketplaceSearch(input: Record<string, unknown>): MarketplaceSearch {
  const page = Number(input.page);
  return {
    q: typeof input.q === 'string' ? input.q.slice(0, 200) : '',
    category: (['generative', 'monolith', 'zero-knowledge'].includes(String(input.category)) ? input.category : '') as MarketplaceSearch['category'],
    standard: (['ERC-721', 'ERC-1155'].includes(String(input.standard)) ? input.standard : '') as MarketplaceSearch['standard'],
    sort: (['price_asc', 'price_desc', 'popular'].includes(String(input.sort)) ? input.sort : 'recent') as MarketplaceSearch['sort'],
    available: input.available === true || input.available === '1' || input.available === 1,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    view: views.includes(input.view as RouteView) ? input.view as RouteView : undefined,
    nft: typeof input.nft === 'string' ? input.nft : undefined,
    scenario: scenarios.includes(input.scenario as MockScenario) ? input.scenario as MockScenario : 'normal',
    returnTo: safeReturnTo(input.returnTo)
  };
}

export function selectCatalog(items: NftArtifact[], filters: MarketplaceSearch, pageSize = 6) {
  const matching = items.filter(n => {
    if (filters.category && n.category !== filters.category) return false;
    if (filters.q && !`${n.title} ${n.code} ${n.collectionName} ${n.creatorHandle}`.toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
    return n.editions.some(e => (!filters.standard || e.standard === filters.standard) && (!filters.available || e.availableSupply > 0));
  }).sort((a, b) => {
    if (filters.sort === 'popular') return b.favoritesCount - a.favoritesCount;
    if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
      const delta = parseEthToWei(a.floorPriceEth) - parseEthToWei(b.floorPriceEth);
      return (delta < 0n ? -1 : delta > 0n ? 1 : 0) * (filters.sort === 'price_desc' ? -1 : 1);
    }
    return 0;
  });
  return { items: matching.slice((filters.page - 1) * pageSize, filters.page * pageSize), total: matching.length, page: filters.page, pageSize, totalPages: Math.max(1, Math.ceil(matching.length / pageSize)) };
}
