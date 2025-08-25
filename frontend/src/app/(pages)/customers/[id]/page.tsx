'use client';
import Toast from '@/app/_components/Toast';
import { PhoneLink, AddressLink, QuickActionButton } from '@/app/_components/CustomerInfo';
import { useCustomer, useUpdateCustomer } from '@/lib/api/hooks';
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
          <div className="text-2xl font-bold text-green-600">{stats.completedProjectsCount || 0}</div>
          <div className="text-sm text-gray-600">完了案件</div>
        </div>
      </div>
    </div>
  );
}

// 最近の活動タイムライン
function RecentActivity({ customerId }: { customerId: number }) {
  // 仮のデータ（後でAPIから取得）
  const activities = [
    {
      id: 1,
      date: '2025/08/25',
      time: '10:30',
      type: '見積作成',
      description: '障子 3枚',
      link: '/estimates/1'
    },
    {
      id: 2,
      date: '2025/08/27',
      time: '17:00',
      type: '作業完了',
      description: '網戸 2枚 在庫: 紙 −2',
      link: '/projects/2'
    },
    {
      id: 3,
      date: '2025/08/28',
      time: '15:10',
      type: '納品完了',
      description: '案件完了',
      link: '/deliveries/3'
    }
  ];
  
  return (
    <div className="rounded border bg-white p-4">
      <div className="font-medium mb-3 text-lg">最近の活動</div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
            <div className="text-sm text-gray-500 min-w-[80px]">
              {activity.date}<br />
              {activity.time}
            </div>
            <div className="flex-1">
              <div className="font-medium">{activity.type}</div>
              <div className="text-sm text-gray-600">{activity.description}</div>
            </div>
            <Link
              href={activity.link}
              className="text-blue-600 hover:underline text-sm"
            >
              詳細 →
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t">
        <Link
          href={`/history?customer=${customerId}`}
          className="text-blue-600 hover:underline text-sm"
        >
          すべての履歴を見る →
        </Link>
      </div>
    </div>
  );
}

// 関連リスト（ミニ一覧）
function RelatedLists({ customerId }: { customerId: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 未完了の作業 */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">未完了の作業</div>
        <div className="text-sm text-gray-600 mb-2">
          期日順、最新3件
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <div className="font-medium">障子張り替え</div>
            <div className="text-gray-500">期日: 2025/09/01</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">網戸交換</div>
            <div className="text-gray-500">期日: 2025/09/05</div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t">
          <Link
            href={`/tasks?customer=${customerId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            すべて見る →
          </Link>
        </div>
      </div>

      {/* 未完了の納品 */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">未完了の納品</div>
        <div className="text-sm text-gray-600 mb-2">
          期日順、最新3件
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <div className="font-medium">障子 3枚</div>
            <div className="text-gray-500">予定日: 2025/09/02</div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t">
          <Link
            href={`/deliveries?customer=${customerId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            すべて見る →
          </Link>
        </div>
      </div>

      {/* 見積 */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">見積</div>
        <div className="text-sm text-gray-600 mb-2">
          直近3件
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <div className="font-medium">障子張り替え</div>
            <div className="text-gray-500">2025/08/25 作成</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">網戸交換</div>
            <div className="text-gray-500">2025/08/20 作成</div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t">
          <Link
            href={`/estimates?customer=${customerId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            見積一覧へ →
          </Link>
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
  const [form, setForm] = useState<any>({});
  const [memo, setMemo] = useState('');
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
      setMemo(c.memo ?? '');
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

  const handleMemoSave = async () => {
    try {
      // メモ更新用のAPI呼び出し（後で実装）
      setToast('メモを更新しました。');
    } catch {
      setToast('メモの更新に失敗しました。');
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
            {form.phone && <PhoneLink phone={form.phone} />}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">住所</label>
            <input
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            {form.address && <AddressLink address={form.address} />}
          </div>
        </div>

        {/* メモ欄 */}
        <div>
          <label className="block text-sm font-medium mb-1">メモ</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="作業上の注意点・リピート希望など"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              履歴とは別に最新状態を一つ保持
            </p>
            <button
              onClick={handleMemoSave}
              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
            >
              メモ保存
            </button>
          </div>
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

      {/* 最近の活動 */}
      <RecentActivity customerId={id} />

      {/* 関連リスト */}
      <RelatedLists customerId={id} />

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
          <QuickActionButton
            href={`/projects?customer=${id}`}
            variant="green"
          >
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
