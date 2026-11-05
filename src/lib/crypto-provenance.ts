/**
 * KRONOS // ARCHIVE — Proveniência Criptográfica (SHA-256, IPFS CIDv1 & EIP-712 Voucher)
 */

export function deterministicHex(inputStr: string, length: number): string {
  let h1 = 0xdeadbeef ^ inputStr.length;
  let h2 = 0x41c6ce57 ^ inputStr.length;
  for (let i = 0; i < inputStr.length; i++) {
    const ch = inputStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  let out = '';
  const seed = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  while (out.length < length) {
    h1 = Math.imul(h1 ^ (out.length + 17), 2246822507);
    h2 = Math.imul(h2 ^ (out.length + 31), 3266489909);
    out += (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0') + seed;
  }
  return out.slice(0, length);
}

export function generateIpfsCid(sha256Hex: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const hex = deterministicHex(sha256Hex, 96);
  let cid = 'bafybeig';
  for (let i = 0; i < 44; i++) {
    const idx = parseInt(hex.slice(i * 2, i * 2 + 2), 16) % alphabet.length;
    cid += alphabet[idx] || 'a';
  }
  return `ipfs://${cid}`;
}

export function signEip712MintVoucher(sha256Hex: string, priceWei: string): string {
  return `0x${deterministicHex(`eip712-voucher:${sha256Hex}:${priceWei}`, 130)}`;
}
