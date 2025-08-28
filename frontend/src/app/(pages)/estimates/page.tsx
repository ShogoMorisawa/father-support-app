'use client';
import EditEstimateScheduleModal from '@/app/_components/EditEstimateScheduleModal';
import EstimateStatusBadge from '@/app/_components/EstimateStatusBadge';
import StockBadge from '@/app/_components/StockBadge';
import Toast from '@/app/_components/Toast';
import { useCompleteEstimate, useEstimates, useUpdateEstimate } from '@/lib/api/hooks';
import { formatQtyDiff } from '@/lib/format/quantity';
import { isoToJstHm, isoToJstYmd, todayJstYmd, tomorrowJstYmd } from '@/lib/time';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type TabType = 'pending' | 'completed' | 'all';

type GroupedEstimates = {
  today: any[];
  tomorrow: any[];
  later: any[];
};

export default function EstimatesPage() {
  const { data, refetch } = useEstimates(undefined, 20, true); // withStock=true で在庫情報を取得
  const items: any[] = data?.data?.items ?? [];
  const complete = useCompleteEstimate();
  const updateEstimate = useUpdateEstimate();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    estimateId: number;
    scheduledAt: string;
  } | null>(null);
  const router = useRouter();

  // タブに応じた見積もりのフィルタリング
  const getFilteredEstimates = () => {
    switch (activeTab) {
      case 'pending':
        return items.filter((e) => e.status === 'scheduled');
      case 'completed':
        return items.filter((e) => e.status === 'completed');
      case 'all':
        return items;
      default:
        return items.filter((e) => e.status === 'scheduled');
    }
  };

  const filteredEstimates = getFilteredEstimates();

  // 日付グルーピング（Intl.DateTimeFormatを使用）
  const groupedEstimates = useMemo((): GroupedEstimates => {
    const today = todayJstYmd();
    const tomorrow = tomorrowJstYmd();

    console.log('=== 日付グルーピング デバッグ ===');
    console.log('今日の日付:', today);
    console.log('明日の日付:', tomorrow);

    const groups: GroupedEstimates = {
      today: [],
      tomorrow: [],
      later: [],
    };

    filteredEstimates.forEach((estimate) => {
      const estimateYmd = isoToJstYmd(estimate.scheduledAt);

      console.log(`見積もり ${estimate.id}:`, {
        scheduledAt: estimate.scheduledAt,
        estimateYmd: estimateYmd,
        today: today,
        tomorrow: tomorrow,
        isToday: estimateYmd === today,
        isTomorrow: estimateYmd === tomorrow,
      });

      if (estimateYmd === today) {
        groups.today.push(estimate);
      } else if (estimateYmd === tomorrow) {
        groups.tomorrow.push(estimate);
      } else {
        groups.later.push(estimate);
      }
    });

    console.log('グループ分け結果:', {
      today: groups.today.length,
      tomorrow: groups.tomorrow.length,
      later: groups.later.length,
    });

    // 各グループ内を時刻順でソート
    const sortByTime = (a: any, b: any) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();

    groups.today.sort(sortByTime);
    groups.tomorrow.sort(sortByTime);
    groups.later.sort(sortByTime);

    return groups;
  }, [filteredEstimates]);

  // 電話番号のtel:リンク生成
  const getPhoneHref = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : '';
  };

  // Google Mapsリンク生成
  const getMapsHref = (address?: string) => {
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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

  // 見積もりカードの表示
  const renderEstimateCard = (e: any, showDate: boolean = false) => {
    const time = isoToJstHm(e.scheduledAt);
    const date = isoToJstYmd(e.scheduledAt);
    const phoneHref = getPhoneHref(e.customer?.phone);
    const mapsHref = getMapsHref(e.customer?.address);
    const canAct = e.status === 'scheduled';

    // 在庫状況の集計
    const stockPreview = e.stockPreview;
    const hasShortages = stockPreview?.overallStatus === 'shortage';
    const shortages = stockPreview?.shortages || [];
    const unregistered = stockPreview?.unregistered || [];

    const handleCardClick = () => {
      router.push(`/estimates/${e.id}`);
    };

    return (
      <div
        key={e.id}
        className="rounded border bg-white p-4 space-y-3 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
        data-testid="estimate-card"
        onClick={handleCardClick}
      >
        {/* 在庫サマリーバナー */}
        {e.hasItems === false ? (
          // 明細がない場合は「未確定」ピルを表示
          <div className="bg-gray-100 border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">未確定</span>
            </div>
          </div>
        ) : stockPreview && stockPreview.mode !== 'not_applicable' ? (
          <div
            className={`rounded-md p-3 border ${
              hasShortages
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
            data-testid="estimate-stock-banner"
          >
            {hasShortages ? (
              <div className="space-y-1">
                {shortages.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">不足：</span>
                    {shortages.slice(0, 2).map((item: any, index: number) => (
                      <span key={item.name}>
                        {index > 0 && ' / '}
                        {item.name} {formatQtyDiff(-item.shortage)}
                        {item.unit}
                      </span>
                    ))}
                    {shortages.length > 2 && (
                      <span className="text-red-600">（ほか{shortages.length - 2}件）</span>
                    )}
                  </div>
                )}
                {unregistered.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">未登録（在庫不明）：</span>
                    {unregistered.map((item: any, index: number) => (
                      <span key={item.name}>
                        {index > 0 && '・'}
                        {item.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-medium">✓ この見積は在庫で対応可能です</div>
            )}
          </div>
        ) : null}

        {/* 時刻とステータスバッジ */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{showDate ? `${date} ${time}` : time}</div>
          <div className="flex items-center gap-2">
            <EstimateStatusBadge status={e.status} accepted={e.accepted} />
            <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              詳細を見る →
            </span>
          </div>
        </div>

        {/* 顧客情報 */}
        <div className="space-y-2">
          <div className="font-medium text-lg">{e.customer?.name ?? '（無名）'}</div>
          {e.customer?.phone && (
            <div className="text-sm text-gray-700">
              <span
                className="underline hover:text-blue-600 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  const phoneHref = getPhoneHref(e.customer?.phone);
                  if (phoneHref) {
                    window.open(phoneHref, '_self');
                  }
                }}
              >
                {e.customer.phone}
              </span>
            </div>
          )}
          {e.customer?.address && (
            <div className="text-sm text-gray-600">
              {e.customer.address}
              <span
                className="ml-2 underline hover:text-blue-600 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  const mapsHref = getMapsHref(e.customer?.address);
                  if (mapsHref) {
                    window.open(mapsHref, '_blank');
                  }
                }}
              >
                📍地図で開く
              </span>
            </div>
          )}
        </div>

        {/* 見積項目と在庫バッジ */}
        {e.estimateItems && e.estimateItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">見積項目</div>
            <div className="space-y-1">
              {e.estimateItems.map((item: any, index: number) => {
                const stockStatus = stockPreview?.perLine?.[index]?.status || 'unregistered';
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-gray-800">{item.materialName}</span>
                      <span className="text-gray-500 ml-2">
                        {item.quantity}
                        {item.material?.unit || '個'}
                      </span>
                    </div>
                    <div data-testid="estimate-line-badge">
                      <StockBadge status={stockStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* アクションボタン群（右端） */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {/* 日時変更ボタン（予約中のみ） */}
          {canAct && (
            <button
              className="px-3 py-2 rounded border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              onClick={(event) => {
                event.stopPropagation();
                setEditModal({ isOpen: true, estimateId: e.id, scheduledAt: e.scheduledAt });
              }}
              disabled={updateEstimate.isPending}
            >
              日時変更
            </button>
          )}

          {/* 成立ボタン（予約中のみ） */}
          {canAct && (
            <button
              className="px-3 py-2 rounded bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={complete.isPending}
              onClick={async (event) => {
                event.stopPropagation();
                try {
                  const res = await complete.mutateAsync({
                    id: e.id,
                    accepted: true,
                    priceCents: 0,
                    projectTitle: `${e.customer?.name ?? '案件'}`,
                    dueOn: new Date().toISOString().slice(0, 10),
                  });

                  if (res?.data?.projectId) {
                    router.push(`/projects/${res.data.projectId}/tasks/bulk-create`);
                  } else {
                    setToast('見積を成立しました。');
                    refetch();
                  }
                } catch (error: any) {
                  const errorMessage =
                    error.response?.data?.error?.message ||
                    '操作が競合しました。少し時間をおいて再試行してください';
                  setToast(errorMessage);
                }
              }}
            >
              {complete.isPending ? '処理中…' : '成立'}
            </button>
          )}

          {/* 不成立ボタン（予約中のみ） */}
          {canAct && (
            <button
              className="px-3 py-2 rounded border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={complete.isPending}
              onClick={async (event) => {
                event.stopPropagation();
                if (!confirm('この見積を不成立にします。よろしいですか？')) return;
                try {
                  await complete.mutateAsync({
                    id: e.id,
                    accepted: false,
                  });
                  setToast('見積を不成立にしました。');
                  refetch();
                } catch (error: any) {
                  const errorMessage =
                    error.response?.data?.error?.message ||
                    '操作が競合しました。少し時間をおいて再試行してください';
                  setToast(errorMessage);
                }
              }}
            >
              {complete.isPending ? '処理中…' : '不成立'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">見積一覧</h1>
        <Link href="/estimates/new" className="underline text-sm">
          新規作成
        </Link>
      </div>

      {/* タブ切り替え */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          予定
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          完了
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          全て
        </button>
      </div>

      <div className="space-y-6">
        {/* 今日の見積もり */}
        {renderGroupHeader('今日', groupedEstimates.today.length)}
        {groupedEstimates.today.length > 0 && (
          <div className="space-y-3">
            {groupedEstimates.today.map((e) => renderEstimateCard(e, false))}
          </div>
        )}

        {/* 明日の見積もり */}
        {renderGroupHeader('明日', groupedEstimates.tomorrow.length)}
        {groupedEstimates.tomorrow.length > 0 && (
          <div className="space-y-3">
            {groupedEstimates.tomorrow.map((e) => renderEstimateCard(e, false))}
          </div>
        )}

        {/* 以降の見積もり */}
        {renderGroupHeader('以降', groupedEstimates.later.length)}
        {groupedEstimates.later.length > 0 && (
          <div className="space-y-3">
            {groupedEstimates.later.map((e) => renderEstimateCard(e, true))}
          </div>
        )}

        {/* 見積もりがない場合 */}
        {filteredEstimates.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            {activeTab === 'pending' && '予定の見積はありません。'}
            {activeTab === 'completed' && '完了した見積はありません。'}
            {activeTab === 'all' && '見積はありません。'}
          </p>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 日時変更モーダル */}
      {editModal && (
        <EditEstimateScheduleModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal(null)}
          initialScheduledAt={editModal.scheduledAt}
          isPending={updateEstimate.isPending}
          onSubmit={async (scheduledAt) => {
            try {
              await updateEstimate.mutateAsync({
                id: editModal.estimateId,
                scheduledAt: new Date(scheduledAt).toISOString(),
              });
              setToast('見積日時を更新しました。');
              setEditModal(null);
            } catch (error: any) {
              const errorMessage =
                error.response?.data?.error?.message || '日時更新に失敗しました。';
              setToast(errorMessage);
            }
          }}
        />
      )}
    </main>
  );
}
