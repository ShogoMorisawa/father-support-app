'use client';
import Toast from '@/app/_components/Toast';
import { MaterialCreateModal } from '@/app/_components/inventory/MaterialCreateModal';
import { useMaterialsAvailability, useReceiveMaterial } from '@/lib/api/hooks';
import { formatQty } from '@/lib/format/quantity';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InventoryPage() {
  const [order, setOrder] = useState<'available.asc' | 'available.desc' | 'name.asc' | 'name.desc'>(
    'available.asc',
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data } = useMaterialsAvailability(order, 200);
  const receive = useReceiveMaterial();
  const [toast, setToast] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const items: any[] = data?.data?.items ?? [];

  // URLパラメータでモーダルを開く
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const getRowColor = (available: number, threshold: number) => {
    if (available < 0) return 'bg-red-50';
    if (available < threshold) return 'bg-yellow-50';
    return '';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'shortage':
        return '在庫不足';
      case 'low':
        return '要補充';
      case 'ok':
        return '在庫あり';
      default:
        return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shortage':
        return 'text-red-600 font-medium';
      case 'low':
        return 'text-yellow-600 font-medium';
      case 'ok':
        return 'text-green-600 font-medium';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">在庫</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          新しい資材を登録
        </button>
      </div>

      {/* 並び替えセレクト */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">並び替え:</label>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as any)}
          className="rounded border px-3 py-1 text-sm"
        >
          <option value="available.asc">利用可能（少ない順）</option>
          <option value="available.desc">利用可能（多い順）</option>
          <option value="name.asc">名称（昇順）</option>
          <option value="name.desc">名称（降順）</option>
        </select>
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-right">現在庫</th>
              <th className="px-3 py-2 text-right">消費予定</th>
              <th className="px-3 py-2 text-right">利用可能</th>
              <th className="px-3 py-2 text-right">閾値</th>
              <th className="px-3 py-2">ステータス</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className={getRowColor(m.availableQty, m.thresholdQty)}>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2 text-right">{formatQty(m.currentQty)}</td>
                <td className="px-3 py-2 text-right">{formatQty(m.committedQty)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatQty(m.availableQty)}</td>
                <td className="px-3 py-2 text-right">{formatQty(m.thresholdQty)}</td>
                <td className="px-3 py-2">
                  <span className={getStatusColor(m.status)}>{getStatusText(m.status)}</span>
                </td>
                <td className="px-3 py-2">
                  <button
                    className="rounded border px-2 py-1"
                    onClick={async () => {
                      const v = window.prompt('入庫数量を入力してください（正の数）', '1');
                      if (!v) return;
                      const qty = Number(v);
                      if (!(qty > 0)) {
                        setToast('数量は正の数で入力してください。');
                        return;
                      }
                      try {
                        await receive.mutateAsync({ id: m.id, quantity: qty });
                        setToast('入庫を登録しました。');
                      } catch {
                        setToast('登録に失敗しました。少し時間をおいて再試行してください。');
                      }
                    }}
                  >
                    入庫
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
                  在庫データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showCreateModal && (
        <MaterialCreateModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      )}
    </main>
  );
}
