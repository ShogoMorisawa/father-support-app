'use client';

import Toast from '@/app/_components/Toast';
import { CategorySelector } from '@/app/_components/tasks/CategorySelector';
import { MaterialRow } from '@/app/_components/tasks/MaterialRow';
import { TimeSelector } from '@/app/_components/tasks/TimeSelector';
import { useMaterialsAvailability, useTaskBulkCreate } from '@/lib/api/hooks';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type EstimateItem = {
  category: string;
  materialId: number;
  materialName: string;
  qty: number;
  unit: string;
};

type EstimateData = {
  items: EstimateItem[];
  customerName: string;
};

type ItemRow = {
  id: string;
  title: string;
  category: string;
  materials: {
    id: string;
    materialId: number | null;
    materialName: string;
    qtyPlanned: number;
    unit: string;
  }[];
};

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 作業名の自動生成
function generateTaskTitle(
  category: string,
  materials: { materialName: string; qtyPlanned: number; unit: string }[],
): string {
  if (materials.length === 0) return `${category} 作業`;

  const materialSummary = materials
    .map((m) => `${m.materialName} ${m.qtyPlanned}${m.unit}`)
    .join('、');

  return `${category} ${materialSummary}`;
}

export default function BulkCreateTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();

  const [deliveryOn, setDeliveryOn] = useState<string>(todayPlus(3));
  const [deliveryTime, setDeliveryTime] = useState<string>('09:00'); // デフォルト時刻
  const [items, setItems] = useState<ItemRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const bulk = useTaskBulkCreate(projectId);
  const { data: availabilityData } = useMaterialsAvailability();

  // 見積もりデータの読み込み
  useEffect(() => {
    const savedEstimateData = sessionStorage.getItem('estimateDataForTasks');
    if (savedEstimateData) {
      try {
        const estimateData: EstimateData = JSON.parse(savedEstimateData);

        // 見積もりデータから作業行を自動生成
        const generatedItems: ItemRow[] = estimateData.items.map((item, index) => ({
          id: crypto.randomUUID(),
          title: generateTaskTitle(item.category, [
            { materialName: item.materialName, qtyPlanned: item.qty, unit: item.unit },
          ]),
          category: item.category,
          materials: [
            {
              id: crypto.randomUUID(),
              materialId: item.materialId,
              materialName: item.materialName,
              qtyPlanned: item.qty,
              unit: item.unit,
            },
          ],
        }));

        setItems(generatedItems);

        // 使用後はセッションストレージから削除
        sessionStorage.removeItem('estimateDataForTasks');
      } catch (error) {
        console.error('見積もりデータの読み込みに失敗しました:', error);
        // エラーが発生した場合はデフォルトの1行を表示
        setItems([
          {
            id: crypto.randomUUID(),
            title: '',
            category: '',
            materials: [
              {
                id: crypto.randomUUID(),
                materialId: null,
                materialName: '',
                qtyPlanned: 0,
                unit: '',
              },
            ],
          },
        ]);
      }
    } else {
      // 見積もりデータがない場合はデフォルトの1行を表示
      setItems([
        {
          id: crypto.randomUUID(),
          title: '',
          category: '',
          materials: [
            {
              id: crypto.randomUUID(),
              materialId: null,
              materialName: '',
              qtyPlanned: 0,
              unit: '',
            },
          ],
        },
      ]);
    }
  }, []);

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: '',
        category: '',
        materials: [
          { id: crypto.randomUUID(), materialId: null, materialName: '', qtyPlanned: 0, unit: '' },
        ],
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
                {
                  id: crypto.randomUUID(),
                  materialId: null,
                  materialName: '',
                  qtyPlanned: 0,
                  unit: '',
                },
              ],
            }
          : r,
      ),
    );

  const updateMaterial = (
    rowId: string,
    matId: string,
    patch: Partial<{
      materialId: number | null;
      materialName: string;
      qtyPlanned: number;
      unit: string;
    }>,
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

  // 作業名の自動更新
  const updateTaskTitle = (rowId: string) => {
    const row = items.find((r) => r.id === rowId);
    if (row && row.category) {
      const materials = row.materials.filter((m) => m.materialName && m.qtyPlanned > 0);
      if (materials.length > 0) {
        const newTitle = generateTaskTitle(row.category, materials);
        updateRow(rowId, { title: newTitle });
      }
    }
  };

  const onSubmit = async () => {
    // バリデーション
    if (!deliveryOn) return setToast('納品予定日を入力してください。');

    const cleaned = items
      .map((r) => ({
        title: r.title.trim(),
        kind: r.category?.trim() || undefined,
        materials: r.materials
          .map((m) => ({
            materialId: m.materialId,
            materialName: m.materialName.trim() || undefined,
            qtyPlanned: m.qtyPlanned != null && m.qtyPlanned > 0 ? m.qtyPlanned : undefined,
          }))
          .filter((m) => m.materialId && m.materialName && m.qtyPlanned), // material_idが必須
      }))
      .filter((r) => r.title.length > 0 && r.kind);

    if (cleaned.length === 0) return setToast('作業の行を1件以上入力してください。');

    // 種別が選択されていない行があるかチェック
    const hasEmptyCategory = items.some((r) => !r.category);
    if (hasEmptyCategory) return setToast('すべての行で種別を選択してください。');

    // 材料が選択されていない行があるかチェック
    const hasEmptyMaterial = items.some((r) =>
      r.materials.some((m) => !m.materialId || !m.materialName || m.qtyPlanned <= 0),
    );
    if (hasEmptyMaterial) return setToast('すべての行で材料を選択し、数量を入力してください。');

    try {
      const result = await bulk.mutateAsync({
        deliveryOn,
        deliveryTime,
        items: cleaned,
      });
      setToast('作業を登録しました。');
      // 作成された納品の詳細ページに直接遷移
      if (result?.data?.delivery?.id) {
        router.push(`/deliveries/${result.data.delivery.id}`);
      } else {
        router.push('/deliveries');
      }
    } catch (e: any) {
      // エラーレスポンスの詳細を表示
      let errorMessage = '登録に失敗しました。もう一度お試しください。';

      if (e.response?.data?.error?.message) {
        errorMessage = e.response.data.error.message;
      } else if (e.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e.message) {
        errorMessage = e.message;
      }

      setToast(errorMessage);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">作業の一括作成</h1>

      <section className="rounded border bg-white p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">納品予定日（プロジェクト）</span>
            <input
              type="date"
              value={deliveryOn}
              onChange={(e) => setDeliveryOn(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">納品予定時刻</span>
            <TimeSelector
              value={deliveryTime}
              onChange={setDeliveryTime}
              placeholder="時刻を選択"
              className="mt-1"
            />
          </label>
        </div>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold">作業リスト</div>
          <button onClick={addRow} className="text-sm underline">
            行を追加
          </button>
        </div>

        <ul className="space-y-4">
          {items.map((row, idx) => (
            <li key={row.id} className="rounded border p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600 font-medium">#{idx + 1}</div>
                {items.length > 1 && (
                  <button
                    className="text-sm underline text-red-600"
                    onClick={() => removeRow(row.id)}
                  >
                    削除
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-sm text-gray-600">作業名</span>
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例：障子 張替 3枚"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">
                    種別 <span className="text-red-500">*</span>
                  </span>
                  <CategorySelector
                    value={row.category}
                    onChange={(category) => {
                      updateRow(row.id, { category });
                      // 種別が変更されたら作業名を自動更新
                      setTimeout(() => updateTaskTitle(row.id), 100);
                    }}
                    placeholder="種別を選択"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">材料</div>
                  <button
                    className="text-sm underline text-blue-600"
                    onClick={() => addMaterial(row.id)}
                  >
                    材料を追加
                  </button>
                </div>

                <div className="space-y-3">
                  {row.materials.map((m) => (
                    <MaterialRow
                      key={m.id}
                      materialId={m.materialId}
                      materialName={m.materialName}
                      qtyPlanned={m.qtyPlanned}
                      unit={m.unit}
                      availability={availabilityData?.data?.items || []}
                      onMaterialChange={(materialId, materialName, unit) => {
                        updateMaterial(row.id, m.id, { materialId, materialName, unit });
                        // 材料が変更されたら作業名を自動更新
                        setTimeout(() => updateTaskTitle(row.id), 100);
                      }}
                      onQtyChange={(qtyPlanned) => {
                        updateMaterial(row.id, m.id, { qtyPlanned });
                        // 数量が変更されたら作業名を自動更新
                        setTimeout(() => updateTaskTitle(row.id), 100);
                      }}
                      onRemove={() => removeMaterial(row.id, m.id)}
                    />
                  ))}
                </div>
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
