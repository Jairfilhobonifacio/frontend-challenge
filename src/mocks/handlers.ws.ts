import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import type { SocketRealtimeEvent } from '@/lib/socket-client';
import { getCurrentUser } from '@/mocks/db';
const stream = ws.link(/^wss?:\/\/[^/:]+(?::\d+)?(?:\/.*)?$/);
const connections = new Set<{ io: ReturnType<typeof toSocketIo>; userId: string | null; ready: boolean }>();
export const wsHandlers = [stream.addEventListener('connection', connection => {
  const io = toSocketIo(connection);
  const entry = { io, userId: getCurrentUser()?.id ?? null, ready: false };
  connections.add(entry);
  io.client.on('subscribe', (_event, userId: string | null) => {
    entry.userId = userId === getCurrentUser()?.id ? userId : null;
    entry.ready = true;
  });
  const heartbeat = setInterval(() => connection.client.send('2'), 20000);
  connection.client.addEventListener('close', () => { clearInterval(heartbeat); connections.delete(entry); });
})];
export function publishMockSocketEvent(event: SocketRealtimeEvent) {
  for (const entry of connections) if (entry.ready && (event.type !== 'order.updated' || event.userId === entry.userId)) entry.io.client.emit(event.type, event);
}
