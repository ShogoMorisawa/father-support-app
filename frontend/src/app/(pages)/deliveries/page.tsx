'use client';
import { useDeliveries } from '@/lib/api/hooks';
import { components } from '@/lib/api/types';
import Link from 'next/link';
import { useState } from 'react';

function formatJstYmd(dateStr?: string) {
  if (!dateStr) return '-';
  // APIは YYYY-MM-DD を返すので JST 00:00 固定で解釈
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // 未完了の納品
  const pending = useDeliveries({
    status: 'pending',
    order: 'date.asc',
    limit: 500,
  });

  // 完了済みの納品（完了タブのときだけ読み込む）
  const delivered = useDeliveries({
    status: 'delivered',
    order: 'date.desc',
    limit: 500,
    enabled: activeTab === 'completed',
  });

  const cancelled = useDeliveries({
    status: 'cancelled',
    order: 'date.desc',
    limit: 500,
    enabled: activeTab === 'completed',
  });

  const pendingItems = pending.data?.data?.items ?? [];

  // 完了済みの納品（重複を避けるため、IDベースで一意性を保証）
  const deliveredItems = delivered.data?.data?.items ?? [];
  const cancelledItems = cancelled.data?.data?.items ?? [];

  // Mapを使用してIDベースで一意性を保証
  const completedItemsMap = new Map();
  deliveredItems.forEach((item: any) => {
    completedItemsMap.set(item.id, item);
  });
  cancelledItems.forEach((item: any) => {
    completedItemsMap.set(item.id, item);
  });
  const completedItems = Array.from(completedItemsMap.values());

  if (
    pending.isLoading ||
    (activeTab === 'completed' && (delivered.isLoading || cancelled.isLoading))
  ) {
    return <p className="p-4">読み込み中です…</p>;
  }
  if (pending.error || delivered.error || cancelled.error) {
    return <p className="p-4 text-red-600">通信に失敗しました。再試行してください</p>;
  }

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">納品一覧</h1>
        <div className="flex items-center gap-3">
          <Link href="/deliveries/tools" className="text-sm underline">
            調整ツール
          </Link>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="border-b">
        <div className="flex gap-6">
          <button
            className={`pb-2 px-1 border-b-2 font-medium ${
              activeTab === 'pending'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            未完了 ({pendingItems.length})
          </button>
          <button
            className={`pb-2 px-1 border-b-2 font-medium ${
              activeTab === 'completed'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            完了済み ({completedItems.length})
          </button>
        </div>
      </div>

      {/* 未完了の納品 */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">未完了の納品はありません。</p>
          ) : (
            pendingItems.map((d: components['schemas']['DeliveryTask'], idx: number) => (
              <div key={`pending-${(d as any).id}`} className="rounded border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">{formatJstYmd((d as any).date)}</div>
                    <div className="font-medium">{d.customerName}</div>
                    <div className="text-sm">{d.title}</div>
                  </div>
                  <Link
                    href={`/deliveries/${(d as any).id}`}
                    className="text-sm underline text-blue-600"
                  >
                    詳細
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 完了済みの納品 */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">完了済みの納品はありません。</p>
          ) : (
            completedItems.map((d: components['schemas']['DeliveryTask'], idx: number) => (
              <div key={`completed-${(d as any).id}`} className="rounded border bg-white p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">{formatJstYmd((d as any).date)}</div>
                    <div className="font-medium">{d.customerName}</div>
                    <div className="text-sm">{d.title}</div>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          (d as any).status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {(d as any).status === 'delivered' ? '納品完了' : 'キャンセル'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Link
                      href={`/deliveries/${(d as any).id}`}
                      className="text-blue-600 hover:underline"
                    >
                      詳細
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
