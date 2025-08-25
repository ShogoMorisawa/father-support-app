'use client';
import { useDeliveries } from '@/lib/api/hooks';
import Link from 'next/link';

export default function DeliveriesCard() {
  const { data } = useDeliveries({ status: 'pending', order: 'date.asc', limit: 3 });
  const items: any[] = data?.data?.items ?? [];
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">納品予定（3件）</h2>
        <div className="flex items-center gap-3">
          {/* <Link href="/deliveries/tools" className="text-sm underline">
            調整ツール
          </Link> */}
          <Link href="/history" className="text-sm underline">
            履歴を見る
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">直近の納品予定はありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d, idx) => {
            const ts = new Date(d.date).getTime();
            const key = `d-${d.id ?? 'x'}-${d.projectId ?? 'p'}-${Number.isFinite(ts) ? ts : idx}`;
            return (
              <li key={key} className="text-sm">
                <div className="text-gray-600">
                  {d.scheduledAt
                    ? new Date(d.scheduledAt).toLocaleTimeString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '時刻未定'}
                </div>
                <div className="font-medium">{d.customerName ?? d.title ?? '納品'}</div>
                <div className="text-gray-600">
                  {new Date(d.date).toLocaleDateString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                  {d.title && ` / ${d.title}`}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
