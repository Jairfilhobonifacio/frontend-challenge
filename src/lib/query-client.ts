/**
 * KRONOS // ARCHIVE — TanStack Query Client + Purge de Isolamento Multi-Usuário
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      retry: false,
      refetchOnWindowFocus: false
    }
  }
});

/**
 * Critério Eliminatório: Limpa 100% dos dados privados em memória no Logout ou Troca de Usuário.
 */
export async function purgeSessionCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}
