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
  if (params?.estimatesLimit) qs.set('estimatesLimit', String(params.estimatesLimit));
  if (params?.tasksLimit) qs.set('tasksLimit', String(params.tasksLimit));
  if (params?.deliveriesLimit) qs.set('deliveriesLimit', String(params.deliveriesLimit));
  if (params?.historyLimit) qs.set('historyLimit', String(params.historyLimit));
  if (params?.lowLimit) qs.set('lowLimit', String(params.lowLimit));
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
  status?: 'pending' | 'all';
  order?: 'date.asc' | 'date.desc';
  limit?: number;
}) {
  const status = opts?.status ?? 'pending';
  const order = opts?.order ?? 'date.asc';
  const limit = opts?.limit ?? 200;
  const qs = new URLSearchParams();
  // 既定値でも「undefined」文字列は付けない
  if (status) qs.set('status', status);
  if (order) qs.set('order', order);
  if (typeof limit === 'number') qs.set('limit', String(limit));
  const qstr = qs.toString();
  return useQuery({
    queryKey: ['deliveries', qstr],
    queryFn: async () => api.get(`/deliveries?${qstr}`).then((r) => r.data),
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

export function useCompleteDelivery(deliveryId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/deliveries/${deliveryId}/complete`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

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
export function useCompleteProject(projectId: number, options?: { completedAt?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post(
          `/projects/${projectId}/complete`,
          options?.completedAt ? { completedAt: options.completedAt } : {},
        )
        .then((r) => r.data),
    onSuccess: () => {
      // 影響範囲のみ無効化（過剰な全体無効化は避ける）
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
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
  order: 'name.asc' | 'name.desc' | 'created.desc' = 'name.asc',
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
    mutationFn: ({
      id,
      accepted,
      priceCents,
      projectTitle,
      dueOn,
    }: {
      id: number;
      accepted: boolean;
      priceCents?: number;
      projectTitle?: string;
      dueOn?: string;
    }) =>
      api
        .post(`/estimates/${id}/complete`, { accepted, priceCents, projectTitle, dueOn })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['deliveries'] });
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
