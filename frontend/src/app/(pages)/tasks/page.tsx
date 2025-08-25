'use client';
import Toast from '@/app/_components/Toast';
import { useCompleteTask, useRevertCompleteTask, useTasks } from '@/lib/api/hooks';
import { useMemo, useState } from 'react';

type Tab = 'pending' | 'done' | 'all';

// --- utils ---
function jstTodayYmd() {
  const d = new Date();
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10); // YYYY-MM-DD
}
function diffDaysJst(ymd?: string) {
  if (!ymd) return Number.POSITIVE_INFINITY;
  const base = new Date(`${jstTodayYmd()}T00:00:00+09:00`).getTime();
  const t = new Date(`${ymd}T00:00:00+09:00`).getTime();
  return Math.round((t - base) / 86400000);
}
function fmtQty(n?: number | null) {
  if (n == null) return '';
  return Number(n.toFixed(3)).toString(); // 末尾0抑制
}
function materialsSummary(mats?: { materialName?: string | null; qtyPlanned?: number | null }[]) {
  if (!mats || mats.length === 0) return '—';
  const xs = mats
    .filter((m) => (m?.materialName ?? '').trim().length > 0 || m?.qtyPlanned != null)
    .map((m) => {
      const name = (m?.materialName ?? '').trim() || '（未設定）';
      const qty = m?.qtyPlanned != null ? fmtQty(m.qtyPlanned) : '';
      return qty ? `${name} × ${qty}` : name;
    });
  return xs.length > 0 ? xs.join(' / ') : '—';
}
// サーバ側の差異を吸収（'done' 以外に 'completed' を使っていても拾う）
function isDone(status?: string | null) {
  const s = String(status ?? '').toLowerCase();
  return s === 'done' || s === 'completed';
}

// --- badge ---
function StatusBadge({ status }: { status?: string | null }) {
  const done = isDone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {done ? '完了' : '未完了'}
    </span>
  );
}

export default function TasksPage() {
  const { data, refetch } = useTasks('due.asc', 500);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');

  const all: any[] = useMemo(() => data?.data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    if (tab === 'all') return all;
    if (tab === 'pending') return all.filter((t) => !isDone(t.status));
    return all.filter((t) => isDone(t.status));
  }, [all, tab]);

  const counts = useMemo(() => {
    const doneCnt = all.filter((t) => isDone(t.status)).length;
    const pendingCnt = all.length - doneCnt;
    return { doneCnt, pendingCnt, allCnt: all.length };
  }, [all]);

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">作業一覧</h1>
        <div className="flex gap-6 border-b text-sm">
          {(['pending', 'done', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 -mb-px border-b-2 ${
                tab === t ? 'border-black text-black' : 'border-transparent text-gray-500'
              }`}
            >
              {t === 'pending'
                ? `未完了 (${counts.pendingCnt})`
                : t === 'done'
                ? `完了 (${counts.doneCnt})`
                : `すべて (${counts.allCnt})`}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                期日
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                作業名
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                材料と使用量
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                顧客名
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                ステータス
              </th>
              <th scope="col" className="px-3 py-2 text-center">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const key = `t-${t.id ?? 'x'}-${t.projectId ?? 'p'}-${t.dueOn ?? idx}`;
              const overdue = diffDaysJst(t.dueOn) < 0;
              return (
                <Row
                  key={key}
                  task={t}
                  overdue={overdue}
                  onDone={() => {
                    setToast('作業を完了しました。');
                    refetch();
                  }}
                  onRevert={() => {
                    setToast('完了を取り消しました。');
                    refetch();
                  }}
                  onError={() => setToast('操作が競合しました。少し時間をおいて再試行してください')}
                />
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                  対象の作業はありません。
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

function Row({
  task,
  overdue,
  onDone,
  onRevert,
  onError,
}: {
  task: any;
  overdue: boolean;
  onDone: () => void;
  onRevert: () => void;
  onError: () => void;
}) {
  const complete = useCompleteTask(task.id);
  const revert = useRevertCompleteTask(task.id);
  const loading = complete.isPending || revert.isPending;
  const done = isDone(task.status);

  return (
    <tr className={overdue && !done ? 'bg-red-50' : ''}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span>{task.dueOn ?? '-'}</span>
          {overdue && !done && (
            <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
              期限超過
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">{task.title}</td>
      <td className="px-3 py-2">{materialsSummary(task.materials)}</td>
      <td className="px-3 py-2">{task.customerName ?? '-'}</td>
      <td className="px-3 py-2">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-3 py-2 text-center">
        {!done ? (
          <button
            className="rounded bg-black text-white px-3 py-1 disabled:opacity-50"
            disabled={loading}
            onClick={async () => {
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
        ) : (
          <button
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={loading}
            onClick={async () => {
              try {
                await revert.mutateAsync();
                onRevert();
              } catch {
                onError();
              }
            }}
          >
            完了取消
          </button>
        )}
      </td>
    </tr>
  );
}
