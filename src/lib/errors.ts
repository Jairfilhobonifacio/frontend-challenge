import axios from 'axios';
export function errorMessage(error: unknown): string {
  return axios.isAxiosError(error) ? error.response?.data?.message || 'Não foi possível conectar. Tente novamente.' : error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}
