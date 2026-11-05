/**
 * KRONOS // ARCHIVE — Motor de Precisão Fixa em ETH (Wei BigInt 18 Casas)
 * & Oráculo de Conversão Multi-Moeda (ETH <-> Stripe BRL Cents <-> Token $KRN)
 */
import type { EthDecimalString } from '@/contracts/kronos.types';

export const WEI_SCALE = 1000000000000000000n; // 10^18 Wei = 1 ETH
export const NETWORK_FEE_ETH: EthDecimalString = '0.003000000000000000';
export const ZERO_ETH: EthDecimalString = '0.000000000000000000';
export const EXCHANGE_RATE_BRL_PER_ETH = 15200; // R$ 15.200,00 / ETH
export const KRN_PER_ETH = 2500n; // 1 ETH = 2.500,00 KRN

export function parseEthToWei(value: EthDecimalString): bigint {
  const clean = String(value || '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(clean)) {
    throw new Error('Informe ETH como string decimal válida (até 18 casas).');
  }
  const parts = clean.split('.');
  const whole = BigInt(parts[0] || '0');
  const fraction = BigInt((parts[1] || '').padEnd(18, '0'));
  return whole * WEI_SCALE + fraction;
}

export function formatWeiToEth(wei: bigint): EthDecimalString {
  if (wei < 0n) {
    throw new Error('Valor em Wei não pode ser negativo.');
  }
  const whole = (wei / WEI_SCALE).toString();
  const fraction = (wei % WEI_SCALE).toString().padStart(18, '0');
  return `${whole}.${fraction}`;
}

export function formatShortEth(ethStr: EthDecimalString): string {
  const wei = parseEthToWei(ethStr);
  const full = formatWeiToEth(wei);
  const [whole, decPart = '000'] = full.split('.');
  const trimmed = decPart.slice(0, 4).replace(/0+$/, '');
  const finalDec = trimmed.length >= 3 ? trimmed : decPart.slice(0, 3);
  return `${whole}.${finalDec} ETH`;
}

export function weiToBrlCents(wei: bigint): number {
  const rateCents = BigInt(EXCHANGE_RATE_BRL_PER_ETH * 100);
  return Number((wei * rateCents) / WEI_SCALE);
}

export function formatBrlCents(cents: number): string {
  const reais = (cents / 100).toFixed(2).replace('.', ',');
  const [intPart = '0', decPart = '00'] = reais.split(',');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withThousands},${decPart}`;
}

export function weiToKrnFormatted(wei: bigint): string {
  const krnCents = (wei * KRN_PER_ETH) / (WEI_SCALE / 100n);
  const whole = (krnCents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = (krnCents % 100n).toString().padStart(2, '0');
  return `${whole},${frac} KRN`;
}
