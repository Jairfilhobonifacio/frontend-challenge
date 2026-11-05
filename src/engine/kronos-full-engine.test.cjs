const assert = require('node:assert/strict');
require('./kronos-full-engine.js');

const E = globalThis.KronosEngine;
E.resetToDeterministicSeed();

// 1. ETH Fixed-Point & Multi-Currency Oracle Check
const w1 = E.parseEthToWei('0.100000000000000000');
const w2 = E.parseEthToWei('0.200000000000000000');
assert.equal(E.formatWeiToEth(w1 + w2), '0.300000000000000000');
assert.equal(E.weiToBrlCents(E.parseEthToWei('1.000000000000000000')), 1520000);

// 2. Minting Unique NFT Check (SHA-256 + IPFS CID + EIP-712 Voucher)
const minted = E.mintArtifact({
  title: 'Hyperbolic Time Chamber 007',
  collectionName: 'Temporal Studies',
  creatorHandle: '@maya.lin',
  category: 'generative',
  description: 'Obra cunhada em teste automatizado.',
  standard: 'ERC-721',
  priceEth: '1.500000000000000000',
  totalSupply: 1,
  maxPerCollector: 1,
  royaltyBps: 750
});
assert.equal(minted.code, 'K—007');
assert.ok(minted.ipfsCid.startsWith('ipfs://bafybeig'));
assert.equal(minted.sha256Hash.length, 64);
assert.ok(minted.eip712Signature.startsWith('0x'));

// 3. Cart, Coupon & Live Socket.IO Stale Quote Lock
E.resetToDeterministicSeed();
let quote = E.buildCartQuote();
assert.equal(quote.couponCode, 'KRONOS10');
assert.equal(quote.isStale, false);

// Emit live Socket.IO nft.updated on k-001 study edition
const applied = E.applyNftUpdatedEvent({
  eventId: 'evt-test-1',
  type: 'nft.updated',
  nftId: 'k-001',
  editionId: 'study',
  newPriceEth: '0.250000000000000000',
  newAvailableSupply: 11,
  version: 2,
  emittedAt: new Date().toISOString()
});
assert.equal(applied, true);

// Outdated event (version 2 <= 2) must be rejected
const rejected = E.applyNftUpdatedEvent({
  eventId: 'evt-test-2',
  type: 'nft.updated',
  nftId: 'k-001',
  editionId: 'study',
  newPriceEth: '9.990000000000000000',
  newAvailableSupply: 1,
  version: 2,
  emittedAt: new Date().toISOString()
});
assert.equal(rejected, false);

// Stale quote must block Stripe checkout until revalidated
assert.throws(() => {
  E.settleOrderExecution(quote, 'stripe-pix', 'idem_test_stale', 'CONFIRMED');
}, /STALE_QUOTE|cotação mudou/i);

// Accept updated quote and execute Stripe PIX settlement + Idempotent Replay
quote = E.acceptUpdatedCartQuote();
assert.equal(quote.isStale, false);
const res1 = E.settleOrderExecution(quote, 'stripe-pix', 'idem_stripe_001', 'CONFIRMED');
assert.equal(res1.order.status, 'CONFIRMED');
assert.equal(res1.replayed, false);

const res2 = E.settleOrderExecution(quote, 'stripe-pix', 'idem_stripe_001', 'CONFIRMED');
assert.equal(res2.order.orderId, res1.order.orderId);
assert.equal(res2.replayed, true);

// 4. Multi-User Session Isolation & Guest Cart Merge
E.switchSession(null); // Guest
E.addToCart('k-004', 'study', 2);
assert.equal(E.listUserOrders().length, 0); // Guest cannot see Maya's orders
E.switchSession('user-theo'); // Merge guest cart into Theo
assert.equal(E.listUserOrders().length, 0); // Theo cannot see Maya's orders!
assert.equal(E.buildCartQuote().items.length, 1);
assert.equal(E.buildCartQuote().items[0].nftId, 'k-004');

console.log('ALL E2E KRONOS ENGINE EVALS PASSED: ETH BigInt, Minting EIP-712/IPFS, Socket.IO Versioning, Stale Quote Lock, Stripe Idempotency & Multi-User Isolation.');
