'use client';

import Toast from '@/app/_components/Toast';
import { useBulkShiftDeliveries, useDeliveries } from '@/lib/api/hooks';
import Link from 'next/link';
import { useState } from 'react';

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DeliveriesToolsPage() {
  const today = ymd(new Date());
  const [days, setDays] = useState<number>(2);
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'all'>('pending');
  const [reason, setReason] = useState<string>('天候による日程調整');
  const [toast, setToast] = useState<string | null>(null);

  const { data } = useDeliveries({
    status: status === 'all' ? undefined : status,
    order: 'date.asc',
    limit: 200,
  });
  const items: any[] = data?.data?.items ?? [];
  const run = useBulkShiftDeliveries();

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">納品予定の一括調整</h1>
        <Link className="text-sm underline" href="/">
          ホームへ
        </Link>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">シフト日数（-前倒し / +延期）</label>
            <input
              type="number"
              min={-30}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">対象ステータス</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="pending">pending（未納品のみ）</option>
              <option value="all">all（全件）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">対象期間 From（任意）</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">対象期間 To（任意）</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">理由（任意）</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          対象候補：{items.length}件（現在の一覧に基づく）。実行後は履歴から元に戻せます。
        </div>

        <button
          className="rounded bg-black text-white px-3 py-2"
          onClick={async () => {
            try {
              const payload: any = { days, status };
              if (from) payload.from = from;
              if (to) payload.to = to;
              if (reason) payload.reason = reason;
              await run.mutateAsync(payload);
              setToast('一括調整を実行しました。履歴から元に戻せます。');
            } catch {
              setToast('実行に失敗しました。入力内容をご確認ください。');
            }
          }}
        >
          一括調整を実行
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
