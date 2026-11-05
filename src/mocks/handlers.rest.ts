/**
 * KRONOS // ARCHIVE — MSW 2.x REST Handlers (/api/*)
 */
import { http, HttpResponse, delay } from 'msw';
import {
  COUPON_CATALOG,
  applyMockNftUpdate,
  buildQuoteForCurrentOwner,
  createNewMintedArtifact,
  dbState,
  executeMockOrderSettlement,
  getCurrentUser,
  getOwnerKey,
  persistDb,
  resetMockDb,
  switchMockSession
} from '@/mocks/db';
import type { MintArtifactInput, MultiCurrencyQuote, PaymentRail } from '@/contracts/kronos.types';
import { publishMockSocketEvent as broadcastMockSocketEvent } from '@/mocks/handlers.ws';
import { MockApiError, changePassword, deleteWallet, loginAccount, registerAccount, requireUser, saveWallet, updateProfile } from '@/mocks/accounts';
import { parseEthToWei } from '@/lib/eth-math';
import { selectCatalog, validateMarketplaceSearch } from '@/lib/catalog-search';

async function accountResponse(action: () => unknown | Promise<unknown>, status = 200) {
  try { return HttpResponse.json({ user: await action() }, { status }); }
  catch (error) {
    if (error instanceof MockApiError) return HttpResponse.json({ code: error.code, message: error.message, fields: error.fields }, { status: error.status });
    throw error;
  }
}

function emitOrder(order: import('@/contracts/kronos.types').OrderReceiptSnapshot) {
  broadcastMockSocketEvent({ eventId: `evt_${order.orderId}_v${order.version}`, type: 'order.updated', orderId: order.orderId, userId: order.userId, status: order.status, txHash: order.txHash, version: order.version, emittedAt: order.updatedAt });
}
function finalizeDueOrders() {
  const user = getCurrentUser();
  if (!user) return;
  for (const [orderId, attempt] of Object.entries(dbState.pendingOrders)) {
    const pending = dbState.orders.find(o => o.orderId === orderId);
    if (!pending || pending.userId !== user.id || attempt.readyAt > Date.now()) continue;
    const recordKey = `${user.id}:${pending.idempotencyKey}`;
    const previousRecord = dbState.idempotencyRecords[recordKey];
    try {
      const result = executeMockOrderSettlement(attempt.quote, attempt.rail, pending.idempotencyKey, attempt.outcome, attempt.collector);
      emitOrder(result.order);
      if (result.order.status === 'CONFIRMED') for (const item of attempt.quote.items) {
        const nft = dbState.nfts.find(n => n.id === item.nftId)!;
        const edition = nft.editions.find(e => e.editionId === item.editionId)!;
        broadcastMockSocketEvent({ eventId: `evt_${orderId}_${nft.id}_v${nft.version}`, type: 'nft.updated', nftId: nft.id, editionId: edition.editionId, newPriceEth: edition.priceEth, newAvailableSupply: edition.availableSupply, version: nft.version, emittedAt: nft.updatedAt });
      }
    } catch (error) {
      pending.status = 'REFUSED'; pending.version = 2; pending.updatedAt = new Date().toISOString(); pending.failureReason = (error as Error).message;
      dbState.orders = dbState.orders.filter(o => o.orderId !== orderId); dbState.orders.unshift(pending);
      if (previousRecord) dbState.idempotencyRecords[recordKey] = previousRecord;
      emitOrder(pending);
    }
    delete dbState.pendingOrders[orderId]; persistDb();
  }
}

export const restHandlers = [
  http.all('/api/*', async ({ request }) => {
    const path = new URL(request.url).pathname;
    const scenario = request.headers.get('X-Mock-Scenario');
    if (scenario === 'latency') await delay(650);
    const privatePath = /^\/api\/(profile|wallets|orders|favorites|mint)(\/|$)/.test(path);
    const expiryKey = `kronos.expiry.${request.headers.get('X-Mock-Scenario-Run') || 'initial'}`;
    if (scenario === 'session-expired' && !sessionStorage.getItem(expiryKey) && (privatePath || path === '/api/session') && getCurrentUser()) {
      sessionStorage.setItem(expiryKey, '1');
      switchMockSession(null);
      return HttpResponse.json({ code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente para retomar.' }, { status: 401 });
    }
    if (privatePath && !getCurrentUser()) return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Entre na sua conta para continuar.' }, { status: 401 });
    return undefined;
  }),
  http.post('/api/auth/login', async ({ request }) => accountResponse(() => request.json().then(body => loginAccount(body as Record<string, unknown>)))),
  http.post('/api/auth/register', async ({ request }) => accountResponse(() => request.json().then(body => registerAccount(body as Record<string, unknown>)), 201)),
  http.post('/api/auth/logout', () => { switchMockSession(null); return HttpResponse.json({ user: null }); }),
  http.get('/api/profile', () => accountResponse(() => { requireUser(); return getCurrentUser(); })),
  http.patch('/api/profile', async ({ request }) => accountResponse(() => request.json().then(body => updateProfile(body as Record<string, unknown>)))),
  http.post('/api/profile/password', async ({ request }) => accountResponse(() => request.json().then(body => changePassword(body as Record<string, unknown>)).then(() => getCurrentUser()))),
  http.get('/api/wallets', () => HttpResponse.json({ wallets: requireUser().wallets })),
  http.post('/api/wallets', async ({ request }) => accountResponse(() => request.json().then(body => saveWallet(body as Record<string, unknown>)), 201)),
  http.patch('/api/wallets/:id', async ({ params, request }) => accountResponse(() => request.json().then(body => saveWallet(body as Record<string, unknown>, String(params.id))))),
  http.delete('/api/wallets/:id', ({ params }) => accountResponse(() => deleteWallet(String(params.id)))),
  http.get('/api/session', async () => {
    await delay(40);
    return HttpResponse.json({ user: getCurrentUser() });
  }),

  http.post('/api/auth/switch', async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { userId: string | null };
    if (body.userId && !dbState.users[body.userId]) return HttpResponse.json({ message: 'Conta inexistente.' }, { status: 404 });
    const user = switchMockSession(body.userId);
    return HttpResponse.json({ user });
  }),

  http.get('/api/nfts', async ({ request }) => {
    const scenario = request.headers.get('X-Mock-Scenario');
    await delay(45);
    if (scenario === 'http-500') {
      return HttpResponse.json({ code: 'TRANSIENT_FAILURE', message: 'Falha transitória simulada no MSW.' }, { status: 500 });
    }
    const user = getCurrentUser();
    const favs = new Set(user?.favorites || []);
    const items = dbState.nfts.map((n) => ({
      ...n,
      isFavorited: favs.has(n.id)
    }));
    const url = new URL(request.url);
    const filters = validateMarketplaceSearch(Object.fromEntries(url.searchParams));
    const pageSize = Math.max(1, Math.min(24, Number(url.searchParams.get('pageSize')) || 6));
    return HttpResponse.json({ ...selectCatalog(items, filters, pageSize), featured: items[0], catalogCount: items.length });
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    await delay(40);
    const nft = dbState.nfts.find((n) => n.id === params['id']);
    if (!nft) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Artefato não encontrado no arquivo.' }, { status: 404 });
    }
    return HttpResponse.json({ nft: { ...nft, isFavorited: getCurrentUser()?.favorites.includes(nft.id) || false } });
  }),

  http.post('/api/favorites/:id', async ({ params, request }) => {
    await delay(60);
    if (request.headers.get('X-Mock-Scenario') === 'fav-500') {
      return HttpResponse.json({ code: 'TRANSIENT_FAILURE', message: 'Falha ao persistir favorito.' }, { status: 500 });
    }
    const user = getCurrentUser();
    if (!user || !dbState.activeUserId) {
      return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Autentique-se para favoritar obras.' }, { status: 401 });
    }
    const nftId = String(params['id']);
    const dbUser = dbState.users[dbState.activeUserId]!;
    const nft = dbState.nfts.find((n) => n.id === nftId);
    if (!nft) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Obra inexistente.' }, { status: 404 });
    }
    const idx = dbUser.favorites.indexOf(nftId);
    let isFavorited = false;
    if (idx === -1) {
      dbUser.favorites.push(nftId);
      nft.favoritesCount += 1;
      isFavorited = true;
    } else {
      dbUser.favorites.splice(idx, 1);
      nft.favoritesCount = Math.max(0, nft.favoritesCount - 1);
      isFavorited = false;
    }
    persistDb();
    return HttpResponse.json({ nftId, isFavorited, favoritesCount: nft.favoritesCount });
  }),

  http.post('/api/mint', async ({ request }) => {
    await delay(90);
    const body = (await request.json()) as MintArtifactInput;
    if (!body.title?.trim() || !body.recipe?.seedHex || !['ERC-721', 'ERC-1155'].includes(body.standard) || !/^\d+(\.\d{1,18})?$/.test(body.priceEth) || parseEthToWei(body.priceEth) <= 0n || !Number.isInteger(body.totalSupply) || body.totalSupply < 1 || body.totalSupply > 100 || !Number.isInteger(body.royaltyBps) || body.royaltyBps < 0 || body.royaltyBps > 2500) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Verifique título, preço positivo, edição, estoque (1–100) e royalties (0–25%).' }, { status: 422 });
    const created = await createNewMintedArtifact(body);
    broadcastMockSocketEvent({
      eventId: `evt_mint_${Date.now()}`,
      type: 'nft.updated',
      nftId: created.id,
      editionId: created.editions[0]!.editionId,
      newPriceEth: created.floorPriceEth,
      newAvailableSupply: created.editions[0]!.availableSupply,
      version: created.version,
      emittedAt: created.updatedAt
    });
    return HttpResponse.json({ nft: created }, { status: 201 });
  }),

  http.get('/api/cart', async () => {
    await delay(40);
    return HttpResponse.json({ quote: buildQuoteForCurrentOwner() });
  }),

  http.put('/api/cart/items', async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { nftId: string; editionId: string; quantity: number; mode?: 'add' | 'set' };
    if (!Number.isSafeInteger(body.quantity) || body.quantity < 0) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'A quantidade deve ser um inteiro positivo ou zero para remover.' }, { status: 422 });
    const nft = dbState.nfts.find((n) => n.id === body.nftId);
    const ed = nft?.editions.find((e) => e.editionId === body.editionId);
    if (!nft || !ed) {
      return HttpResponse.json({ code: 'NOT_FOUND', message: 'Obra ou edição não encontrada.' }, { status: 404 });
    }
    const key = getOwnerKey();
    const cart = dbState.cartsByOwner[key] || [];
    const idx = cart.findIndex((c) => c.nftId === body.nftId && c.editionId === body.editionId);
    const maxAllowed = Math.min(ed.availableSupply, ed.maxPerCollector);

    if (body.quantity <= 0) {
      if (idx !== -1) cart.splice(idx, 1);
    } else if (body.mode === 'add') {
      const nextQty = (idx !== -1 ? cart[idx]!.quantity : 0) + body.quantity;
      if (nextQty > maxAllowed) {
        return HttpResponse.json({ code: 'AVAILABILITY_CONFLICT', message: `Limite máximo de ${maxAllowed} unidade(s) para esta edição.` }, { status: 409 });
      }
      if (idx !== -1) {
        cart[idx]!.quantity = nextQty;
        cart[idx]!.addedVersion = nft.version;
      } else {
        cart.push({ nftId: body.nftId, editionId: body.editionId, quantity: nextQty, addedVersion: nft.version });
      }
    } else {
      if (body.quantity > maxAllowed) {
        return HttpResponse.json({ code: 'AVAILABILITY_CONFLICT', message: `Máximo permitido: ${maxAllowed} unidade(s).` }, { status: 409 });
      }
      if (idx !== -1) {
        cart[idx]!.quantity = body.quantity;
        cart[idx]!.addedVersion = nft.version;
      } else {
        cart.push({ nftId: body.nftId, editionId: body.editionId, quantity: body.quantity, addedVersion: nft.version });
      }
    }
    dbState.cartsByOwner[key] = cart;
    persistDb();
    return HttpResponse.json({ quote: buildQuoteForCurrentOwner() });
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    await delay(40);
    const body = (await request.json()) as { code: string | null };
    const key = getOwnerKey();
    if (!body.code || !body.code.trim()) {
      dbState.couponsByOwner[key] = null;
      persistDb();
      return HttpResponse.json({ quote: buildQuoteForCurrentOwner() });
    }
    const clean = body.code.trim().toUpperCase();
    const coupon = COUPON_CATALOG[clean];
    if (!coupon) {
      return HttpResponse.json({ code: 'COUPON_INVALID', message: `Cupom "${clean}" inválido.` }, { status: 422 });
    }
    if (coupon.expired) {
      return HttpResponse.json({ code: 'COUPON_EXPIRED', message: `O cupom "${clean}" está expirado.` }, { status: 422 });
    }
    dbState.couponsByOwner[key] = clean;
    persistDb();
    return HttpResponse.json({ quote: buildQuoteForCurrentOwner() });
  }),

  http.post('/api/quotes/revalidate', async () => {
    await delay(40);
    const key = getOwnerKey();
    const cart = dbState.cartsByOwner[key] || [];
    for (const item of cart) {
      const nft = dbState.nfts.find((n) => n.id === item.nftId);
      if (nft) item.addedVersion = nft.version;
    }
    persistDb();
    return HttpResponse.json({ quote: buildQuoteForCurrentOwner() });
  }),

  http.post('/api/orders', async ({ request }) => {
    await delay(80);
    const idemKey = request.headers.get('Idempotency-Key') || '';
    const body = (await request.json()) as {
      quote: MultiCurrencyQuote;
      paymentRail: PaymentRail;
      outcome?: 'CONFIRMED' | 'REFUSED';
      collectorName?: string;
      collectorEmail?: string;
      walletId?: string;
    };
    try {
      finalizeDueOrders();
      const collector = body.collectorName !== undefined ? { name: body.collectorName, email: body.collectorEmail || '', walletId: body.walletId || '' } : undefined;
      const result = executeMockOrderSettlement(
        body.quote,
        body.paymentRail,
        idemKey,
        'PENDING',
        collector
      );
      if (!result.replayed) {
        dbState.pendingOrders[result.order.orderId] = { quote: body.quote, rail: body.paymentRail, outcome: body.outcome || 'CONFIRMED', readyAt: Date.now() + 900, collector };
        persistDb();
        setTimeout(finalizeDueOrders, 950);
      }
      if (request.headers.get('X-Mock-Scenario') === 'timeout-order' && !result.replayed) {
        await delay(1200);
        return HttpResponse.json({ code: 'ORDER_TIMEOUT', message: 'A resposta se perdeu após criar o pedido. Recupere a mesma tentativa.' }, { status: 504 });
      }
      broadcastMockSocketEvent({
        eventId: `evt_ord_${Date.now()}`,
        type: 'order.updated',
        orderId: result.order.orderId,
        userId: result.order.userId,
        status: result.order.status,
        txHash: result.order.txHash,
        version: result.order.version,
        emittedAt: result.order.updatedAt
      });
      return HttpResponse.json(result, { status: result.replayed ? 200 : 201 });
    } catch (err) {
      const e = err as Error & { code?: string };
      const status = e.code === 'UNAUTHORIZED' ? 401 : 409;
      return HttpResponse.json({ code: e.code || 'STALE_QUOTE', message: e.message }, { status });
    }
  }),

  http.get('/api/orders', async () => {
    await delay(40);
    finalizeDueOrders();
    const user = getCurrentUser();
    if (!user) return HttpResponse.json({ orders: [] });
    const orders = dbState.orders.filter((o) => o.userId === user.id);
    return HttpResponse.json({ orders });
  }),
  http.get('/api/orders/:id', ({ params }) => {
    finalizeDueOrders();
    const order = dbState.orders.find(o => (o.orderId === params.id || o.idempotencyKey === params.id) && o.userId === getCurrentUser()?.id);
    return order ? HttpResponse.json({ order }) : HttpResponse.json({ code: 'NOT_FOUND', message: 'Pedido não encontrado.' }, { status: 404 });
  }),

  http.post('/api/__mock/ws-emit', async ({ request }) => {
    const body = (await request.json()) as {
      nftId: string;
      editionId: string;
      newPriceEth: string;
      newAvailableSupply: number;
      version: number;
      eventId?: string;
    };
    const eventId = body.eventId || `evt_ws_${Date.now()}`;
    const applied = applyMockNftUpdate(
      body.nftId,
      body.editionId,
      body.newPriceEth,
      body.newAvailableSupply,
      body.version,
      eventId
    );
    if (applied) {
      broadcastMockSocketEvent({
        eventId,
        type: 'nft.updated',
        nftId: body.nftId,
        editionId: body.editionId,
        newPriceEth: body.newPriceEth,
        newAvailableSupply: body.newAvailableSupply,
        version: body.version,
        emittedAt: new Date().toISOString()
      });
    }
    return HttpResponse.json({ applied, eventId });
  }),

  http.post('/api/__mock/reset', async () => {
    resetMockDb();
    return HttpResponse.json({ ok: true });
  })
];
