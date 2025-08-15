'use client';
import Toast from '@/app/_components/Toast';
import { useHistory, useUndoMutation } from '@/lib/api/hooks';
import { useState } from 'react';

export default function HistoryPage() {
  const { data, refetch } = useHistory(10);
  const undoMut = useUndoMutation();
  const [toast, setToast] = useState<string | null>(null);

  const items: any[] = data?.data?.items ?? [];
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">履歴</h1>

      <div className="space-y-3">
        {items.map((h) => (
          <div key={h.id} className="rounded border bg-white p-3">
            <div className="text-sm text-gray-600">
              {new Date(h.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
            </div>
            <div className="font-medium">{h.summary ?? h.action}</div>
            <div className="text-xs text-gray-500">
              #{h.targetType}:{h.targetId}
            </div>
            <div className="mt-2">
              <button
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                disabled={!h.canUndo || undoMut.isPending}
                onClick={async () => {
                  try {
                    await undoMut.mutateAsync(h.inverse);
                    setToast('操作を元に戻しました。');
                    refetch();
                  } catch {
                    setToast('操作が競合しました。少し時間をおいて再試行してください。');
                  }
                }}
              >
                元に戻す
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">履歴はまだありません。</p>}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
