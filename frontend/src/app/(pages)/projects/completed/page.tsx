'use client';

import Toast from '@/app/_components/Toast';
import { useCompletedProjects, useRevertComplete } from '@/lib/api/hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function ymd(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function CompletedProjectsPage() {
  const today = ymd();
  const fromDefault = ymd(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(today);
  const [q, setQ] = useState('');
  const [order, setOrder] = useState<'completed.desc' | 'completed.asc'>('completed.desc');

  const { data, isLoading, error, refetch } = useCompletedProjects({
    from,
    to,
    q,
    order,
    limit: 100,
  });

  const items: any[] = useMemo(() => data?.data?.items ?? [], [data]);
  const revert = useRevertComplete();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">完了済み案件</h1>
        <Link className="underline text-sm" href="/">
          ホームへ
        </Link>
      </div>

      {/* フィルタ */}
      <section className="rounded border bg-white p-4">
        <div className="grid md:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">完了日 From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">完了日 To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">キーワード</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="顧客名・案件タイトル"
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">並び替え</span>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as any)}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="completed.desc">完了日 降順</option>
              <option value="completed.asc">完了日 昇順</option>
            </select>
          </label>
        </div>
      </section>

      {/* 一覧 */}
      <section className="rounded border bg-white overflow-x-auto">
        {isLoading && <p className="p-4 text-sm text-gray-500">読み込み中…</p>}
        {error && <p className="p-4 text-sm text-red-600">読み込みに失敗しました。</p>}
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">完了日時</th>
              <th className="px-3 py-2 text-left">顧客</th>
              <th className="px-3 py-2 text-left">案件</th>
              <th className="px-3 py-2 text-left">期日</th>
              <th className="px-3 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, idx) => (
              <tr key={`p-${p.id}-${idx}`} className="border-t">
                <td className="px-3 py-2">
                  {p.completedAt
                    ? new Date(p.completedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                    : '-'}
                </td>
                <td className="px-3 py-2">{p.customerName ?? '-'}</td>
                <td className="px-3 py-2">{p.title}</td>
                <td className="px-3 py-2">{p.dueOn ?? '-'}</td>
                <td className="px-3 py-2 text-center">
                  <div className="inline-flex gap-3">
                    <Link className="underline" href={`/projects/${p.id}/photos`}>
                      写真を追加
                    </Link>
                    <button
                      className="underline disabled:opacity-50"
                      disabled={revert.isPending}
                      onClick={async () => {
                        try {
                          await revert.mutateAsync({ id: p.id });
                          setToast('案件を再オープンしました。');
                          refetch();
                        } catch {
                          setToast('操作が競合しました。少し時間をおいて再試行してください。');
                        }
                      }}
                    >
                      元に戻す
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  完了済み案件はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
