import React, { useSyncExternalStore } from 'react';
import { getRealtimeStatus, subscribeRealtimeStatus } from '@/lib/socket-client';
import { scenarios, type MockScenario, type RouteView } from '@/lib/catalog-search';
import type { CollectorUser, MultiCurrencyQuote } from '@/contracts/kronos.types';
import { formatShortEth } from '@/lib/eth-math';
import { KronosIcon } from '@/components/icons/KronosIcons';

export type ActiveRouteView = RouteView;

interface AppHeaderProps {
  activeView: ActiveRouteView;
  onNavigate: (view: ActiveRouteView) => void;
  user: CollectorUser | null;
  quote: MultiCurrencyQuote | undefined;
  urlQueryString: string;
  scenario: MockScenario;
  onScenarioChange: (scenario: MockScenario) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeView,
  onNavigate,
  user,
  quote,
  urlQueryString,
  scenario,
  onScenarioChange
}) => {
  const realtime = useSyncExternalStore(subscribeRealtimeStatus, getRealtimeStatus);
  const cartCount = (quote?.items || []).reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <div className="utility-bar">
        <div className="wrap utility-row">
          <div className="telemetry-pills">
            <span className="ws-pill">
              <span className="ws-dot" data-connected={realtime === 'connected'} /> SOCKET.IO // {realtime === 'connected' ? 'CONECTADO · MSW WEBSOCKET' : realtime === 'connecting' ? 'CONECTANDO' : 'RECUPERAÇÃO VIA REST'}
            </span>
            <span>
              ORÁCULO TRAVADO: <strong>1 ETH = R$ 15.200,00 = 2.500 KRN</strong>
            </span>
            <label className="scenario-control">Cenário MSW <select aria-label="Cenário MSW" value={scenario} onChange={e => onScenarioChange(e.target.value as MockScenario)}>{scenarios.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <div className="telemetry-pills">
            <span>
              {user
                ? `SESSÃO: ${user.handle} (${formatShortEth(user.ethBalance)} · ${user.krnBalance})`
                : 'SESSÃO: VISITANTE (DESLOGADO)'}
            </span>
          </div>
        </div>
      </div>

      <header className="masthead">
        <div className="wrap mast-row">
          <a
            className="wordmark"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('explore');
            }}
          >
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M40 4H4V60H60V24" fill="none" stroke="currentColor" strokeWidth="8" />
              <path d="M18 16H26V48H18ZM26 28L40 16H51L34 32ZM26 36L35 30L51 48H40Z" fill="currentColor" />
            </svg>
            <div>
              <strong>KRONOS</strong>
              <span>// ARCHIVE EXCHANGE</span>
            </div>
          </a>

          <nav className="main-tabs" aria-label="Navegação Principal">
            <button
              type="button"
              className="tab-btn"
              aria-current={activeView === 'explore' || activeView === 'detail' ? 'page' : undefined}
              onClick={() => onNavigate('explore')}
            >
              <KronosIcon name="search" />
              <span>01 / Explorar Arquivo</span>
            </button>

            <button
              type="button"
              className="tab-btn"
              aria-current={activeView === 'mint' ? 'page' : undefined}
              onClick={() => onNavigate('mint')}
            >
              <KronosIcon name="eth-wei" />
              <span>02 / Cunhar NFT (Mint Studio)</span>
            </button>

            <button
              type="button"
              className="tab-btn"
              aria-current={activeView === 'cart' ? 'page' : undefined}
              onClick={() => onNavigate('cart')}
            >
              <KronosIcon name="vault" />
              <span>03 / Cofre &amp; Carrinho</span>
              <span className="badge-count">{cartCount}</span>
            </button>

            <button
              type="button"
              className="tab-btn"
              aria-current={activeView === 'checkout' ? 'page' : undefined}
              onClick={() => onNavigate('checkout')}
            >
              <KronosIcon name="idempotency" />
              <span>04 / Checkout Stripe &amp; Web3</span>
            </button>

            <button
              type="button"
              className="tab-btn"
              aria-current={activeView === 'account' ? 'page' : undefined}
              onClick={() => onNavigate('account')}
            >
              <KronosIcon name="collector" />
              <span>05 / Conta &amp; Recibos</span>
            </button>
            <button type="button" className="tab-btn" aria-current={activeView === 'design' ? 'page' : undefined} onClick={() => onNavigate('design')}>
              <KronosIcon name="filter" />
              <span>06 / Design System (MIV)</span>
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};
