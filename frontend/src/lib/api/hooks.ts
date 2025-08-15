'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, callInverse } from './client';

export function useDeliveries(
  params: { status?: 'pending' | 'all'; order?: 'date.asc' | 'date.desc'; limit?: number } = {},
) {
  const { status = 'pending', order = 'date.asc', limit = 3 } = params;
  return useQuery({
    queryKey: ['deliveries', status, order, limit],
    queryFn: async () =>
      api
        .get(`/deliveries?status=${status}&order=${order}&limit=${limit}`)
        .then((r: any) => r.data),
  });
}

export function useHistory(limit = 10) {
  return useQuery({
    queryKey: ['history', limit],
    queryFn: async () => api.get(`/history?limit=${limit}`).then((r: any) => r.data),
    refetchInterval: 60_000,
  });
}

export function useCompleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completedAt }: { id: number; completedAt: string }) =>
      api.post(`/projects/${id}/complete`, { completedAt }).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      qc.invalidateQueries({ queryKey: ['history'] });
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

// ---- Tasks
export function useTasks(order: 'due.asc' | 'due.desc' = 'due.asc', limit = 200) {
  return useQuery({
    queryKey: ['tasks', order, limit],
    queryFn: async () => api.get(`/tasks?order=${order}&limit=${limit}`).then((r) => r.data),
  });
}
