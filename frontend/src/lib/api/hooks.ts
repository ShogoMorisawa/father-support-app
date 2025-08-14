'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
// openapi-typescript で生成される型
import type { components, paths } from './types';

type DeliveriesResp =
  paths['/deliveries']['get']['responses']['200']['content']['application/json'];
type CompleteResp =
  paths['/projects/{id}/complete']['post']['responses']['200']['content']['application/json'];
type HistoryItemUI = components['schemas']['HistoryItem'];
type HistoryRespUI = { ok: boolean; data: { items: HistoryItemUI[] }; correlationId?: string };

export function useDeliveries() {
  return useQuery({
    queryKey: ['deliveries', 'pending'],
    queryFn: () => api.get<DeliveriesResp>('/api/deliveries?status=pending&order=date.asc'),
  });
}

export function useHistory(limit = 10) {
  return useQuery({
    queryKey: ['history', limit],
    queryFn: () => api.get<HistoryRespUI>(`/api/history?limit=${limit}`),
  });
}

export function useUndoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      // inverse.path をそのままPOST（payloadがあれば第2引数に渡す設計にも対応可能）
      return api.post<{ ok: boolean; data?: { reverted?: boolean; message?: string } }>(
        path,
        undefined,
      );
    },
    onSuccess: () => {
      // 履歴と在庫/納品リストの再取得
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}

export function useCompleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      return api.post<CompleteResp>(
        `/projects/${projectId}/complete`,
        {
          // DB=UTC, UI=JST の原則。サーバはUTCで受け取る。 :contentReference[oaicite:6]{index=6}
          completedAt: new Date().toISOString(),
        },
        {
          'Content-Type': 'application/json',
        },
      );
    },
    onSuccess: () => {
      // 完了→在庫・納品・履歴に影響するため、関係キャッシュを刷新
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] }); // 後続で実装
    },
  });
}
