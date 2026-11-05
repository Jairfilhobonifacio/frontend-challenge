import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CollectorUser, NftArtifact } from '@/contracts/kronos.types';
import { apiClient } from '@/lib/api-client';

type FavoriteNft = NftArtifact & { isFavorited?: boolean };
export function useFavorite(onToast: (message: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<{ isFavorited: boolean }>(`/favorites/${id}`)).data,
    onMutate: async id => {
      const userId = client.getQueryData<CollectorUser | null>(['session'])?.id;
      await Promise.all([client.cancelQueries({ queryKey: ['nfts'] }), client.cancelQueries({ queryKey: ['nft'] })]);
      const catalog = client.getQueriesData<{ items: FavoriteNft[] }>({ queryKey: ['nfts'] });
      const details = client.getQueriesData<FavoriteNft>({ queryKey: ['nft'] });
      const update = (n: FavoriteNft) => n.id === id ? { ...n, isFavorited: !n.isFavorited, favoritesCount: n.favoritesCount + (n.isFavorited ? -1 : 1) } : n;
      client.setQueriesData<{ items: FavoriteNft[] }>({ queryKey: ['nfts'] }, data => data ? { ...data, items: data.items.map(update) } : data);
      client.setQueriesData<FavoriteNft>({ queryKey: ['nft'] }, data => data ? update(data) : data);
      return { catalog, details, userId };
    },
    onError: (_error, _id, previous) => {
      if (previous?.userId === client.getQueryData<CollectorUser | null>(['session'])?.id) {
        previous?.catalog.forEach(([key, data]) => client.setQueryData(key, data));
        previous?.details.forEach(([key, data]) => client.setQueryData(key, data));
      }
      onToast('Erro ao salvar favorito. Estado anterior restaurado (rollback).');
    },
    onSuccess: data => {
      for (const key of ['nfts', 'nft', 'session']) void client.invalidateQueries({ queryKey: [key] });
      onToast(data.isFavorited ? 'Obra salva nos favoritos.' : 'Obra removida dos favoritos.');
    }
  });
}
