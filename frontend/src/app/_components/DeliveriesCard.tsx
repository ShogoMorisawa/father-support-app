'use client';

import { useDeliveries } from '@/lib/api/hooks';
import { components } from '@/lib/api/types';
import Link from 'next/link';

export default function DeliveriesCard() {
  const { data, isLoading, error } = useDeliveries();

  return (
    <section className="rounded-lg border p-4 bg-white/50">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">納品予定</h2>
        <Link href="/deliveries" className="text-sm underline">
          一覧へ
        </Link>
      </div>

      {isLoading && <p className="opacity-70">読み込み中です…</p>}
      {error && <p className="text-red-600">通信に失敗しました。再試行してください</p>}

      {!isLoading && !error && (
        <ul className="space-y-2">
          {(() => {
            const items = (data?.data?.items ?? [])
              .slice() // defensive copy
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3);

            if (items.length === 0) {
              return <li className="opacity-70">予定はありません。</li>;
            }

            return items.map((d: components['schemas']['DeliveryTask']) => (
              <li key={d.taskId} className="rounded border p-3">
                <div className="text-sm opacity-70">{new Date(d.date).toLocaleString('ja-JP')}</div>
                <div className="font-medium">{d.customerName}</div>
                <div className="text-sm">{d.title}</div>
              </li>
            ));
          })()}
        </ul>
      )}
    </section>
  );
}
