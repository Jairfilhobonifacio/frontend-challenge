/**
 * KRONOS // ARCHIVE — Contratos TypeScript Ponta a Ponta (Production Spec)
 * Cobre: Catálogo, Minting Studio (EIP-712 / IPFS), Carrinho Multi-Item,
 * Oráculo ETH/BRL/$KRN, Gateway Stripe (PaymentIntents + PIX/Cartão) e Socket.IO.
 */

export type EthDecimalString = string; // Ex: "1.250000000000000000" (18 casas, Wei BigInt)
export type TokenStandard = 'ERC-721' | 'ERC-1155';
export type NetworkChain = 'ethereum-mainnet' | 'base-mainnet' | 'arbitrum-one' | 'zora-network';
export type PaymentRail = 'stripe-card' | 'stripe-pix' | 'web3-eth' | 'web3-krn';

export interface GenerativeRecipe {
  algorithm: 'lissajous-ribbon' | 'brutalist-slabs' | 'zk-interference' | 'orbital-copper' | 'strata-memory' | 'cobalt-afterimage';
  seedHex: string;
  complexity: number;
  accentHue: number;
}

export interface NftEdition {
  editionId: string;
  label: string;
  standard: TokenStandard;
  priceEth: EthDecimalString;
  totalSupply: number;
  availableSupply: number;
  maxPerCollector: number;
}

export interface NftArtifact {
  id: string;
  code: string; // Ex: "K—001"
  slug: string;
  title: string;
  collectionName: string;
  creatorHandle: string;
  creatorAddress: string;
  category: 'generative' | 'monolith' | 'zero-knowledge';
  description: string;
  mediaUrl: string;
  ipfsCid: string;
  sha256Hash: string;
  eip712Signature: string;
  royaltyBps: number; // Ex: 500 = 5.00%
  recipe?: GenerativeRecipe;
  editions: NftEdition[];
  floorPriceEth: EthDecimalString;
  favoritesCount: number;
  version: number;
  updatedAt: string;
}

export interface MintArtifactInput {
  title: string;
  collectionName: string;
  creatorHandle: string;
  category: 'generative' | 'monolith' | 'zero-knowledge';
  description: string;
  standard: TokenStandard;
  priceEth: EthDecimalString;
  totalSupply: number;
  maxPerCollector: number;
  royaltyBps: number;
  recipe: GenerativeRecipe;
  mediaDataUrl: string;
}

export interface CartLineItem {
  nftId: string;
  code: string;
  editionId: string;
  editionLabel: string;
  standard: TokenStandard;
  title: string;
  creatorHandle: string;
  quantity: number;
  unitPriceEth: EthDecimalString;
  lineSubtotalEth: EthDecimalString;
  availableSupply: number;
  maxPerCollector: number;
  nftVersion: number;
}

export interface MultiCurrencyQuote {
  quoteId: string;
  items: CartLineItem[];
  couponCode: string | null;
  subtotalEth: EthDecimalString;
  discountEth: EthDecimalString;
  creatorRoyaltyEth: EthDecimalString;
  networkFeeEth: EthDecimalString;
  totalEth: EthDecimalString;
  /** Conversão travada pelo Oráculo para o Gateway Stripe (Centavos Inteiros de BRL) */
  exchangeRateBrlPerEth: number;
  totalBrlCents: number;
  totalBrlFormatted: string;
  /** Conversão para o Token de Curadoria $KRN (1 ETH = 2500 KRN, com 50% off na taxa de rede) */
  totalKrnFormatted: string;
  krnRewardEarned: string;
  isStale: boolean;
  staleReason?: 'PRICE_CHANGED' | 'EDITION_SOLD_OUT' | 'INSUFFICIENT_STOCK' | 'QUOTE_EXPIRED';
  versionSnapshot: Record<string, number>;
  expiresAt: number;
}

export interface StripePaymentIntentSimulation {
  paymentIntentId: string; // Ex: "pi_3Kronos99a8b7c6"
  clientSecret: string;
  amountCents: number;
  currency: 'brl';
  rail: 'stripe-card' | 'stripe-pix';
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'canceled';
  pixQrCodePayload?: string;
  cardLast4?: string;
  idempotencyKey: string;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'REFUSED';

export interface OrderReceiptSnapshot {
  orderId: string;
  status: OrderStatus;
  idempotencyKey: string;
  userId: string;
  collectorName: string;
  collectorEmail: string;
  walletAddress: string;
  network: NetworkChain;
  paymentRail: PaymentRail;
  stripePaymentIntentId: string | null;
  txHash: string | null;
  items: Array<{
    nftId: string;
    code: string;
    editionId: string;
    editionLabel: string;
    standard: TokenStandard;
    title: string;
    quantity: number;
    lockedUnitPriceEth: EthDecimalString;
    lockedLineTotalEth: EthDecimalString;
  }>;
  subtotalEth: EthDecimalString;
  discountEth: EthDecimalString;
  networkFeeEth: EthDecimalString;
  totalEth: EthDecimalString;
  totalBrlFormatted: string;
  krnRewardEarned: string;
  failureReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectorWallet {
  id: string;
  label: string;
  address: string;
  network: NetworkChain;
  isPrimary: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'REFUSED';
}

export interface CollectorUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  krnBalance: string;
  ethBalance: EthDecimalString;
  favorites: string[];
  wallets: CollectorWallet[];
}
