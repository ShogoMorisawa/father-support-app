'use client';
import { useEstimates } from '@/lib/api/hooks';
import { useMemo } from 'react';

function todayJst() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const d = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function EstimatesPage() {
  const from = useMemo(() => todayJst(), []);
  const { data, isLoading } = useEstimates({ from, limit: 50 });
  const items = data?.data?.items ?? [];

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-bold">見積もり予定一覧</h1>
      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中です…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">見積もり予定はありません。</p>
      ) : (
        <div className="grid gap-2">
          {items.map((e) => (
            <div key={e.id} className="rounded border p-3 bg-white">
              <div className="font-medium">{e.customerName}</div>
              <div className="text-gray-600">
                {new Date(e.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </div>
              <div className="text-gray-600">
                {e.address} / {e.phone}
              </div>
              {e.memo && <div className="text-gray-500 mt-1">{e.memo}</div>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
