'use client';

import Toast from '@/app/_components/Toast';
import { api } from '@/lib/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

type ItemRow = {
  id: string;
  title: string;
  kind?: string;
  materials: { id: string; materialName: string; qtyPlanned?: number }[];
};

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function BulkCreateTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const qc = useQueryClient();

  const [deliveryOn, setDeliveryOn] = useState<string>(todayPlus(3)); // デフォルト：3日後（JST運用想定）
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: crypto.randomUUID(),
      title: '',
      kind: '',
      materials: [{ id: crypto.randomUUID(), materialName: '', qtyPlanned: undefined }],
    },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  const bulk = useMutation({
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

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: '',
        kind: '',
        materials: [{ id: crypto.randomUUID(), materialName: '', qtyPlanned: undefined }],
      },
    ]);

  const removeRow = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const updateRow = (id: string, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addMaterial = (rowId: string) =>
    setItems((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              materials: [
                ...r.materials,
                { id: crypto.randomUUID(), materialName: '', qtyPlanned: undefined },
              ],
            }
          : r,
      ),
    );

  const updateMaterial = (
    rowId: string,
    matId: string,
    patch: Partial<{ materialName: string; qtyPlanned?: number }>,
  ) =>
    setItems((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, materials: r.materials.map((m) => (m.id === matId ? { ...m, ...patch } : m)) }
          : r,
      ),
    );

  const removeMaterial = (rowId: string, matId: string) =>
    setItems((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, materials: r.materials.filter((m) => m.id !== matId) } : r,
      ),
    );

  const onSubmit = async () => {
    // バリデーション（最小限）
    if (!deliveryOn) return setToast('納品予定日を入力してください。');
    const cleaned = items
      .map((r) => ({
        title: r.title.trim(),
        kind: r.kind?.trim() || undefined,
        materials: r.materials
          .map((m) => ({
            materialName: m.materialName.trim() || undefined,
            qtyPlanned: m.qtyPlanned ?? undefined,
          }))
          .filter((m) => m.materialName || (m.qtyPlanned !== undefined && m.qtyPlanned !== null)),
      }))
      .filter((r) => r.title.length > 0);
    if (cleaned.length === 0) return setToast('作業の行を1件以上入力してください。');

    try {
      await bulk.mutateAsync({ deliveryOn, items: cleaned });
      setToast('作業を登録しました。');
      // 納品詳細へ誘導（プロジェクトに紐づく納品は1件運用）
      router.push('/deliveries');
    } catch (e: any) {
      setToast('登録に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">作業の一括作成</h1>

      <section className="rounded border bg-white p-4 space-y-2">
        <label className="block">
          <span className="text-sm text-gray-600">納品予定日（プロジェクト）</span>
          <input
            type="date"
            value={deliveryOn}
            onChange={(e) => setDeliveryOn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold">作業リスト</div>
          <button onClick={addRow} className="text-sm underline">
            行を追加
          </button>
        </div>

        <ul className="space-y-3">
          {items.map((row, idx) => (
            <li key={row.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">#{idx + 1}</div>
                {items.length > 1 && (
                  <button className="text-sm underline" onClick={() => removeRow(row.id)}>
                    削除
                  </button>
                )}
              </div>

              <label className="block mt-2">
                <span className="text-sm text-gray-600">作業名（例：障子 3枚）</span>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => updateRow(row.id, { title: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="例：障子 張替 3枚"
                />
              </label>

              <label className="block mt-2">
                <span className="text-sm text-gray-600">種別（任意）</span>
                <input
                  type="text"
                  value={row.kind ?? ''}
                  onChange={(e) => updateRow(row.id, { kind: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                  placeholder="障子/襖/網戸 など"
                />
              </label>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">材料（任意）</div>
                  <button className="text-sm underline" onClick={() => addMaterial(row.id)}>
                    材料を追加
                  </button>
                </div>
                <ul className="mt-2 space-y-2">
                  {row.materials.map((m) => (
                    <li key={m.id} className="grid grid-cols-5 gap-2 items-center">
                      <input
                        type="text"
                        className="col-span-3 rounded border px-3 py-2"
                        placeholder="材料名（例：障子紙）"
                        value={m.materialName}
                        onChange={(e) =>
                          updateMaterial(row.id, m.id, { materialName: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        className="col-span-1 rounded border px-3 py-2"
                        placeholder="数量"
                        value={m.qtyPlanned ?? ''}
                        onChange={(e) =>
                          updateMaterial(row.id, m.id, {
                            qtyPlanned: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        step="0.001"
                        min="0"
                      />
                      <button
                        className="text-xs underline col-span-1"
                        onClick={() => removeMaterial(row.id, m.id)}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button className="underline text-sm" onClick={() => router.back()}>
          戻る
        </button>
        <button
          onClick={onSubmit}
          disabled={bulk.isPending}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {bulk.isPending ? '登録中…' : '登録する'}
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
