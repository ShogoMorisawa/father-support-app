'use client';
import Toast from '@/app/_components/Toast';
import {
  useCompleteProject,
  useCompleteTask,
  useDeliveryDetail,
  useRevertCompleteTask,
  useTogglePrepared,
} from '@/lib/api/hooks';
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

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error, refetch } = useDeliveryDetail(id);
  const payload = data?.data;
  const d = payload?.delivery;
  // プレースホルダ（空/「作業」）はUIに出さない
  const tasks: any[] = (payload?.tasks ?? []).filter((t: any) => {
    const title = String(t?.title ?? '').trim();
    return title.length > 0 && title !== '作業';
  });
  const allPrepared: boolean = !!payload?.allPrepared;

  const toggle = useTogglePrepared(id);
  const [toast, setToast] = useState<string | null>(null);

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
        </div>
      )}

      {/* チェックリスト */}
      <section className="rounded border bg-white p-4">
        <div className="font-bold mb-2">チェックリスト</div>
        <ul className="space-y-2">
          {tasks.map((t) => {
            const prepared = !!t.preparedAt;
            return (
              <li key={t.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prepared}
                      onChange={async (e) => {
                        try {
                          await toggle.mutateAsync({ taskId: t.id, prepared: e.target.checked });
                        } catch {
                          setToast('チェック更新に失敗しました。');
                        }
                      }}
                    />
                    <span className="font-medium">{t.title}</span>
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
                <TaskCompleteButtons
                  taskId={t.id}
                  onDone={() => {
                    setToast('作業を完了にしました。');
                    refetch();
                  }}
                  onRevert={() => {
                    setToast('作業完了を取り消しました。');
                    refetch();
                  }}
                />
              </li>
            );
          })}
          {tasks.length === 0 && (
            <li className="text-sm text-gray-500">この納品に紐づくタスクはありません。</li>
          )}
        </ul>
      </section>

      {/* 納品完了 */}
      {projectId && (
        <section className="rounded border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">納品完了</div>
              <p className="text-sm text-gray-600">全てのチェックが済むと、完了できます。</p>
            </div>
            <button
              className="rounded px-3 py-2 text-white disabled:opacity-50"
              style={{ background: allPrepared && projectId ? '#111' : '#999' }}
              disabled={!allPrepared || !projectId || completeProject.isPending}
              onClick={async () => {
                if (!projectId) return;
                try {
                  await completeProject.mutateAsync();
                  setToast('納品を完了しました。');
                } catch {
                  setToast('完了できませんでした。履歴をご確認ください。');
                }
              }}
            >
              納品完了にする
            </button>
          </div>
        </section>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}

function TaskCompleteButtons({
  taskId,
  onDone,
  onRevert,
}: {
  taskId: number;
  onDone: () => void;
  onRevert: () => void;
}) {
  const complete = useCompleteTask(taskId);
  const revert = useRevertCompleteTask(taskId);
  return (
    <div className="flex items-center gap-2">
      <button
        className="underline text-sm"
        onClick={async () => {
          try {
            await complete.mutateAsync();
            onDone();
          } catch (e: any) {
            // 409（二重完了）などは優しく案内
            onDone();
          }
        }}
      >
        作業完了にする
      </button>
      <button
        className="underline text-sm"
        onClick={async () => {
          try {
            await revert.mutateAsync();
            onRevert();
          } catch {
            onRevert();
          }
        }}
      >
        完了を取り消す
      </button>
    </div>
  );
}
