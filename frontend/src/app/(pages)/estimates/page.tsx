'use client';
import Toast from '@/app/_components/Toast';
import { useCompleteEstimate, useEstimates } from '@/lib/api/hooks';
import { useState } from 'react';

export default function EstimatesPage() {
  const { data, refetch } = useEstimates(new Date().toISOString().slice(0, 10), 20);
  const items: any[] = data?.data?.items ?? [];
  const complete = useCompleteEstimate();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">見積一覧</h1>
      <div className="space-y-3">
        {items.map((e) => (
          <div key={e.id} className="rounded border bg-white p-3">
            <div className="text-sm text-gray-600">
              {new Date(e.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
            </div>
            <div className="font-medium">{e.customer?.name ?? '（無名）'}</div>
            <div className="text-xs text-gray-500">{e.status}</div>
            <div className="mt-2 flex gap-2">
              <button
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                onClick={async () => {
                  try {
                    await complete.mutateAsync({
                      id: e.id,
                      accepted: true,
                      priceCents: 0,
                      projectTitle: `${e.customer?.name ?? '案件'}`,
                      dueOn: new Date().toISOString().slice(0, 10),
                    });
                    setToast('見積を成立しました。');
                    refetch();
                  } catch {
                    setToast('操作が競合しました。少し時間をおいて再試行してください。');
                  }
                }}
              >
                成立
              </button>
              <button
                className="px-3 py-1 rounded border"
                onClick={async () => {
                  try {
                    await complete.mutateAsync({ id: e.id, accepted: false });
                    setToast('見積を不成立にしました。');
                    refetch();
                  } catch {
                    setToast('操作が競合しました。少し時間をおいて再試行してください。');
                  }
                }}
              >
                不成立
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">予定されている見積はありません。</p>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
