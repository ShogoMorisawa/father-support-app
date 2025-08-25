'use client';
import { QuickActionButton } from '@/app/_components/CustomerInfo';
import Toast from '@/app/_components/Toast';
import {
  useCreateCustomerMemo,
  useCustomer,
  useCustomerMemos,
  useRecentProjectsByCustomer,
  useUpdateCustomer,
} from '@/lib/api/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// 統計サマリーカード
function StatsSummary({ stats }: { stats: any }) {
  if (!stats) return null;

  return (
    <div className="rounded border bg-white p-4">
      <div className="font-medium mb-3 text-lg">サマリー</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.estimatesCount || 0}</div>
          <div className="text-sm text-gray-600">見積件数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.activeProjectsCount || 0}</div>
          <div className="text-sm text-gray-600">進行中作業</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.deliveriesPendingCount || 0}</div>
          <div className="text-sm text-gray-600">未納品</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.completedProjectsCount || 0}
          </div>
          <div className="text-sm text-gray-600">完了案件</div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, refetch } = useCustomer(id);
  const update = useUpdateCustomer(id);
  const { data: memosData } = useCustomerMemos(id, 20);
  const createMemo = useCreateCustomerMemo(id);
  const { data: recentProjects } = useRecentProjectsByCustomer(id, 10);
  const [form, setForm] = useState<any>({});
  const [newMemo, setNewMemo] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const c = data?.data?.customer;
    if (c) {
      setForm({
        name: c.name ?? '',
        nameKana: c.nameKana ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
      });
    }
  }, [data]);

  const stats = data?.data?.stats;
  const customer = data?.data?.customer;

  const handleSave = async () => {
    try {
      await update.mutateAsync(form);
      setToast('顧客情報を更新しました。');
      refetch();
    } catch {
      setToast('更新に失敗しました。入力内容をご確認ください。');
    }
  };

  if (!customer) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客詳細</h1>
        <div className="text-sm">
          <Link className="underline" href="/customers">
            一覧へ戻る
          </Link>
        </div>
      </div>

      {/* 上部カード（編集フォーム） */}
      <div className="rounded border bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">名前</label>
            <input
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">カナ</label>
            <input
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.nameKana || ''}
              onChange={(e) => setForm({ ...form, nameKana: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">電話</label>
            <input
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">住所</label>
            <input
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        {/* メモ（複数） */}
        <div className="space-y-3">
          <div className="font-medium text-lg">メモ</div>
          <div>
            <textarea
              className="w-full border rounded px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="作業上の注意点・リピート希望など"
            />
            <div className="flex justify-end mt-2">
              <button
                className="bg-gray-900 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                disabled={!newMemo.trim() || createMemo.isPending}
                onClick={async () => {
                  try {
                    await createMemo.mutateAsync(newMemo.trim());
                    setNewMemo('');
                    setToast('メモを追加しました。');
                  } catch {
                    setToast('メモの追加に失敗しました。');
                  }
                }}
              >
                {createMemo.isPending ? '保存中…' : 'メモを追加'}
              </button>
            </div>
          </div>

          <ul className="divide-y">
            {(memosData?.items ?? []).map((m: any) => (
              <li key={m.id} className="py-2">
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(m.created_at || m.createdAt).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                  })}
                </div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </li>
            ))}
            {(memosData?.items ?? []).length === 0 && (
              <li className="py-4 text-sm text-gray-500">メモはまだありません。</li>
            )}
          </ul>
        </div>

        <button
          className="rounded bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors"
          onClick={handleSave}
        >
          保存
        </button>
      </div>

      {/* 統計サマリー */}
      <StatsSummary stats={stats} />

      {/* 最近の案件 */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-3 text-lg">最近の案件</div>
        <ul className="divide-y">
          {(recentProjects?.items ?? []).map((p: any) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.title ?? `案件 #${p.id}`}</div>
                <div className="text-xs text-gray-500">
                  最終更新：
                  {p.lastActivityAt
                    ? new Date(p.lastActivityAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                    : '—'}
                  {p.lastActivitySummary ? ` / ${p.lastActivitySummary}` : ''}
                </div>
                <div className="text-xs text-gray-500">期日：{p.dueOn ?? '—'}</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs
                    ${
                      p.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : p.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {p.status === 'completed'
                      ? '完了'
                      : p.status === 'in_progress'
                      ? '進行中'
                      : p.status}
                  </span>
                </div>
              </div>
              <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline text-sm">
                詳細 →
              </Link>
            </li>
          ))}
          {(recentProjects?.items ?? []).length === 0 && (
            <li className="py-4 text-sm text-gray-500">最近の案件はありません。</li>
          )}
        </ul>
      </div>

      {/* クイックアクション */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-3 text-lg">クイックアクション</div>
        <div className="flex flex-wrap gap-3">
          <QuickActionButton
            href={`/estimates/new?name=${encodeURIComponent(
              form.name || '',
            )}&phone=${encodeURIComponent(form.phone || '')}&address=${encodeURIComponent(
              form.address || '',
            )}`}
            variant="blue"
          >
            この顧客で見積作成
          </QuickActionButton>
          <QuickActionButton href={`/projects?customer=${id}`} variant="green">
            案件一覧を見る
          </QuickActionButton>
          <QuickActionButton
            onClick={() => setToast('写真機能は今後のアップデートで追加予定です。')}
            variant="purple"
          >
            写真を見る
          </QuickActionButton>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
