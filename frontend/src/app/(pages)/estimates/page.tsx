'use client';
import Toast from '@/app/_components/Toast';
import { useCompleteEstimate, useEstimates } from '@/lib/api/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EstimatesPage() {
  const { data, refetch } = useEstimates(undefined, 20);
  const items: any[] = data?.data?.items ?? [];
  const complete = useCompleteEstimate();
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  // 未完了の見積もりのみフィルタリング
  const pendingEstimates = items.filter((e) => e.status === 'scheduled');

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">見積一覧</h1>
        <Link href="/estimates/new" className="underline text-sm">
          新規作成
        </Link>
      </div>
      <div className="space-y-3">
        {pendingEstimates.map((e) => (
          <div key={e.id} className="rounded border bg-white p-3">
            <div className="text-sm text-gray-600">
              {new Date(e.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
            </div>
            <div className="font-medium">{e.customer?.name ?? '（無名）'}</div>
            <div className="text-xs text-gray-500">{e.address}</div>
            <div className="mt-2 flex gap-2">
              <button
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                onClick={async () => {
                  try {
                    const res = await complete.mutateAsync({
                      id: e.id,
                      accepted: true,
                      priceCents: 0,
                      projectTitle: `${e.customer?.name ?? '案件'}`,
                      dueOn: new Date().toISOString().slice(0, 10),
                    });

                    // 成立API成功後の処理：返ってきた projectId に遷移
                    if (res?.data?.projectId) {
                      router.push(`/projects/${res.data.projectId}/tasks/bulk-create`);
                    } else {
                      // projectIdが返らないケース（不成立など）はそのまま一覧リロード
                      setToast('見積を成立しました。');
                      refetch();
                    }
                  } catch {
                    setToast('操作が競合しました。少し時間をおいて再試行してください');
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
                    setToast('操作が競合しました。少し時間をおいて再試行してください');
                  }
                }}
              >
                不成立
              </button>
            </div>
          </div>
        ))}
        {pendingEstimates.length === 0 && (
          <p className="text-sm text-gray-500">未完了の見積はありません。</p>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
