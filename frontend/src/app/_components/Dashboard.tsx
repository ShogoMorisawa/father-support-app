'use client';
import { useDashboard, useUndoMutation } from '@/lib/api/hooks';
import Link from 'next/link';
import { useState } from 'react';
import Toast from './Toast';

function ymdJst(d = new Date()) {
  // JST YYYY-MM-DD
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const today = ymdJst();
  const { data, refetch } = useDashboard({
    date: today,
    estimatesLimit: 3,
    tasksLimit: 5,
    deliveriesLimit: 3,
    historyLimit: 5,
    lowLimit: 3,
  });
  const d = data?.data;
  const undo = useUndoMutation();
  const [toast, setToast] = useState<string | null>(null);

  const estimates: any[] = d?.estimates ?? [];
  const tasks: any[] = d?.tasks ?? [];
  const deliveries: any[] = d?.deliveries ?? [];
  const low = d?.lowStock ?? { count: 0, items: [] };
  const history: any[] = d?.history?.items ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">対象日：{d?.date ?? today}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 見積 */}
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">
              見積予定（次の{estimates.filter((e) => e.status === 'scheduled').length}件）
            </h2>
            <div className="flex items-center gap-3">
              <Link href="/estimates/new" className="text-sm underline">
                新規作成
              </Link>
              <Link href="/estimates" className="text-sm underline">
                一覧
              </Link>
            </div>
          </div>
          <ul className="space-y-2">
            {estimates
              .filter((e) => e.status === 'scheduled')
              .map((e) => (
                <li key={`est-${e.id}`} className="text-sm">
                  <div className="text-gray-600">
                    {new Date(e.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                  </div>
                  <div className="font-medium">{e.customerName ?? '（無名）'}</div>
                </li>
              ))}
            {estimates.filter((e) => e.status === 'scheduled').length === 0 && (
              <li className="text-sm text-gray-500">予定されている見積はありません。</li>
            )}
          </ul>
        </section>

        {/* 作業 */}
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">作業（期日順）</h2>
            <Link href="/tasks" className="text-sm underline">
              一覧
            </Link>
          </div>
          <ul className="space-y-2">
            {tasks
              .filter((t) => t.status !== 'done')
              .map((t) => (
                <li key={`task-${t.id}`} className="text-sm">
                  <div className="text-gray-600">{t.dueOn ?? '-'}</div>
                  <div className="font-medium">
                    {t.customerName ?? '-'} / {t.title}
                  </div>
                </li>
              ))}
            {tasks.filter((t) => t.status !== 'done').length === 0 && (
              <li className="text-sm text-gray-500">未完了の作業はありません。</li>
            )}
          </ul>
        </section>

        {/* 納品 */}
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">納品予定</h2>
            <div className="flex items-center gap-3">
              <Link href="/deliveries/tools" className="text-sm underline">
                調整ツール
              </Link>
              <Link href="/deliveries" className="text-sm underline">
                一覧
              </Link>
            </div>
          </div>
          <ul className="space-y-2">
            {deliveries.map((d) => (
              <li key={`del-${d.id}`} className="text-sm">
                <div className="text-gray-600">{d.date}</div>
                <div className="font-medium">
                  {d.customerName ?? '-'} / {d.title}
                </div>
              </li>
            ))}
            {deliveries.length === 0 && (
              <li className="text-sm text-gray-500">納品予定はありません。</li>
            )}
          </ul>
        </section>

        {/* 在庫 */}
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">在庫アラート</h2>
            <div className="flex items-center gap-3">
              <Link href="/inventory/order" className="text-sm underline">
                発注テンプレ
              </Link>
              <Link href="/inventory" className="text-sm underline">
                在庫一覧
              </Link>
            </div>
          </div>
          {low.count === 0 ? (
            <p className="text-sm text-gray-600">在庫は十分です。</p>
          ) : (
            <ul className="space-y-2">
              {low.items.map((m: any) => (
                <li key={`low-${m.materialId}`} className="text-sm">
                  ・{m.name}（{m.currentQty} / {m.thresholdQty}）
                </li>
              ))}
              {low.count > low.items.length && (
                <li className="text-xs text-gray-500">ほか {low.count - low.items.length} 件</li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* 顧客一覧 */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">顧客一覧</h2>
          <div className="flex items-center gap-3">
            <Link href="/customers/new" className="text-sm underline">
              新規登録
            </Link>
            <Link href="/customers" className="text-sm underline">
              一覧を見る
            </Link>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          顧客の登録・編集・検索ができます。最近更新された顧客情報も確認できます。
        </p>
      </section>

      {/* 履歴（Undo可） */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">最近の履歴</h2>
          <Link className="text-sm underline" href="/history">
            履歴一覧
          </Link>
        </div>
        <ul className="space-y-2">
          {history.map((h) => {
            const key = `h-${h.id}-${h.createdAt ?? ''}`;
            return (
              <li key={key} className="text-sm flex items-center justify-between">
                <div>
                  <span className="text-gray-600 mr-2">
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                      : '-'}
                  </span>
                  <span>{h.summary}</span>
                </div>
                <div>
                  <button
                    className="text-sm underline disabled:opacity-50"
                    disabled={!h.canUndo}
                    onClick={async () => {
                      try {
                        await undo.mutateAsync(h.inverse);
                        setToast('元に戻しました。');
                        refetch();
                      } catch {
                        setToast('操作が競合しました。少し時間をおいて再試行してください');
                      }
                    }}
                  >
                    元に戻す
                  </button>
                </div>
              </li>
            );
          })}
          {history.length === 0 && <li className="text-sm text-gray-500">履歴はありません。</li>}
        </ul>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
