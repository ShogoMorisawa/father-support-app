'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, callInverse } from './client';

// ---- Dashboard
export function useDashboard(params?: {
  date?: string;
  estimatesLimit?: number;
  tasksLimit?: number;
  deliveriesLimit?: number;
  historyLimit?: number;
  lowLimit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (typeof params?.estimatesLimit === 'number')
    qs.set('estimatesLimit', String(params.estimatesLimit));
  if (typeof params?.tasksLimit === 'number') qs.set('tasksLimit', String(params.tasksLimit));
  if (typeof params?.deliveriesLimit === 'number')
    qs.set('deliveriesLimit', String(params.deliveriesLimit));
  if (typeof params?.historyLimit === 'number') qs.set('historyLimit', String(params.historyLimit));
  if (typeof params?.lowLimit === 'number') qs.set('lowLimit', String(params.lowLimit));
  const key = ['dashboard', qs.toString()];
  return useQuery({
    queryKey: key,
    queryFn: async () => api.get(`/dashboard?${qs.toString()}`).then((r) => r.data),
    refetchInterval: 60_000,
  });
}

// ---- History
export function useHistory(limit = 10) {
  return useQuery({
    queryKey: ['history', limit],
    queryFn: async () => api.get(`/history?limit=${limit}`).then((r: any) => r.data),
    refetchInterval: 60_000,
  });
}

// ---- Deliveries
export function useDeliveries(opts?: {
  status?: 'pending' | 'delivered' | 'cancelled' | 'all';
  order?: 'date.asc' | 'date.desc' | 'scheduled_at.asc' | 'scheduled_at.desc';
  limit?: number;
  enabled?: boolean;
}) {
  const status = opts?.status ?? 'pending';
  const order = opts?.order ?? 'date.asc';
  const limit = opts?.limit ?? 200;
  const enabled = opts?.enabled ?? true;
  const qs = new URLSearchParams();
  // 既定値でも「undefined」文字列は付けない
  if (status) qs.set('status', status);
  if (order) qs.set('order', order);
  if (typeof limit === 'number') qs.set('limit', String(limit));
  const qstr = qs.toString();
  return useQuery({
    queryKey: ['deliveries', qstr],
    queryFn: async () => api.get(`/deliveries?${qs.toString()}`).then((r) => r.data),
    enabled,
  });
}

export function useDeliveryDetail(id: number) {
  return useQuery({
    queryKey: ['delivery', id],
    enabled: !!id,
    queryFn: async () => api.get(`/deliveries/${id}`).then((r) => r.data),
    refetchOnWindowFocus: false,
  });
}

export function useTogglePrepared(deliveryId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { taskId: number; prepared: boolean }) =>
      api.post(`/deliveries/${deliveryId}/check`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] }); // ← 追加
    },
  });
}

export function useRevertDeliveryComplete(deliveryId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/deliveries/${deliveryId}/revert_complete`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useBulkShiftDeliveries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      days: number;
      status?: 'pending' | 'all';
      from?: string;
      to?: string;
      ids?: number[];
      reason?: string;
    }) => api.post(`/deliveries/bulk-shift`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

// TODO: 将来実装予定 - 納品完了エンドポイント
// export function useCompleteDelivery(deliveryId: number) {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: () => api.post(`/deliveries/${deliveryId}/complete`, {}).then((r) => r.data),
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ['delivery', deliveryId] });
//       qc.invalidateQueries({ queryKey: ['deliveries'] });
//       qc.invalidateQueries({ queryKey: ['dashboard'] });
//       qc.invalidateQueries({ queryKey: ['history'] });
//     },
//   });
// }

// ---- Tasks
export function useTasks(order: 'due.asc' | 'due.desc' = 'due.asc', limit = 200) {
  return useQuery({
    queryKey: ['tasks', order, limit],
    queryFn: async () => api.get(`/tasks?order=${order}&limit=${limit}`).then((r) => r.data),
  });
}

export function useCompleteTask(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/complete`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(); // 少し広めに無効化（在庫/履歴/ダッシュボード/納品詳細）
    },
  });
}

export function useRevertCompleteTask(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/revert-complete`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useTaskBulkCreate(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      deliveryOn: string;
      items: {
        title: string;
        kind?: string | null;
        materials?: {
          materialId?: number | null;
          materialName?: string | null;
          qtyPlanned?: number | null;
        }[];
      }[];
    }) => api.post(`/projects/${projectId}/tasks/bulk-create`, payload).then((r) => r.data),
    onSuccess: () => {
      // 影響範囲のみキャッシュ更新
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

// ---- Projects
export function useProjects(params?: {
  status?: 'active' | 'completed' | 'all';
  order?: 'due.asc' | 'due.desc' | 'completed.asc' | 'completed.desc';
  q?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.order) search.set('order', params.order);
  if (params?.q) search.set('q', params.q);
  if (params?.limit) search.set('limit', String(params.limit));
  return useQuery({
    queryKey: ['projects', Object.fromEntries(search)],
    queryFn: () => api.get(`/projects?${search.toString()}`).then((r) => r.data),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateProjectDates(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { projectDueOn?: string; deliveryOn?: string }) =>
      api.patch(`/projects/${projectId}/dates`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectHistory(projectId: number, params?: { limit?: number }) {
  const limit = params?.limit || 10;
  const search = new URLSearchParams();
  search.set('project_id', String(projectId));
  search.set('limit', String(limit));

  return useQuery({
    queryKey: ['project', 'history', projectId, limit],
    queryFn: () => api.get(`/history?${search.toString()}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

// ---- Completed Projects
export function useCompletedProjects(params?: {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  q?: string;
  order?: 'completed.desc' | 'completed.asc';
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.q && params.q.trim()) qs.set('q', params.q.trim());
  qs.set('order', params?.order ?? 'completed.desc');
  qs.set('limit', String(params?.limit ?? 100));
  const qstr = qs.toString();
  return useQuery({
    queryKey: ['projects', 'completed', qstr],
    queryFn: async () => api.get(`/projects/completed?${qstr}`).then((r) => r.data),
    refetchOnWindowFocus: false,
  });
}

// ---- Projects
export function useCompleteProject(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    // 実行時に completedAt を渡せるように
    mutationFn: (payload?: { completedAt?: string }) =>
      api
        .post(
          `/projects/${projectId}/complete`,
          payload?.completedAt ? { completedAt: payload.completedAt } : {},
        )
        .then((r) => r.data),
    onSuccess: () => {
      // 影響範囲のみ無効化（過剰な全体無効化は避ける）
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['delivery'] }); // 納品詳細のキャッシュも無効化
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useProjectPhotos(projectId: number) {
  return useQuery({
    queryKey: ['project', 'photos', projectId],
    enabled: !!projectId,
    queryFn: async () => api.get(`/projects/${projectId}/photos`).then((r) => r.data),
    refetchOnWindowFocus: false,
  });
}

/** presign + S3 PUT + attach をまとめて行うアップロード用フック */
export function useUploadProjectPhoto() {
  const qc = useQueryClient();
  return useMutation({
    // payload: { projectId, file, kind }
    mutationFn: async (payload: {
      projectId: number;
      file: File;
      kind: 'before' | 'after' | 'other';
    }) => {
      const { projectId, file, kind } = payload;

      // ファイル形式の事前チェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          '許可されていないファイル形式です。JPEG、PNG、GIF、WebPのみ対応しています。',
        );
      }

      // 1) presign
      const presignRes = await api
        .post(`/photos/presign`, {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          byteSize: file.size,
          scope: 'project',
          projectId,
        })
        .then((r) => r.data);

      if (!presignRes.ok) {
        throw new Error(presignRes.error?.message || 'presignに失敗しました');
      }

      const { url, headers, key } = presignRes.data;

      // 2) 直PUT（fetch 使用、Content-Typeはpresignのheadersをそのまま使用）
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: headers || {},
        body: file,
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        throw new Error(`S3アップロードに失敗しました（${putRes.status}） ${text}`.trim());
      }

      // 3) attach（メタ登録）
      const attachRes = await api
        .post(`/photos/attach`, {
          projectId,
          kind,
          blobKey: key,
          contentType: file.type || 'application/octet-stream',
          byteSize: file.size,
        })
        .then((r) => r.data);

      if (!attachRes.ok) {
        throw new Error(attachRes.error?.message || '写真の登録に失敗しました');
      }

      return attachRes?.data?.photo;
    },
    onSuccess: (_photo, vars) => {
      // 一覧＆履歴の更新
      qc.invalidateQueries({ queryKey: ['project', 'photos', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['projects', 'completed'] });
    },
  });
}

/** 写真の削除（/api/photos/detach）。inverse 用のUndoでも可 */
export function useDetachPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId }: { photoId: number }) =>
      api.post(`/photos/detach`, { photoId }).then((r) => r.data),
    onSuccess: (_res, _vars, _ctx) => {
      // 呼び出し元で invalidate したいプロジェクトIDが分かるよう、
      // mutate({ photoId, projectId }) の形式で使うのがおすすめ
    },
  });
}

export function useRevertComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.post(`/projects/${id}/revert-complete`, {}).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects', 'completed'] });
    },
  });
}

// ---- Materials
export function useMaterials(
  order: 'name.asc' | 'name.desc' | 'qty.asc' | 'qty.desc' = 'name.asc',
  limit = 200,
) {
  return useQuery({
    queryKey: ['materials', order, limit],
    queryFn: async () => api.get(`/materials?order=${order}&limit=${limit}`).then((r) => r.data),
  });
}

export function useLowMaterials() {
  return useQuery({
    queryKey: ['materials', 'low'],
    queryFn: async () => api.get(`/materials/low`).then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useReceiveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity, note }: { id: number; quantity: number; note?: string }) =>
      api.post(`/materials/${id}/receive`, { quantity, note }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['materials', 'low'] });
    },
  });
}

// ---- Customers
export function useCustomerSearch(q: string, limit = 20) {
  return useQuery({
    queryKey: ['customers', 'search', q, limit],
    enabled: q.trim().length > 0,
    queryFn: async () =>
      api.get(`/customers/search?q=${encodeURIComponent(q)}&limit=${limit}`).then((r) => r.data),
  });
}

export function useCustomers(
  order: 'name.asc' | 'name.desc' | 'created.desc' | 'last_activity.desc' = 'name.asc',
  limit = 200,
) {
  return useQuery({
    queryKey: ['customers', 'index', order, limit],
    queryFn: async () => api.get(`/customers?order=${order}&limit=${limit}`).then((r) => r.data),
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => api.get(`/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.post(`/customers`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', 'index'] });
      qc.invalidateQueries({ queryKey: ['customers', 'search'] });
    },
  });
}

export function useUpdateCustomer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.patch(`/customers/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', id] });
      qc.invalidateQueries({ queryKey: ['customers', 'index'] });
    },
  });
}

// ---- Estimates
export function useEstimates(fromISO?: string, limit = 10) {
  const qs = new URLSearchParams();
  if (fromISO) qs.set('from', fromISO);
  qs.set('limit', String(limit));
  return useQuery({
    queryKey: ['estimates', fromISO ?? '', limit],
    queryFn: async () => api.get(`/estimates?${qs.toString()}`).then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.post(`/estimates`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useCompleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      id: number;
      accepted: boolean;
      priceCents?: number;
      projectTitle?: string;
      dueOn?: string;
    }) => api.post(`/estimates/${payload.id}/complete`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      id: number;
      scheduledAt?: string;
      customerPatch?: any; // 将来の拡張用
    }) => api.patch(`/estimates/${payload.id}`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
    },
  });
}

// ---- Utility
export function useUndoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inverse: { method: string; path: string; payload?: any }) =>
      callInverse(inverse).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ---- Customer Memos
export function useCustomerMemos(customerId: number, limit = 20) {
  return useQuery({
    queryKey: ['customer-memos', customerId, limit],
    queryFn: () =>
      api.get(`/customers/${customerId}/memos`, { params: { limit } }).then((r) => r.data),
    enabled: !!customerId,
  });
}

export function useCreateCustomerMemo(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/customers/${customerId}/memos`, { body }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-memos', customerId] }),
  });
}

// ---- Recent Projects by Customer
export function useRecentProjectsByCustomer(customerId: number, limit = 10) {
  return useQuery({
    queryKey: ['recent-projects-by-customer', customerId, limit],
    queryFn: () =>
      api
        .get(`/customers/${customerId}/recent_projects`, { params: { limit } })
        .then((r) => r.data),
    enabled: !!customerId,
  });
}
