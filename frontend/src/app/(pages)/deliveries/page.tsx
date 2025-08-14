'use client';
import { useDeliveries } from '@/lib/api/hooks';
import { components } from '@/lib/api/types';

export default function DeliveriesPage() {
  const { data, isLoading, error } = useDeliveries();

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
            <div className="text-sm opacity-70">{new Date(d.date).toLocaleString('ja-JP')}</div>
            <div className="font-medium">{d.customerName}</div>
            <div className="text-sm">{d.title}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
