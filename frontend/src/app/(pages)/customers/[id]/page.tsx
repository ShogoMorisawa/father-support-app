'use client';
import Toast from '@/app/_components/Toast';
import { useCustomer, useUpdateCustomer } from '@/lib/api/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, refetch } = useCustomer(id);
  const update = useUpdateCustomer(id);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const c = data?.data?.customer;
    if (c)
      setForm({
        name: c.name ?? '',
        nameKana: c.nameKana ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
      });
  }, [data]);

  const stats = data?.data?.stats;

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客詳細</h1>
        <div className="text-sm">
          <Link className="underline" href="/customers">
            一覧へ戻る
          </Link>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">名前</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">カナ</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.nameKana || ''}
              onChange={(e) => setForm({ ...form, nameKana: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">電話</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">住所</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <button
          className="rounded bg-black text-white px-3 py-2"
          onClick={async () => {
            try {
              await update.mutateAsync(form);
              setToast('顧客情報を更新しました。');
              refetch();
            } catch {
              setToast('更新に失敗しました。入力内容をご確認ください。');
            }
          }}
        >
          保存
        </button>
      </div>

      {stats && (
        <div className="rounded border bg-white p-4">
          <div className="font-medium mb-2">統計</div>
          <ul className="text-sm space-y-1">
            <li>見積件数: {stats.estimatesCount}</li>
            <li>
              案件総数: {stats.projectsCount}（進行中: {stats.activeProjectsCount} / 完了:{' '}
              {stats.completedProjectsCount}）
            </li>
            <li>未納品: {stats.deliveriesPendingCount}</li>
          </ul>
        </div>
      )}

      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">この顧客で見積を作成</div>
        <Link
          className="underline text-sm"
          href={`/estimates/new?name=${encodeURIComponent(
            form.name || '',
          )}&phone=${encodeURIComponent(form.phone || '')}&address=${encodeURIComponent(
            form.address || '',
          )}`}
        >
          見積作成フォームを開く
        </Link>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
