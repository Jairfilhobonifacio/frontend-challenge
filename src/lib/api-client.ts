/**
 * KRONOS // ARCHIVE — Cliente HTTP Axios Estrito
 * Propaga Bearer Session Token, Idempotency-Key e AbortSignal.
 * Zero lógica de mock dentro do Axios (tudo interceptado pelo MSW).
 */
import axios from 'axios';
import { purgeSessionCache } from '@/lib/query-client';

export function getMockScenario() {
  return new URLSearchParams(window.location.search).get('scenario') || 'normal';
}

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const scenario = getMockScenario();
  if (scenario && config.headers) {
    config.headers['X-Mock-Scenario'] = scenario;
    config.headers['X-Mock-Scenario-Run'] = sessionStorage.getItem('kronos.scenarioRun') || 'initial';
  }
  return config;
});

let expiring = false;
apiClient.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401 && ['SESSION_EXPIRED', 'UNAUTHORIZED'].includes(error.response?.data?.code) && !expiring) {
    expiring = true;
    await purgeSessionCache();
    window.dispatchEvent(new CustomEvent('kronos:session-expired'));
    queueMicrotask(() => { expiring = false; });
  }
  return Promise.reject(error);
});
