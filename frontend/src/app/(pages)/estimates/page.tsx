'use client';
import EstimateCreateDialog from '@/app/_components/EstimateCreateDialog';
import Toast from '@/app/_components/Toast';
import { useCompleteEstimate, useEstimates } from '@/lib/api/hooks';
import { useMemo, useState } from 'react';

function todayJst() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const d = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function EstimatesPage() {
  const from = useMemo(() => todayJst(), []);
  const { data, isLoading } = useEstimates({ from, limit: 50 });
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const items = data?.data?.items ?? [];

  return (
    <main className="p-4 space-y-4 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">見積もり予定一覧</h1>
        <button className="rounded bg-black text-white px-3 py-1" onClick={() => setOpen(true)}>
          新規見積を追加
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中です…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">見積もり予定はありません。</p>
      ) : (
        <div className="grid gap-2">
          {items.map((e) => (
            <div
              key={`${e.id}-${new Date(e.scheduledAt).getTime()}`}
              className="rounded border p-3 bg-white"
            >
              <div className="font-medium">{e.customerName}</div>
              <div className="text-gray-600">
                {new Date(e.scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </div>
              <div className="text-gray-600">
                {e.address} / {e.phone}
              </div>
              {e.memo && <div className="text-gray-500 mt-1">{e.memo}</div>}
              {e.status === 'scheduled' ? (
                <div className="mt-2 flex gap-2">
                  <ConfirmButtons id={e.id} onToast={(msg) => setToast(msg)} />
                </div>
              ) : (
                <div className="mt-2 text-xs inline-block rounded bg-gray-100 px-2 py-0.5">
                  確定済み
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <EstimateCreateDialog
          open={open}
          onClose={() => setOpen(false)}
          onDone={(m) => setToast(m || '登録しました。')}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}

function ConfirmButtons({ id, onToast }: { id: number; onToast: (m: string) => void }) {
  const acceptMut = useCompleteEstimate(id);
  const rejectMut = useCompleteEstimate(id);
  const busy = acceptMut.isPending || rejectMut.isPending;

  return (
    <>
      <button
        className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-60"
        disabled={busy}
        onClick={async () => {
          const res = await acceptMut.mutateAsync({ accepted: true });
          const pid = (res as any)?.data?.projectId as number | undefined;
          onToast(pid ? `成立しました。案件(#${pid})を作成しました。` : '成立しました。');
        }}
      >
        成立
      </button>
      <button
        className="px-3 py-1 rounded border disabled:opacity-60"
        disabled={busy}
        onClick={async () => {
          await rejectMut.mutateAsync({ accepted: false });
          onToast('不成立で確定しました。');
        }}
      >
        不成立
      </button>
    </>
  );
}
