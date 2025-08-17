'use client';
import Toast from '@/app/_components/Toast';
import { useCompleteProject } from '@/lib/api/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DevActions() {
  const [id, setId] = useState<number>(1);
  const [toast, setToast] = useState<string | null>(null);
  const complete = useCompleteProject(id);
  const router = useRouter();

  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">開発用アクション</h1>
      <div className="rounded border bg-white p-4 space-y-3">
        <div className="text-sm">Project ID を指定して「完了」を実行します。</div>
        <input
          type="number"
          value={id}
          onChange={(e) => setId(parseInt(e.target.value || '0', 10))}
          className="border rounded px-2 py-1 w-32"
        />
        <button
          className="ml-2 rounded bg-black text-white px-3 py-1 disabled:opacity-50"
          disabled={!(id > 0) || complete.isPending}
          onClick={async () => {
            if (!(id > 0)) return;
            try {
              const res = await complete.mutateAsync();
              const low = res?.data?.lowStock ?? [];
              if (low.length > 0) {
                setToast(`在庫が少なくなっています（${low.length}件）。在庫を見る`);
              } else {
                setToast('作業を完了しました。');
              }
            } catch {
              setToast('操作が競合しました。少し時間をおいて再試行してください');
            }
          }}
        >
          完了
        </button>
      </div>

      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
          actionLabel="在庫を見る"
          onAction={() => router.push('/inventory')}
        />
      )}
    </main>
  );
}
