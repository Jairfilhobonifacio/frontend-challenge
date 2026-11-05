/**
 * KRONOS // ARCHIVE — Banco Determinístico MSW + Motor de Negócio
 * Persistência em localStorage (sobrevive a F5) + Reset Determinístico
 */
import type {
  CollectorUser,
  EthDecimalString,
  MintArtifactInput,
  MultiCurrencyQuote,
  NftArtifact,
  OrderReceiptSnapshot,
  PaymentRail,
  StripePaymentIntentSimulation
} from '@/contracts/kronos.types';
import {
  EXCHANGE_RATE_BRL_PER_ETH,
  NETWORK_FEE_ETH,
  formatBrlCents,
  formatWeiToEth,
  parseEthToWei,
  weiToBrlCents,
  weiToKrnFormatted
} from '@/lib/eth-math';
import {
  deterministicHex,
  generateIpfsCid,
  signEip712MintVoucher
} from '@/lib/crypto-provenance';

const STORAGE_KEY = 'kronos.modular-db.v2';
const QUOTE_TTL_MS = 90000;
let seq = 200;

export interface MockDbState {
  schemaVersion: number;
  activeUserId: string | null;
  nfts: NftArtifact[];
  users: Record<string, CollectorUser & { krnUnits: number }>;
  credentials: Record<string, { salt: string; hash: string }>;
  cartsByOwner: Record<string, Array<{ nftId: string; editionId: string; quantity: number; addedVersion: number }>>;
  couponsByOwner: Record<string, string | null>;
  orders: OrderReceiptSnapshot[];
  paymentIntents: Record<string, StripePaymentIntentSimulation>;
  idempotencyRecords: Record<string, { key: string; fingerprint: string; orderId: string; paymentIntentId: string }>;
  processedEventIds: string[];
  pendingOrders: Record<string, { quote: MultiCurrencyQuote; rail: PaymentRail; outcome: 'CONFIRMED' | 'REFUSED'; readyAt: number; collector?: { name: string; email: string; walletId: string } }>;
}

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

function computeFloor(editions: NftArtifact['editions']): EthDecimalString {
  const avail = editions.filter((e) => e.availableSupply > 0);
  const pool = avail.length > 0 ? avail : editions;
  let minWei: bigint | null = null;
  for (const ed of pool) {
    const w = parseEthToWei(ed.priceEth);
    if (minWei === null || w < minWei) minWei = w;
  }
  return formatWeiToEth(minWei ?? 0n);
}

function seedArtifact(
  id: string,
  code: string,
  title: string,
  creatorHandle: string,
  collectionName: string,
  category: NftArtifact['category'],
  description: string,
  favoritesCount: number,
  genesisPrice: EthDecimalString,
  studyPrice: EthDecimalString,
  studySupply: number,
  genesisSupply: number,
  royaltyBps: number,
  algorithm: NonNullable<NftArtifact['recipe']>['algorithm']
): NftArtifact {
  const sha = deterministicHex(`${id}:${title}:${creatorHandle}`, 64);
  const cid = generateIpfsCid(sha);
  const sig = signEip712MintVoucher(sha, genesisPrice);
  const editions: NftArtifact['editions'] = [
    {
      editionId: 'genesis',
      label: 'Original 1/1',
      standard: 'ERC-721',
      priceEth: genesisPrice,
      totalSupply: 1,
      availableSupply: genesisSupply,
      maxPerCollector: 1
    },
    {
      editionId: 'study',
      label: 'Estudo de Artista',
      standard: 'ERC-1155',
      priceEth: studyPrice,
      totalSupply: 24,
      availableSupply: studySupply,
      maxPerCollector: 3
    }
  ];
  return {
    id,
    code,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    collectionName,
    creatorHandle,
    creatorAddress: `0x${deterministicHex(creatorHandle, 40)}`,
    category,
    description,
    mediaUrl: `/assets/art-${id.slice(2)}.jpg`,
    ipfsCid: cid,
    sha256Hash: sha,
    eip712Signature: sig,
    royaltyBps,
    recipe: {
      algorithm,
      seedHex: `0x${sha.slice(0, 12)}`,
      complexity: 38,
      accentHue: 230
    },
    editions,
    floorPriceEth: computeFloor(editions),
    favoritesCount,
    version: 1,
    updatedAt: '2026-10-20T12:00:00.000Z'
  };
}

export const COUPON_CATALOG: Record<string, { code: string; discountBps: number; expired: boolean; label: string }> = {
  KRONOS10: { code: 'KRONOS10', discountBps: 1000, expired: false, label: '10% OFF Curadoria KRONOS' },
  ARCHIVE20: { code: 'ARCHIVE20', discountBps: 2000, expired: false, label: '20% OFF Membro Fundador' },
  EXPIRED50: { code: 'EXPIRED50', discountBps: 5000, expired: true, label: 'Cupom Expirado (Teste E2E)' }
};

export function createSeedState(): MockDbState {
  return {
    schemaVersion: 2,
    activeUserId: 'user-maya',
    nfts: [
      seedArtifact('k-001', 'K—001', 'Phase shift 001', '@maya.lin', 'Chromatic fields', 'generative', 'Um campo de cor em transformação. Cada intervalo revela uma nova relação entre luz, ruído e forma.', 128, '1.250000000000000000', '0.180000000000000001', 12, 1, 500, 'lissajous-ribbon'),
      seedArtifact('k-002', 'K—002', 'Silent monument', '@theo.void', 'Concrete futures', 'monolith', 'Uma arquitetura impossível suspensa entre presença e silêncio. Massa, sombra e espaço em equilíbrio.', 96, '2.400000000000000000', '0.240000000000000000', 8, 1, 750, 'brutalist-slabs'),
      seedArtifact('k-003', 'K—003', 'Proof of absence', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'A presença de algo que permanece oculto. Um estudo visual sobre informação, privacidade e percepção.', 214, '3.100000000000000000', '0.320000000000000000', 6, 0, 500, 'zk-interference'),
      seedArtifact('k-004', 'K—004', 'Field notes 004', '@maya.lin', 'Chromatic fields', 'generative', 'Vestígios de um sistema em crescimento. Linhas e cores encontram sua própria ordem no acaso.', 73, '0.850000000000000000', '0.100000000000000000', 18, 1, 500, 'orbital-copper'),
      seedArtifact('k-005', 'K—005', 'Concrete memory', '@theo.void', 'Concrete futures', 'monolith', 'Uma memória construída em camadas. A geometria preserva o que o tempo insiste em apagar.', 151, '1.800000000000000000', '0.210000000000000000', 3, 1, 600, 'strata-memory'),
      seedArtifact('k-006', 'K—006', 'Afterimage protocol', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'O que permanece depois da imagem. Um protocolo de luz transforma sinais em paisagens digitais.', 89, '1.450000000000000000', '0.160000000000000000', 10, 1, 500, 'cobalt-afterimage')
      ,seedArtifact('k-007', 'K—007', 'Tidal register', '@maya.lin', 'Chromatic fields', 'generative', 'Oscilações de luz registradas em um campo de linhas.', 62, '1.100000000000000000', '0.120000000000000000', 15, 1, 500, 'lissajous-ribbon')
      ,seedArtifact('k-008', 'K—008', 'Boundary condition', '@theo.void', 'Concrete futures', 'monolith', 'Volumes interrompidos por um limite invisível.', 45, '1.600000000000000000', '0.190000000000000000', 9, 1, 500, 'brutalist-slabs')
      ,seedArtifact('k-009', 'K—009', 'Private horizon', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'Um horizonte velado por camadas de informação.', 82, '2.100000000000000000', '0.280000000000000000', 7, 1, 500, 'zk-interference')
      ,seedArtifact('k-010', 'K—010', 'Orbital notation', '@maya.lin', 'Chromatic fields', 'generative', 'Trajetórias preservadas como notação de um tempo circular.', 39, '0.900000000000000000', '0.110000000000000000', 20, 1, 500, 'orbital-copper')
      ,seedArtifact('k-011', 'K—011', 'Strata of time', '@theo.void', 'Concrete futures', 'monolith', 'Camadas minerais como testemunho do tempo.', 67, '1.700000000000000000', '0.220000000000000000', 4, 1, 600, 'strata-memory')
      ,seedArtifact('k-012', 'K—012', 'Last signal', '@nora.zk', 'Invisible systems', 'zero-knowledge', 'O último sinal preservado no arquivo. Edição esgotada.', 104, '1.350000000000000000', '0.150000000000000000', 0, 0, 500, 'cobalt-afterimage')
    ],
    users: {
      'user-maya': {
        id: 'user-maya',
        name: 'Maya Lin',
        handle: '@maya.collector',
        email: 'maya@kronos.archive',
        krnUnits: 1450000,
        krnBalance: '14.500,00 KRN',
        ethBalance: '8.450000000000000000',
        favorites: ['k-001', 'k-003'],
        wallets: [
          { id: 'w-maya-1', label: 'Cofre Principal (Ledger)', address: '0x71C9...9A21', network: 'ethereum-mainnet', isPrimary: true, status: 'CONNECTED' },
          { id: 'w-maya-2', label: 'Carteira Estúdio (Base L2)', address: '0x44B2...11E0', network: 'base-mainnet', isPrimary: false, status: 'CONNECTED' }
        ]
      },
      'user-theo': {
        id: 'user-theo',
        name: 'Theo Void',
        handle: '@theo.archive',
        email: 'theo@kronos.archive',
        krnUnits: 320000,
        krnBalance: '3.200,00 KRN',
        ethBalance: '4.100000000000000000',
        favorites: ['k-002'],
        wallets: [
          { id: 'w-theo-1', label: 'Carteira Curadoria', address: '0x99A0...4F12', network: 'ethereum-mainnet', isPrimary: true, status: 'CONNECTED' }
        ]
      }
    },
    credentials: {},
    cartsByOwner: {
      'user-maya': [{ nftId: 'k-001', editionId: 'study', quantity: 1, addedVersion: 1 }],
      'user-theo': [],
      guest: []
    },
    couponsByOwner: {
      'user-maya': 'KRONOS10',
      'user-theo': null,
      guest: null
    },
    orders: [],
    paymentIntents: {},
    idempotencyRecords: {},
    processedEventIds: [],
    pendingOrders: {}
  };
}

function loadState(): MockDbState {
  try {
    if (typeof localStorage === 'undefined') return createSeedState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as MockDbState;
    if (!parsed || parsed.schemaVersion !== 2) return createSeedState();
    parsed.credentials ??= {};
    parsed.pendingOrders ??= {};
    const seed = createSeedState();
    for (const nft of seed.nfts) if (!parsed.nfts.some(n => n.id === nft.id)) parsed.nfts.push(nft);
    return parsed;
  } catch {
    return createSeedState();
  }
}

export let dbState: MockDbState = loadState();

export function persistDb(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
    }
  } catch {
    // Ignore storage quota errors in headless mode
  }
}

export function resetMockDb(): MockDbState {
  dbState = createSeedState();
  persistDb();
  return dbState;
}

export function getOwnerKey(): string {
  return dbState.activeUserId || 'guest';
}

export function getCurrentUser(): CollectorUser | null {
  if (!dbState.activeUserId) return null;
  const u = dbState.users[dbState.activeUserId];
  if (!u) return null;
  const whole = Math.floor(u.krnUnits / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = String(u.krnUnits % 100).padStart(2, '0');
  u.krnBalance = `${whole},${frac} KRN`;
  const { krnUnits: _privateUnits, ...publicUser } = u;
  return structuredClone(publicUser);
}

export function switchMockSession(targetUserId: string | null): CollectorUser | null {
  if (targetUserId && !dbState.users[targetUserId]) throw new Error('Conta inexistente.');
  const guestCart = (dbState.cartsByOwner['guest'] || []).slice();
  if (targetUserId && dbState.users[targetUserId] && guestCart.length > 0) {
    const userCart = dbState.cartsByOwner[targetUserId] || [];
    for (const gItem of guestCart) {
      const nft = dbState.nfts.find((n) => n.id === gItem.nftId);
      const ed = nft?.editions.find((e) => e.editionId === gItem.editionId);
      if (!nft || !ed) continue;
      const maxAllowed = Math.min(ed.availableSupply, ed.maxPerCollector);
      const existing = userCart.find((c) => c.nftId === gItem.nftId && c.editionId === gItem.editionId);
      if (existing) {
        existing.quantity = Math.min(maxAllowed, existing.quantity + gItem.quantity);
      } else {
        userCart.push({
          nftId: gItem.nftId,
          editionId: gItem.editionId,
          quantity: ed.availableSupply > 0 ? Math.min(maxAllowed, gItem.quantity) : gItem.quantity,
          addedVersion: nft.version
        });
      }
    }
    dbState.cartsByOwner[targetUserId] = userCart;
    dbState.cartsByOwner['guest'] = [];
    if (!dbState.couponsByOwner[targetUserId]) dbState.couponsByOwner[targetUserId] = dbState.couponsByOwner.guest || null;
    dbState.couponsByOwner.guest = null;
  }
  dbState.activeUserId = targetUserId;
  persistDb();
  return getCurrentUser();
}

export function buildQuoteForCurrentOwner(): MultiCurrencyQuote {
  const key = getOwnerKey();
  const cart = dbState.cartsByOwner[key] || [];
  const couponCode = dbState.couponsByOwner[key] || null;
  const coupon = couponCode ? COUPON_CATALOG[couponCode] : null;

  let subtotalWei = 0n;
  let royaltyWei = 0n;
  const versionSnapshot: Record<string, number> = {};
  let staleReason: MultiCurrencyQuote['staleReason'];

  const items = cart
    .map((entry) => {
      const nft = dbState.nfts.find((n) => n.id === entry.nftId);
      const ed = nft?.editions.find((e) => e.editionId === entry.editionId);
      if (!nft || !ed) return null;
      const unitWei = parseEthToWei(ed.priceEth);
      const lineWei = unitWei * BigInt(entry.quantity);
      subtotalWei += lineWei;
      royaltyWei += (lineWei * BigInt(nft.royaltyBps || 500)) / 10000n;
      versionSnapshot[`${nft.id}:${ed.editionId}`] = nft.version;

      if (ed.availableSupply === 0) staleReason = 'EDITION_SOLD_OUT';
      else if (entry.quantity > ed.availableSupply) staleReason = 'INSUFFICIENT_STOCK';
      else if (entry.addedVersion < nft.version) staleReason = 'PRICE_CHANGED';

      return {
        nftId: nft.id,
        code: nft.code,
        editionId: ed.editionId,
        editionLabel: ed.label,
        standard: ed.standard,
        title: nft.title,
        creatorHandle: nft.creatorHandle,
        quantity: entry.quantity,
        unitPriceEth: ed.priceEth,
        lineSubtotalEth: formatWeiToEth(lineWei),
        availableSupply: ed.availableSupply,
        maxPerCollector: ed.maxPerCollector,
        nftVersion: nft.version
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const discountWei = coupon && !coupon.expired ? (subtotalWei * BigInt(coupon.discountBps)) / 10000n : 0n;
  const netWei = subtotalWei > discountWei ? subtotalWei - discountWei : 0n;
  const feeWei = items.length > 0 ? parseEthToWei(NETWORK_FEE_ETH) : 0n;
  const totalWei = netWei + feeWei;
  const totalBrlCents = weiToBrlCents(totalWei);
  const rewardWei = totalWei / 20n;

  return {
    quoteId: nextId('qt'),
    items,
    couponCode,
    subtotalEth: formatWeiToEth(subtotalWei),
    discountEth: formatWeiToEth(discountWei),
    creatorRoyaltyEth: formatWeiToEth(royaltyWei),
    networkFeeEth: formatWeiToEth(feeWei),
    totalEth: formatWeiToEth(totalWei),
    exchangeRateBrlPerEth: EXCHANGE_RATE_BRL_PER_ETH,
    totalBrlCents,
    totalBrlFormatted: formatBrlCents(totalBrlCents),
    totalKrnFormatted: weiToKrnFormatted(netWei + feeWei / 2n),
    krnRewardEarned: weiToKrnFormatted(rewardWei),
    isStale: Boolean(staleReason),
    staleReason,
    versionSnapshot,
    expiresAt: Date.now() + QUOTE_TTL_MS
  };
}

export async function createNewMintedArtifact(input: MintArtifactInput): Promise<NftArtifact> {
  const priceWei = parseEthToWei(input.priceEth || '0.250000000000000000');
  const nextNumber = dbState.nfts.length + 1;
  const id = `k-${String(nextNumber).padStart(3, '0')}`;
  const code = `K—${String(nextNumber).padStart(3, '0')}`;
  const mediaBytes = input.mediaDataUrl ? Uint8Array.from(atob(input.mediaDataUrl.split(',')[1] || ''), char => char.charCodeAt(0)) : new TextEncoder().encode(JSON.stringify(input.recipe));
  const digest = await crypto.subtle.digest('SHA-256', mediaBytes);
  const sha = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const cid = generateIpfsCid(sha);
  const sig = signEip712MintVoucher(sha, priceWei.toString());
  const formattedPrice = formatWeiToEth(priceWei);
  const finalSupply = input.standard === 'ERC-721' ? 1 : Math.max(1, Math.min(100, input.totalSupply));

  const editions: NftArtifact['editions'] = [
    {
      editionId: input.standard === 'ERC-721' ? 'genesis' : 'study',
      label: input.standard === 'ERC-721' ? 'Original 1/1' : 'Edição de Artista',
      standard: input.standard,
      priceEth: formattedPrice,
      totalSupply: finalSupply,
      availableSupply: finalSupply,
      maxPerCollector: input.standard === 'ERC-721' ? 1 : Math.min(finalSupply, input.maxPerCollector || 3)
    }
  ];

  const created: NftArtifact = {
    id,
    code,
    slug: input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: input.title.trim(),
    collectionName: input.collectionName.trim() || 'Arquivo Autoral 2026',
    creatorHandle: input.creatorHandle.trim() || '@maya.collector',
    creatorAddress: '0x71C9...9A21',
    category: input.category,
    description: input.description.trim(),
    mediaUrl: input.mediaDataUrl,
    ipfsCid: cid,
    sha256Hash: sha,
    eip712Signature: sig,
    royaltyBps: input.royaltyBps ?? 500,
    recipe: input.recipe,
    editions,
    floorPriceEth: formattedPrice,
    favoritesCount: 1,
    version: 1,
    updatedAt: new Date().toISOString()
  };

  dbState.nfts.unshift(created);
  persistDb();
  return created;
}

export function applyMockNftUpdate(
  nftId: string,
  editionId: string,
  newPriceEth: EthDecimalString,
  newAvailableSupply: number,
  version: number,
  eventId: string
): boolean {
  if (dbState.processedEventIds.includes(eventId)) return false;
  const nft = dbState.nfts.find((n) => n.id === nftId);
  const ed = nft?.editions.find((e) => e.editionId === editionId);
  if (!nft || !ed) return false;
  if (version <= nft.version) return false;

  ed.priceEth = formatWeiToEth(parseEthToWei(newPriceEth));
  ed.availableSupply = Math.max(0, Math.min(ed.totalSupply, newAvailableSupply));
  nft.version = version;
  nft.updatedAt = new Date().toISOString();
  nft.floorPriceEth = computeFloor(nft.editions);
  dbState.processedEventIds.push(eventId);
  persistDb();
  return true;
}

export function executeMockOrderSettlement(
  quote: MultiCurrencyQuote,
  paymentRail: PaymentRail,
  idempotencyKey: string,
  outcome: 'PENDING' | 'CONFIRMED' | 'REFUSED',
  collector?: { name: string; email: string; walletId: string }
): { order: OrderReceiptSnapshot; replayed: boolean } {
  const user = getCurrentUser();
  if (!user) {
    const err = new Error('Autentique-se para finalizar o pedido.') as Error & { code?: string };
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const fail = (code: string, message: string): never => { throw Object.assign(new Error(message), { code }); };
  if (!idempotencyKey.trim()) fail('VALIDATION_ERROR', 'Idempotency-Key obrigatória.');
  if (!['stripe-card', 'stripe-pix', 'web3-eth', 'web3-krn'].includes(paymentRail)) fail('VALIDATION_ERROR', 'Método de pagamento inválido.');
  const fp = JSON.stringify({ paymentRail, items: quote.items, total: quote.totalEth, subtotal: quote.subtotalEth, discount: quote.discountEth, fee: quote.networkFeeEth, coupon: quote.couponCode, collector });
  const recordKey = `${user.id}:${idempotencyKey}`;
  const existing = dbState.idempotencyRecords[recordKey];
  let pendingOrder: OrderReceiptSnapshot | undefined;
  if (existing) {
    if (existing.fingerprint !== fp) {
      const err = new Error('Conflito 409: Esta Idempotency-Key já foi usada para um pedido diferente.') as Error & { code?: string };
      err.code = 'IDEMPOTENCY_CONFLICT';
      throw err;
    }
    const prevOrder = dbState.orders.find((o) => o.orderId === existing.orderId);
    if (prevOrder) {
      if (prevOrder.status === 'PENDING' && outcome !== 'PENDING') {
        pendingOrder = prevOrder;
      } else {
      return { order: prevOrder, replayed: true };
      }
    }
  }

  if (!quote.items.length) fail('VALIDATION_ERROR', 'O carrinho está vazio.');
  const chosenWallet = collector ? user.wallets.find(w => w.id === collector.walletId) : user.wallets.find(w => w.isPrimary);
  if (collector && (collector.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email))) fail('VALIDATION_ERROR', 'Revise nome e e-mail do colecionador.');
  if (collector && !chosenWallet) fail('VALIDATION_ERROR', 'Selecione uma carteira de recebimento.');
  if (paymentRail.startsWith('web3') && (!chosenWallet || chosenWallet.status !== 'CONNECTED')) fail('WALLET_NOT_CONNECTED', 'Conecte sua carteira para pagar via Web3.');
  if (quote.expiresAt <= Date.now()) fail('STALE_QUOTE', 'Cotação expirada. Atualize e confirme os valores.');
  const authoritative = buildQuoteForCurrentOwner();
  if (!pendingOrder && (authoritative.isStale || JSON.stringify(authoritative.items) !== JSON.stringify(quote.items) || authoritative.totalEth !== quote.totalEth || authoritative.couponCode !== quote.couponCode || authoritative.subtotalEth !== quote.subtotalEth || authoritative.discountEth !== quote.discountEth || authoritative.networkFeeEth !== quote.networkFeeEth)) fail('STALE_QUOTE', 'A cotação mudou. Atualize e confirme os valores.');
  const tokenCharge = (parseEthToWei(quote.subtotalEth) - parseEthToWei(quote.discountEth) + parseEthToWei(quote.networkFeeEth) / 2n) * 250000n / 1000000000000000000n;
  if (paymentRail === 'web3-eth' && parseEthToWei(user.ethBalance) < parseEthToWei(quote.totalEth)) fail('INSUFFICIENT_BALANCE', 'Saldo ETH insuficiente.');
  if (paymentRail === 'web3-krn' && BigInt(dbState.users[user.id]!.krnUnits) < tokenCharge) fail('INSUFFICIENT_BALANCE', 'Saldo KRN insuficiente.');
  // Validate against current catalog state
  for (const item of quote.items) {
    const nft = dbState.nfts.find((n) => n.id === item.nftId);
    const ed = nft?.editions.find((e) => e.editionId === item.editionId);
    if (!nft || !ed || ed.availableSupply < item.quantity || parseEthToWei(ed.priceEth) !== parseEthToWei(item.unitPriceEth) || nft.version !== item.nftVersion) {
      const err = new Error('A cotação está desatualizada. Revalide os valores antes de confirmar.') as Error & { code?: string };
      err.code = 'STALE_QUOTE';
      throw err;
    }
  }

  const nowIso = new Date().toISOString();
  const piId = paymentRail.startsWith('stripe') ? `pi_3Kronos_${deterministicHex(idempotencyKey, 12)}` : null;
  const orderId = `ord_${deterministicHex(`order:${user.id}:${idempotencyKey}`, 10)}`;

  const order: OrderReceiptSnapshot = {
    orderId,
    status: outcome,
    idempotencyKey,
    userId: user.id,
    collectorName: collector?.name || user.name,
    collectorEmail: collector?.email || user.email,
    walletAddress: chosenWallet?.address || 'Sem carteira selecionada',
    network: chosenWallet?.network || 'ethereum-mainnet',
    paymentRail,
    stripePaymentIntentId: piId,
    txHash: outcome === 'CONFIRMED' ? `0x${deterministicHex(`tx:${orderId}`, 64)}` : null,
    items: quote.items.map((item) => ({
      nftId: item.nftId,
      code: item.code,
      editionId: item.editionId,
      editionLabel: item.editionLabel,
      standard: item.standard,
      title: item.title,
      quantity: item.quantity,
      lockedUnitPriceEth: item.unitPriceEth,
      lockedLineTotalEth: item.lineSubtotalEth
    })),
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
    totalBrlFormatted: quote.totalBrlFormatted,
    krnRewardEarned: outcome === 'CONFIRMED' ? quote.krnRewardEarned : '0,00 KRN',
    failureReason: outcome === 'REFUSED' ? 'Transação recusada pelo emissor / simulação de falha.' : undefined,
    version: outcome === 'PENDING' ? 1 : 2,
    createdAt: pendingOrder?.createdAt || nowIso,
    updatedAt: nowIso
  };

  if (outcome === 'CONFIRMED') {
    for (const item of order.items) {
      const nft = dbState.nfts.find((n) => n.id === item.nftId);
      const ed = nft?.editions.find((e) => e.editionId === item.editionId);
      if (nft && ed) {
        ed.availableSupply = Math.max(0, ed.availableSupply - item.quantity);
        nft.version += 1;
        nft.updatedAt = nowIso;
        nft.floorPriceEth = computeFloor(nft.editions);
      }
    }
    const ownerCart = dbState.cartsByOwner[getOwnerKey()] || [];
    for (const purchased of order.items) {
      const idx = ownerCart.findIndex((c) => c.nftId === purchased.nftId && c.editionId === purchased.editionId);
      if (idx !== -1) {
        if (ownerCart[idx]!.quantity <= purchased.quantity) ownerCart.splice(idx, 1);
        else ownerCart[idx]!.quantity -= purchased.quantity;
      }
    }
    const dbUser = dbState.users[user.id];
    if (dbUser) {
      if (paymentRail === 'web3-eth') dbUser.ethBalance = formatWeiToEth(parseEthToWei(dbUser.ethBalance) - parseEthToWei(quote.totalEth));
      if (paymentRail === 'web3-krn') dbUser.krnUnits -= Number(tokenCharge);
      dbUser.krnUnits += Number((parseEthToWei(quote.totalEth) / 20n) * 250000n / 1000000000000000000n);
    }
  }

  dbState.orders = dbState.orders.filter(o => o.orderId !== order.orderId);
  dbState.orders.unshift(order);
  dbState.idempotencyRecords[recordKey] = {
    key: idempotencyKey,
    fingerprint: fp,
    orderId: order.orderId,
    paymentIntentId: piId || ''
  };
  if (piId) dbState.paymentIntents[piId] = {
    paymentIntentId: piId, clientSecret: `${piId}_secret_mock`, amountCents: quote.totalBrlCents,
    currency: 'brl', rail: paymentRail as 'stripe-pix' | 'stripe-card', status: outcome === 'CONFIRMED' ? 'succeeded' : outcome === 'PENDING' ? 'processing' : 'canceled',
    idempotencyKey, createdAt: nowIso
  };
  persistDb();
  return { order, replayed: false };
}
