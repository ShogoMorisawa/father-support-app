'use client';
import { useDeliveries } from '@/lib/api/hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type TabType = 'pending' | 'completed' | 'all';

type GroupedDeliveries = {
  today: any[];
  tomorrow: any[];
  later: any[];
};

function formatJstYmd(dateStr?: string) {
  if (!dateStr) return '-';
  // APIは YYYY-MM-DD を返すので JST 00:00 固定で解釈
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function isTodayJst(ymd: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
  return ymd === today;
}

function isTomorrowJst(ymd: string): boolean {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Tokyo',
  });
  return ymd === tomorrow;
}

function groupDeliveries(items: any[]): GroupedDeliveries {
  const groups: GroupedDeliveries = {
    today: [],
    tomorrow: [],
    later: [],
  };

  items.forEach((item) => {
    const date = item.date;
    if (!date) {
      groups.later.push(item);
      return;
    }

    if (isTodayJst(date)) {
      groups.today.push(item);
    } else if (isTomorrowJst(date)) {
      groups.tomorrow.push(item);
    } else {
      groups.later.push(item);
    }
  });

  // 各グループ内を日付順でソート（既にAPIでソート済みだが念のため）
  const sortByDate = (a: any, b: any) => {
    if (!a.date || !b.date) return 0;
    return a.date.localeCompare(b.date);
  };

  groups.today.sort(sortByDate);
  groups.tomorrow.sort(sortByDate);
  groups.later.sort(sortByDate);

  return groups;
}

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // すべての納品を取得（クライアント側でフィルタリング）
  const { data, isLoading, error } = useDeliveries({
    status: 'all',
    order: 'date.asc',
    limit: 500,
  });

  const items = data?.data?.items ?? [];

  // タブに応じた納品のフィルタリング
  const getFilteredDeliveries = () => {
    switch (activeTab) {
      case 'pending':
        return items.filter((d: any) => d.status === 'pending');
      case 'completed':
        return items.filter((d: any) => d.status === 'delivered' || d.status === 'cancelled');
      case 'all':
        return items;
      default:
        return items.filter((d: any) => d.status === 'pending');
    }
  };

  const filteredDeliveries = getFilteredDeliveries();
  const groupedDeliveries = useMemo(
    () => groupDeliveries(filteredDeliveries),
    [filteredDeliveries],
  );

  // 各タブの件数を計算
  const pendingCount = items.filter((d: any) => d.status === 'pending').length;
  const completedCount = items.filter(
    (d: any) => d.status === 'delivered' || d.status === 'cancelled',
  ).length;
  const allCount = items.length;

  // ステータスバッジの表示
  const renderStatusBadge = (delivery: any) => {
    if (delivery.status === 'delivered') {
      return (
        <span className="inline-block px-2 py-1 rounded text-xs bg-green-100 text-green-800">
          完了
        </span>
      );
    } else if (delivery.status === 'cancelled') {
      return (
        <span className="inline-block px-2 py-1 rounded text-xs bg-red-100 text-red-800">
          キャンセル
        </span>
      );
    } else if (delivery.status === 'pending') {
      if (delivery.allPrepared) {
        return (
          <span className="inline-block px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
            完了可能
          </span>
        );
      } else {
        return (
          <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
            未完了
          </span>
        );
      }
    }
    return null;
  };

  // グループヘッダーの表示
  const renderGroupHeader = (title: string, count: number) => {
    if (count === 0) return null;

    return (
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3 -mx-4 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {title} ({count})
        </h2>
      </div>
    );
  };

  // 納品カードの表示
  const renderDeliveryCard = (delivery: any, showDate: boolean = false) => {
    const date = formatJstYmd(delivery.date);
    const displayDate = showDate ? date : '';

    return (
      <Link
        href={`/deliveries/${delivery.id}`}
        className="block rounded border bg-white p-4 space-y-3 hover:shadow-md transition-shadow"
      >
        {/* 1行目：顧客名（太字）＋ステータスバッジ */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">{delivery.customerName}</div>
          {renderStatusBadge(delivery)}
        </div>

        {/* 2行目：件名 */}
        <div className="text-sm">{delivery.title || '納品'}</div>

        {/* 3行目：日付（見出しと同じ日の場合は省略OK） */}
        {displayDate && <div className="text-sm text-gray-600">{displayDate}</div>}
      </Link>
    );
  };

  if (isLoading) {
    return <p className="p-4">読み込み中です…</p>;
  }
  if (error) {
    return <p className="p-4 text-red-600">通信に失敗しました。再試行してください</p>;
  }

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">納品一覧</h1>
        <div className="flex items-center gap-3">
          <Link href="/deliveries/tools" className="text-sm underline">
            調整ツール
          </Link>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="border-b">
        <div className="flex gap-6">
          <button
            className={`pb-2 px-1 border-b-2 font-medium ${
              activeTab === 'pending'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            未完了 ({pendingCount})
          </button>
          <button
            className={`pb-2 px-1 border-b-2 font-medium ${
              activeTab === 'completed'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            完了 ({completedCount})
          </button>
          <button
            className={`pb-2 px-1 border-b-2 font-medium ${
              activeTab === 'all'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('all')}
          >
            すべて ({allCount})
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 今日の納品 */}
        {renderGroupHeader('今日', groupedDeliveries.today.length)}
        {groupedDeliveries.today.length > 0 && (
          <div className="space-y-3">
            {groupedDeliveries.today.map((delivery, index) => (
              <div key={`today-${delivery.id}-${index}`}>{renderDeliveryCard(delivery, false)}</div>
            ))}
          </div>
        )}

        {/* 明日の納品 */}
        {renderGroupHeader('明日', groupedDeliveries.tomorrow.length)}
        {groupedDeliveries.tomorrow.length > 0 && (
          <div className="space-y-3">
            {groupedDeliveries.tomorrow.map((delivery, index) => (
              <div key={`tomorrow-${delivery.id}-${index}`}>
                {renderDeliveryCard(delivery, false)}
              </div>
            ))}
          </div>
        )}

        {/* 以降の納品 */}
        {renderGroupHeader('以降', groupedDeliveries.later.length)}
        {groupedDeliveries.later.length > 0 && (
          <div className="space-y-3">
            {groupedDeliveries.later.map((delivery, index) => (
              <div key={`later-${delivery.id}-${index}`}>{renderDeliveryCard(delivery, true)}</div>
            ))}
          </div>
        )}

        {/* 納品がない場合 */}
        {filteredDeliveries.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            {activeTab === 'pending' && '未完了の納品はありません。'}
            {activeTab === 'completed' && '完了済みの納品はありません。'}
            {activeTab === 'all' && '納品はありません。'}
          </p>
        )}
      </div>
    </main>
  );
}
