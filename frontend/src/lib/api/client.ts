import axios, { InternalAxiosRequestConfig } from 'axios';

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

function stripApiPrefix(url: string) {
  // バックエンドのAPIを使用するため、/apiプレフィックスを削除
  return url.replace(/^\/api(\/|$)/, '/');
}

function genIdemKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const api = axios.create({
  baseURL: BASE, // バックエンドのURL: http://localhost:3000
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) config.url = stripApiPrefix(config.url);
  const method = (config.method || 'get').toUpperCase();
  if (method !== 'GET') {
    if (!config.headers) config.headers = {} as any;
    if (!('X-Idempotency-Key' in config.headers)) {
      (config.headers as any)['X-Idempotency-Key'] = genIdemKey();
    }
  }
  return config;
});

export async function callInverse(inverse: { method: string; path: string; payload?: any }) {
  const url = stripApiPrefix(inverse.path);
  return api.request({
    url,
    method: inverse.method.toLowerCase() as any,
    data: inverse.payload ?? {},
  });
}
