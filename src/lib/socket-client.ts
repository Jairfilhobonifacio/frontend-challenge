import { io, type Socket } from 'socket.io-client';
import type { MultiCurrencyQuote } from '@/contracts/kronos.types';
import { queryClient } from '@/lib/query-client';

export interface SocketRealtimeEvent {
  eventId: string;
  type: 'nft.updated' | 'order.updated';
  nftId?: string;
  editionId?: string;
  newPriceEth?: string;
  newAvailableSupply?: number;
  orderId?: string;
  userId?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'REFUSED';
  txHash?: string | null;
  version: number;
  emittedAt: string;
}
const processed = new Set<string>();
const versions = new Map<string, number>();
const subscribers = new Set<(event: SocketRealtimeEvent) => void>();
export let socketInstance: Socket | null = null;
let owner: string | null = null;
export type RealtimeStatus = 'connecting' | 'connected' | 'rest-fallback';
let status: RealtimeStatus = 'connecting';
const statusListeners = new Set<() => void>();
export const getRealtimeStatus = () => status;
export function subscribeRealtimeStatus(listener: () => void) { statusListeners.add(listener); return () => { statusListeners.delete(listener); }; }
function setStatus(next: RealtimeStatus) { status = next; statusListeners.forEach(fn => fn()); }
function reconcile() {
  for (const key of ['nfts', 'nft', 'cart', 'orders']) void queryClient.invalidateQueries({ queryKey: [key] });
}
export function connectRealtimeSocket(userId: string | null): () => void {
  disconnectRealtimeSocket();
  owner = userId;
  setStatus('connecting');
  const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'], reconnection: true, timeout: 2000 });
  socketInstance = socket;
  socket.on('connect', () => { socket.emit('subscribe', userId); setStatus('connected'); reconcile(); });
  socket.on('connect_error', () => { setStatus('rest-fallback'); reconcile(); });
  socket.on('disconnect', () => setStatus('rest-fallback'));
  socket.on('nft.updated', handleIncomingSocketEvent);
  socket.on('order.updated', handleIncomingSocketEvent);
  const fallback = window.setInterval(() => { if (!socket.connected) reconcile(); }, 4000);
  return () => { clearInterval(fallback); if (socketInstance === socket) disconnectRealtimeSocket(); };
}
export function disconnectRealtimeSocket() {
  socketInstance?.removeAllListeners(); socketInstance?.disconnect(); socketInstance = null;
  processed.clear(); versions.clear();
}
export function handleIncomingSocketEvent(event: SocketRealtimeEvent): boolean {
  if (!event?.eventId || processed.has(event.eventId) || (event.type === 'order.updated' && event.userId !== owner)) return false;
  const key = event.type === 'nft.updated' ? `nft:${event.nftId}` : `order:${event.orderId}`;
  if (!Number.isSafeInteger(event.version) || event.version <= (versions.get(key) ?? 0)) return false;
  processed.add(event.eventId); versions.set(key, event.version);
  if (processed.size > 1000) processed.delete(processed.values().next().value!);
  if (event.type === 'nft.updated') queryClient.setQueriesData<MultiCurrencyQuote>({ queryKey: ['cart'] }, quote => {
    if (!quote || !quote.items.some(i => i.nftId === event.nftId && i.nftVersion < event.version)) return quote;
    return { ...quote, isStale: true, staleReason: event.newAvailableSupply === 0 ? 'EDITION_SOLD_OUT' : 'PRICE_CHANGED' };
  });
  reconcile(); subscribers.forEach(fn => fn(event)); return true;
}
export function subscribeRealtimeEvents(cb: (event: SocketRealtimeEvent) => void) { subscribers.add(cb); return () => { subscribers.delete(cb); }; }
