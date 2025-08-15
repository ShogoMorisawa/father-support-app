'use client';

import { useDeliveries } from '@/lib/api/hooks';
import Link from 'next/link';
import { useEffect } from 'react';

export default function DeliveriesCard() {
  const { data, refetch } = useDeliveries();

  useEffect(() => {
    const i = setInterval(() => refetch(), 60_000);
    return () => clearInterval(i);
  }, [refetch]);

  const items = data?.data?.items ?? [];

  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">納品予定（3件）</h2>
        <Link href="/deliveries" className="text-sm underline">
          すべて見る
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">直近の納品予定はありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 3).map((d, index) => {
            const ts = new Date(d.date).getTime();
            // モックDBの構造に合わせてキーを生成
            const key = `delivery-${d.taskId || d.projectId || index}-${ts}`;
            return (
              <li key={key} className="text-sm">
                <div className="font-medium">{d.customerName || '顧客名なし'}</div>
                <div className="text-gray-600">
                  {new Date(d.date).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                  {' / '}
                  {d.title || '納品'}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
