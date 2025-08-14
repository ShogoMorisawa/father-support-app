'use client';
import Toast from '@/app/_components/Toast';
import { useHistory, useUndoMutation } from '@/lib/api/hooks';
import { components } from '@/lib/api/types';
import { formatHistorySummary } from '@/lib/format/history';
import { useState } from 'react';

export default function HistoryPage() {
  const { data, isLoading, error } = useHistory(10);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const undo = useUndoMutation();
  const [msg, setMsg] = useState<string | null>(null);

  if (isLoading) return <p className="p-4">読み込み中です…</p>;
  if (error) return <p className="p-4 text-red-600">通信に失敗しました。再試行してください</p>;

  // API側で { items: HistoryItem & { canUndo?: boolean }[] } を返す
  const eventsAll = (data?.data?.items ?? []) as (components['schemas']['HistoryItem'] & {
    canUndo?: boolean;
  })[];
  const events = eventsAll.filter((ev) => !hiddenIds.includes(ev.id));

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">履歴（直近10件）</h1>
      {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
      <ul className="space-y-2">
        {events.map((ev) => (
          <li
            key={`${ev.id}-${ev.createdAt}`}
            className="rounded border p-3 flex items-center justify-between"
          >
            <div>
              <div className="text-sm opacity-70">
                {new Date(ev.createdAt).toLocaleString('ja-JP')}
              </div>
              <div className="font-medium">{formatHistorySummary(ev)}</div>
              {ev.canUndo === false && (
                <div className="text-xs text-amber-700 mt-1">この操作は現在は元に戻せません</div>
              )}
            </div>
            <button
              className="btn btn-primary px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={undo.isPending || ev.canUndo === false || !ev?.inverse?.path}
              onClick={async () => {
                try {
                  if (!ev?.inverse?.path) return;
                  const res = await undo.mutateAsync(ev.inverse.path);
                  setHiddenIds((ids) => [...ids, ev.id]);
                  setMsg(res?.data?.message ?? '直前の操作を元に戻しました');
                } catch (e: any) {
                  setMsg(e?.message ?? '通信に失敗しました。再試行してください');
                }
              }}
            >
              元に戻す
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
