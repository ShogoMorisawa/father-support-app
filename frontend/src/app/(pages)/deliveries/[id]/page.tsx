'use client';
import Toast from '@/app/_components/Toast';
import {
  useCompleteProject,
  useDeliveryDetail,
  useRevertDeliveryComplete,
  useTogglePrepared,
} from '@/lib/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

function ymd(d?: string) {
  if (!d) return '-';
  const dt = new Date(`${d}T00:00:00+09:00`);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function formatJstDateTime(iso?: string) {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error, refetch } = useDeliveryDetail(id);
  const payload = data?.data;
  const queryClient = useQueryClient();
  // APIレスポンスの構造に合わせて修正
  const d = payload;
  // プレースホルダ（空/「作業」）はUIに出さない
  const tasks: any[] = (payload?.tasks ?? []).filter((t: any) => {
    const title = String(t?.title ?? '').trim();
    return title.length > 0 && title !== '作業';
  });
  // allPreparedの計算を修正（完了済みタスクは準備完了とみなす）
  const allPrepared: boolean =
    tasks.length > 0 && tasks.every((t: any) => t.status === 'done' || !!t.preparedAt);

  const toggle = useTogglePrepared(id);
  const revertDeliveryComplete = useRevertDeliveryComplete(id);
  const [openComplete, setOpenComplete] = useState(false);
  const [completedAt, setCompletedAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    // ローカル(UTCオフセット反映)で yyyy-MM-ddTHH:mm フォーマット
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());

  const projectId = d?.projectId ? Number(d.projectId) : undefined;
  // hooks は条件分岐できないため、常に生成。クリック時と disabled で projectId をガード
  const completeProject = useCompleteProject(projectId ?? 1);

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">納品詳細</h1>
        <Link href="/deliveries" className="underline text-sm">
          一覧へ戻る
        </Link>
      </div>

      {isLoading && <p>読み込み中です…</p>}
      {error && <p className="text-red-600 text-sm">通信に失敗しました。</p>}
      {d && (
        <div className="rounded border bg-white p-4 space-y-2">
          <div className="text-sm text-gray-600">納品日：{ymd(d.date)}</div>
          <div className="text-sm">
            <span className="text-gray-600">顧客：</span>
            {d.customerName ?? '-'}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">件名：</span>
            {d.title}
          </div>
          {d.completedAt && (
            <div className="text-sm">
              <span className="text-gray-600">完了日時：</span>
              {formatJstDateTime(d.completedAt)}
            </div>
          )}
        </div>
      )}

      {/* チェックリスト */}
      <section className="rounded border bg-white p-4">
        <div className="font-bold mb-2">チェックリスト</div>
        <ul className="space-y-2">
          {tasks.map((t) => {
            const prepared = !!t.preparedAt;
            const statusDone = t.status === 'done';
            return (
              <li key={t.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepared && statusDone}
                      disabled={pending.has(t.id)}
                      onChange={async (e) => {
                        setPending((s) => new Set(s).add(t.id));
                        try {
                          await toggle.mutateAsync({ taskId: t.id, prepared: e.target.checked });
                        } catch (error: any) {
                          // エラーメッセージを詳細に表示
                          const errorMessage =
                            error.response?.data?.error?.message ||
                            '更新に失敗しました。しばらくしてから再試行してください。';
                          setToast(errorMessage);
                        } finally {
                          setPending((s) => {
                            const n = new Set(s);
                            n.delete(t.id);
                            return n;
                          });
                        }
                      }}
                    />
                    <span className="font-medium">{t.title}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {statusDone ? '完了' : '未完了'}
                    </span>
                    {/* 在庫アラートバッジ */}
                    {t.stockSufficient === false && (
                      <div className="relative group">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-red-100 text-red-800 ml-2">
                          在庫不足
                        </span>
                        {/* ツールチップ */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {t.insufficientMaterials?.map((m: any, index: number) => (
                            <div key={index}>
                              不足: {m.materialName} × {m.needed}（在庫 {m.available}）
                            </div>
                          ))}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </label>
                  {!!t.materials?.length && (
                    <div className="text-xs text-gray-600 mt-1">
                      材料予定：
                      {t.materials
                        .map((m: any) => `${m.materialName ?? '-'}×${m.qtyPlanned ?? '-'}`)
                        .join(' / ')}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {tasks.length === 0 && (
            <li className="text-sm text-gray-500">この納品に紐づくタスクはありません。</li>
          )}
        </ul>
      </section>

      {/* 納品完了/完了取り消し */}
      {projectId && (
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">
                {d?.status === 'delivered' ? '納品完了取り消し' : '納品完了'}
              </div>
              <p className="text-sm text-gray-600">
                {d?.status === 'delivered'
                  ? '完了を取り消して未完了に戻すことができます。'
                  : '全てのチェックが済むと、完了できます。'}
              </p>
            </div>
            {d?.status === 'delivered' ? (
              <button
                className="rounded px-3 py-2 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={revertDeliveryComplete.isPending}
                onClick={async () => {
                  if (confirm('納品完了を取り消しますか？')) {
                    try {
                      await revertDeliveryComplete.mutateAsync();
                      setToast('納品完了を取り消しました。');
                    } catch (error: any) {
                      const errorMessage =
                        error.response?.data?.error?.message || '完了取り消しに失敗しました。';
                      setToast(errorMessage);
                    }
                  }
                }}
              >
                {revertDeliveryComplete.isPending ? '取り消し中…' : '完了取り消し'}
              </button>
            ) : (
              <button
                className="rounded px-3 py-2 text-white disabled:opacity-50"
                style={{ background: allPrepared && projectId ? '#111' : '#999' }}
                disabled={!allPrepared || !projectId || completeProject.isPending}
                onClick={() => setOpenComplete(true)}
              >
                納品完了にする
              </button>
            )}
          </div>
        </section>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {openComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-4 space-y-3 shadow-lg">
            <div className="text-lg font-bold">納品完了</div>
            <div className="text-sm text-gray-600">完了日時を確認/編集できます。</div>
            <label className="block">
              <span className="text-sm text-gray-600">完了日時</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border px-3 py-2"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="rounded border px-3 py-2" onClick={() => setOpenComplete(false)}>
                キャンセル
              </button>
              <button
                className="rounded bg-black text-white px-3 py-2 disabled:opacity-50"
                disabled={completeProject.isPending}
                onClick={async () => {
                  try {
                    const res = await completeProject.mutateAsync({
                      completedAt: new Date(completedAt).toISOString(),
                    });
                    setOpenComplete(false);

                    const low = res?.data?.lowStock ?? [];
                    if (low.length > 0) {
                      const msg = low
                        .slice(0, 3) // 長すぎないよう上位3件だけ出す
                        .map((m: any) => `${m.name} (${m.currentQty}/${m.thresholdQty})`)
                        .join('、');
                      setToast(
                        `納品完了。要補充：${msg}${
                          low.length > 3 ? ` ほか${low.length - 3}件` : ''
                        }`,
                      );
                    } else {
                      setToast('納品を完了しました。');
                    }

                    // データを再取得して完了後の状態を表示
                    await refetch();
                  } catch {
                    setToast('完了できませんでした。履歴をご確認ください。');
                  }
                }}
              >
                {completeProject.isPending ? '送信中…' : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
