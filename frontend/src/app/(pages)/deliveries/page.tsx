'use client';
import { useDeliveries } from '@/lib/api/hooks';
import { components } from '@/lib/api/types';
import Link from 'next/link';

function formatJstYmd(dateStr?: string) {
  if (!dateStr) return '-';
  // APIは YYYY-MM-DD を返すので JST 00:00 固定で解釈
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

export default function DeliveriesPage() {
  // 明示しておく（余計なクエリ文字列を付けないためにも）
  const { data, isLoading, error } = useDeliveries({
    status: 'pending',
    order: 'date.asc',
    limit: 200,
  });

  if (isLoading) return <p className="p-4">読み込み中です…</p>;
  if (error) return <p className="p-4 text-red-600">通信に失敗しました。再試行してください</p>;

  const items = data?.data?.items ?? [];
  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">納品予定</h1>
      {items.length === 0 && <p>予定はありません。</p>}
      <ul className="space-y-2">
        {items.map((d: components['schemas']['DeliveryTask'], idx: number) => (
          <li
            key={`del-${(d as any).id ?? 'x'}-${(d as any).projectId ?? 'p'}-${(() => {
              const ts = new Date(d.date).getTime();
              return Number.isFinite(ts) ? ts : idx;
            })()}`}
            className="rounded border p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-70">{formatJstYmd((d as any).date)}</div>
                <div className="font-medium">{d.customerName}</div>
                <div className="text-sm">{d.title}</div>
              </div>
              <Link href={`/deliveries/${(d as any).id}`} className="underline text-sm">
                詳細
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
