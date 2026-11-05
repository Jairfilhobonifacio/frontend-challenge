/**
 * KRONOS // ARCHIVE — MSW Browser Worker Setup (Ativo em Dev, E2E e Build de Demonstração)
 */
import { setupWorker } from 'msw/browser';
import { restHandlers } from '@/mocks/handlers.rest';
import { wsHandlers } from '@/mocks/handlers.ws';

export const worker = setupWorker(...restHandlers, ...wsHandlers);
