'use client';
import Toast from '@/app/_components/Toast';
import { useCompleteTask, useTasks } from '@/lib/api/hooks';
import { useMemo, useState } from 'react';

export default function TasksPage() {
  const { data, refetch } = useTasks('due.asc', 200);
  const [toast, setToast] = useState<string | null>(null);

  const items: any[] = useMemo(() => data?.data?.items ?? [], [data]);

  // 未完了のタスクのみフィルタリング
  const pendingTasks = items.filter((t) => t.status !== 'done');

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">作業一覧</h1>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">期日</th>
              <th className="px-3 py-2 text-left">お客様</th>
              <th className="px-3 py-2 text-left">作業内容</th>
              <th className="px-3 py-2 text-left">住所</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {pendingTasks.map((t, idx) => {
              const key = `t-${t.id ?? 'x'}-${t.projectId ?? 'p'}-${t.dueOn ?? idx}`;
              return (
                <tr key={key} className="border-t">
                  <td className="px-3 py-2">{t.dueOn ?? '-'}</td>
                  <td className="px-3 py-2">{t.customerName ?? '-'}</td>
                  <td className="px-3 py-2">{t.title}</td>
                  <td className="px-3 py-2">{t.address ?? '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <TaskCompleteButton
                      taskId={t.id}
                      onDone={() => {
                        setToast('作業を完了しました。');
                        refetch();
                      }}
                      onError={() => {
                        setToast('操作が競合しました。少し時間をおいて再試行してください');
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {pendingTasks.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  未完了の作業はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}

function TaskCompleteButton({
  taskId,
  onDone,
  onError,
}: {
  taskId: number;
  onDone: () => void;
  onError: () => void;
}) {
  const complete = useCompleteTask(taskId);
  return (
    <button
      className="rounded bg-black text-white px-3 py-1 disabled:opacity-50"
      disabled={!taskId || complete.isPending}
      onClick={async () => {
        if (!taskId) return;
        try {
          await complete.mutateAsync();
          onDone();
        } catch {
          onError();
        }
      }}
    >
      完了
    </button>
  );
}
