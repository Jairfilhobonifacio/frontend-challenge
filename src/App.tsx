import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Outlet, RouterProvider, createRootRoute, createRoute, createRouter, redirect, useRouterState, useSearch } from '@tanstack/react-router';
import type { CollectorUser, MultiCurrencyQuote, NftArtifact, OrderReceiptSnapshot } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';
import { queryClient, purgeSessionCache } from '@/lib/query-client';
import { connectRealtimeSocket, disconnectRealtimeSocket } from '@/lib/socket-client';
import { safeReturnTo, validateMarketplaceSearch, type MarketplaceSearch, type RouteView } from '@/lib/catalog-search';
import { AppHeader } from '@/components/layout/AppHeader';
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { NftDetailPage } from '@/features/catalog/NftDetailPage';
import { MintStudioPage } from '@/features/mint-studio/MintStudioPage';
import { CartVaultPage } from '@/features/cart/CartVaultPage';
import { CheckoutPage } from '@/features/checkout/CheckoutPage';
import { AccountPage } from '@/features/account/AccountPage';
import { AuthPage } from '@/features/account/AuthPage';
import { errorMessage } from '@/lib/errors';

const DesignSystemPage = React.lazy(() => import('@/features/design-system/DesignSystemPage').then(module => ({ default: module.DesignSystemPage })));
function DesignRoute() {
  return <React.Suspense fallback={<div className="loading-page" aria-label="Carregando Design System"><SkeletonShimmer aspectRatio="3 / 1" /></div>}><DesignSystemPage /></React.Suspense>;
}

interface CatalogResponse { items: NftArtifact[]; featured?: NftArtifact; total: number; totalPages: number; catalogCount: number }
const useSession = () => useQuery({ queryKey: ['session'], queryFn: async ({ signal }) => (await apiClient.get<{ user: CollectorUser | null }>('/session', { signal })).data.user });
function useCart(user: CollectorUser | null, enabled: boolean) {
  return useQuery({ queryKey: ['cart', user?.id ?? 'guest'], enabled, queryFn: async ({ signal }) => (await apiClient.get<{ quote: MultiCurrencyQuote }>('/cart', { signal })).data.quote });
}
interface ShellContextValue {
  user: CollectorUser | null;
  quote?: MultiCurrencyQuote;
  search: MarketplaceSearch;
  navigate: (view: RouteView, nftId?: string) => void;
  toast: (message: string) => void;
}
const ShellContext = createContext<ShellContextValue>(null!);
function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="error-panel" role="alert"><h2>O arquivo está temporariamente indisponível.</h2><p>{errorMessage(error)}</p><button className="btn primary" onClick={retry}>Tentar Novamente</button></div>;
}
function NotFound() {
  return <section className="error-panel"><span className="eyebrow">// ROTA 404</span><h1>Página não encontrada.</h1><a className="btn primary" href="/">Voltar ao Arquivo</a></section>;
}
function MarketplaceShell() {
  const search = useSearch({ from: '__root__' });
  const location = useRouterState({ select: s => s.location });
  const session = useSession();
  const user = session.data ?? null;
  const cart = useCart(user, session.isSuccess);
  const [message, setMessage] = useState('');
  const path = location.pathname;
  const activeView: RouteView = path.startsWith('/nfts/') ? 'detail' : path === '/' ? 'explore' : path.slice(1) as RouteView;
  const navigate = (view: RouteView, nftId?: string) => {
    const nextSearch = { ...search, view: undefined, nft: undefined, returnTo: undefined };
    if (view === 'detail' && nftId) void router.navigate({ to: '/nfts/$nftId', params: { nftId }, search: nextSearch });
    else void router.navigate({ to: view === 'explore' ? '/' : `/${view}` as '/account', search: nextSearch });
  };
  useEffect(() => {
    if (!session.isSuccess) return;
    return connectRealtimeSocket(user?.id ?? null);
  }, [user?.id, session.isSuccess]);
  useEffect(() => {
    const onExpired = () => {
      disconnectRealtimeSocket();
      const current = router.state.location;
      const returnTo = safeReturnTo(current.href) || '/account';
      void router.navigate({ to: '/login', search: { ...validateMarketplaceSearch({}), scenario: search.scenario, returnTo }, replace: true });
      setMessage('Sua sessão expirou. Entre novamente para retomar de onde parou.');
    };
    window.addEventListener('kronos:session-expired', onExpired);
    return () => window.removeEventListener('kronos:session-expired', onExpired);
  }, [search.scenario]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);
  useEffect(() => {
    document.title = `${activeView === 'explore' ? 'Arquivo' : activeView === 'detail' ? 'Obra' : activeView.toUpperCase()} — KRONOS // ARCHIVE`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [path]);
  return <ShellContext.Provider value={{ user, quote: cart.data, search, navigate, toast: setMessage }}>
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <AppHeader activeView={activeView} onNavigate={navigate} user={user} quote={cart.data} urlQueryString={location.href} scenario={search.scenario} onScenarioChange={scenario => {
      sessionStorage.setItem('kronos.scenarioRun', crypto.randomUUID());
      void router.navigate({ to: '.', search: { ...search, scenario } }).then(() => queryClient.invalidateQueries());
    }} />
    <main className="wrap" id="main-content" tabIndex={-1}>
      {activeView === 'design' ? <Outlet /> : session.isPending || cart.isPending && session.isSuccess ? <div className="loading-page" aria-label="Carregando arquivo"><SkeletonShimmer aspectRatio="3 / 1" /></div> : session.isError ? <ErrorState error={session.error} retry={() => void session.refetch()} /> : cart.isError ? <ErrorState error={cart.error} retry={() => void cart.refetch()} /> : <Outlet />}
    </main>
    <footer className="wrap site-footer"><span className="mono">KRONOS // ARCHIVE · 2026</span><span>Demonstração local. Carteiras, assinaturas e pagamentos simulados.</span></footer>
    <div className="toast" role="status" aria-live="polite">{message}</div>
  </ShellContext.Provider>;
}
function CatalogRoute() {
  const { search, navigate, toast, user } = useContext(ShellContext);
  const catalog = useQuery({ queryKey: ['nfts', user?.id ?? 'guest', search.q, search.category, search.standard, search.sort, search.available, search.page, search.scenario], queryFn: async ({ signal }) => (await apiClient.get<CatalogResponse>('/nfts', { signal, params: { q: search.q, category: search.category, standard: search.standard, sort: search.sort, available: search.available ? '1' : '0', page: search.page } })).data });
  if (catalog.isError) return <ErrorState error={catalog.error} retry={() => void catalog.refetch()} />;
  return <CatalogPage items={catalog.data?.items || []} featured={catalog.data?.featured} total={catalog.data?.total || 0} totalPages={catalog.data?.totalPages || 1} isLoading={catalog.isPending} filters={{ ...search, onlyAvailable: search.available }} onUpdateFilters={patch => {
    const { onlyAvailable, ...rest } = patch;
    void router.navigate({ to: '/', search: { ...search, ...rest, available: onlyAvailable ?? search.available, page: patch.page ?? 1 } });
  }} onResetFilters={() => void router.navigate({ to: '/', search: { ...validateMarketplaceSearch({}), scenario: search.scenario } })} onSelectNft={id => navigate('detail', id)} onOpenMintStudio={() => navigate('mint')} onToast={toast} />;
}
function DetailRoute() {
  const { navigate, toast, user } = useContext(ShellContext);
  const { nftId } = detailRoute.useParams();
  const query = useQuery({ queryKey: ['nft', user?.id ?? 'guest', nftId], queryFn: async ({ signal }) => (await apiClient.get<{ nft: NftArtifact }>(`/nfts/${encodeURIComponent(nftId)}`, { signal })).data.nft, retry: false });
  if (query.isPending) return <div className="loading-page"><SkeletonShimmer aspectRatio="2 / 1" /></div>;
  if (query.isError && (query.error as { response?: { status: number } }).response?.status !== 404) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return <NftDetailPage key={nftId} nft={query.data} onBack={() => navigate('explore')} onProceedCheckout={() => navigate('checkout')} onToast={toast} />;
}
function MintRoute() {
  const { navigate, toast } = useContext(ShellContext);
  const catalog = useQuery({ queryKey: ['nfts', 'mint-count'], queryFn: async ({ signal }) => (await apiClient.get<CatalogResponse>('/nfts', { signal })).data });
  return <MintStudioPage catalogCount={catalog.data?.catalogCount || 12} onMintedSuccess={nft => navigate('detail', nft.id)} onToast={toast} />;
}
function CartRoute() { const c = useContext(ShellContext); return <CartVaultPage quote={c.quote} onExplore={() => c.navigate('explore')} onProceedCheckout={() => c.navigate('checkout')} onToast={c.toast} />; }
function CheckoutRoute() { const c = useContext(ShellContext); return <CheckoutPage key={c.user?.id ?? 'guest'} user={c.user} quote={c.quote} onNavigateAccount={() => c.user ? c.navigate('account') : void router.navigate({ to: '/login', search: { ...c.search, returnTo: '/checkout' } })} onNavigateExplore={() => c.navigate('explore')} onToast={c.toast} />; }
function AccountRoute() {
  const c = useContext(ShellContext);
  const orders = useQuery({ queryKey: ['orders', c.user?.id ?? 'guest'], enabled: !!c.user, queryFn: async ({ signal }) => (await apiClient.get<{ orders: OrderReceiptSnapshot[] }>('/orders', { signal })).data.orders });
  return <AccountPage key={c.user?.id ?? 'guest'} user={c.user} orders={orders.data || []} onToast={c.toast} onAuthenticate={mode => void router.navigate({ to: mode === 'login' ? '/login' : '/register', search: { ...c.search, returnTo: '/account' } })} />;
}
function AuthenticationRoute() {
  const c = useContext(ShellContext), path = useRouterState({ select: s => s.location.pathname });
  return <AuthPage key={path} mode={path === '/register' ? 'register' : 'login'} onToast={c.toast} onModeChange={mode => void router.navigate({ to: mode === 'login' ? '/login' : '/register', search: c.search })} onSuccess={async user => {
    disconnectRealtimeSocket(); await purgeSessionCache(); queryClient.setQueryData(['session'], user);
    await router.navigate({ href: safeReturnTo(c.search.returnTo) || '/account', replace: true });
  }} />;
}
const rootRoute = createRootRoute({ component: MarketplaceShell, validateSearch: validateMarketplaceSearch, notFoundComponent: NotFound });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: CatalogRoute, beforeLoad: ({ search }) => {
  if (search.nft || search.view && search.view !== 'explore') {
    const { view, nft, ...rest } = search;
    if (nft) throw redirect({ to: '/nfts/$nftId', params: { nftId: nft }, search: rest, replace: true });
    if (view && view !== 'detail') throw redirect({ to: `/${view}` as '/account', search: rest, replace: true });
  }
} });
const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/nfts/$nftId', component: DetailRoute });
const mintRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mint', component: MintRoute });
const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cart', component: CartRoute });
const checkoutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/checkout', component: CheckoutRoute, beforeLoad: async ({ location, search }) => {
  const user = (await apiClient.get<{ user: CollectorUser | null }>('/session')).data.user;
  if (!user) throw redirect({ to: '/login', search: { ...search, returnTo: location.href }, replace: true });
} });
const accountRoute = createRoute({ getParentRoute: () => rootRoute, path: '/account', component: AccountRoute });
const designRoute = createRoute({ getParentRoute: () => rootRoute, path: '/design', component: DesignRoute });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: AuthenticationRoute });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: AuthenticationRoute });
export const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, detailRoute, mintRoute, cartRoute, checkoutRoute, accountRoute, loginRoute, registerRoute, designRoute]), defaultPreload: 'intent', defaultErrorComponent: ({ error, reset }) => <ErrorState error={error} retry={reset} /> });
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
export const App = () => <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
