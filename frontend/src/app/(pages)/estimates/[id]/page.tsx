'use client';

import { EstimateItemRow } from '@/app/_components/estimate/EstimateItemRow';
import { StockSummaryBanner } from '@/app/_components/estimate/StockSummaryBanner';
import {
  useCompleteEstimate,
  useEstimate,
  useMaterialsAvailability,
  useUpdateEstimateItems,
} from '@/lib/api/hooks';
import { paths } from '@/lib/api/types';
import { computeEstimateStock } from '@/lib/stock-calculator';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type EstimateItem =
  paths['/estimates/{id}']['get']['responses']['200']['content']['application/json']['data']['items'][0];

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = parseInt(params.id as string);

  // APIフック
  const { data: estimateData, isLoading: estimateLoading } = useEstimate(estimateId);
  const { data: availabilityData, refetch: refetchAvailability } = useMaterialsAvailability();
  const updateEstimateItems = useUpdateEstimateItems(estimateId);
  const completeEstimate = useCompleteEstimate();

  // ローカル状態
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [stockResult, setStockResult] = useState<any>(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryTime, setDeliveryTime] = useState('10:00');

  // ユーティリティ関数
  const getPhoneHref = (phone?: string) => {
    if (!phone) return '';
    return `tel:${phone}`;
  };

  const getMapsHref = (address?: string) => {
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // 見積データの初期化
  useEffect(() => {
    if (estimateData?.data?.items) {
      setItems(estimateData.data.items);
      setHasUnsavedChanges(false);
    }
  }, [estimateData]);

  // 在庫計算の実行
  useEffect(() => {
    if (items.length > 0 && availabilityData?.data?.items) {
      const result = computeEstimateStock(items, availabilityData.data.items);
      setStockResult(result);
    } else {
      setStockResult(null);
    }
  }, [items, availabilityData]);

  // 30秒ごとの自動在庫更新
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAvailability();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchAvailability]);

  // 明細の更新
  const handleItemUpdate = useCallback(
    (index: number, updatedItem: EstimateItem) => {
      const newItems = [...items];
      newItems[index] = updatedItem;
      setItems(newItems);
      setHasUnsavedChanges(true);
    },
    [items],
  );

  // 明細の削除
  const handleItemDelete = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      setHasUnsavedChanges(true);
    },
    [items],
  );

  // 明細の追加
  const handleAddItem = useCallback(() => {
    const newItem: EstimateItem = {
      materialId: null,
      materialName: '',
      category: null, // カテゴリを選択させる
      qty: 0,
      unit: null,
      position: items.length,
    };
    setItems([...items, newItem]);
    setHasUnsavedChanges(true);
  }, [items]);

  // 保存
  const handleSave = useCallback(async () => {
    try {
      // 材料選択と数量のバリデーション
      const validationErrors: { index: number; field: string; message: string }[] = [];

      items.forEach((item, index) => {
        if (!item.category) {
          validationErrors.push({
            index,
            field: 'category',
            message: 'カテゴリを選択してください',
          });
        }
        if (!item.materialId) {
          validationErrors.push({
            index,
            field: 'materialId',
            message: '材料を選択してください',
          });
        }
        if (!item.qty || item.qty <= 0) {
          validationErrors.push({
            index,
            field: 'qty',
            message: '数量を入力してください',
          });
        }
      });

      if (validationErrors.length > 0) {
        // エラーメッセージを表示
        const errorMessage = validationErrors
          .map((error) => `${error.index + 1}行目: ${error.message}`)
          .join('\n');
        alert(`保存できません:\n${errorMessage}`);
        return;
      }

      // 空の明細を除外
      const validItems = items.filter((item) => item.category && item.materialId && item.qty > 0);

      // 型を統一するためにidフィールドを調整
      const itemsForApi = validItems.map((item) => ({
        ...item,
        id: item.id || undefined,
        position: item.position || 0,
      }));

      await updateEstimateItems.mutateAsync(itemsForApi);
      setHasUnsavedChanges(false);

      // 成功トースト（実装は省略）
      alert('明細を保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  }, [items, updateEstimateItems]);

  // 確定して成立へ
  const handleComplete = useCallback(async () => {
    if (!stockResult) return;

    const { shortages, unregistered } = stockResult;

    // 在庫不足がある場合の確認
    if (shortages.length > 0) {
      const confirmed = confirm('不足があります。発注テンプレを作成しますか？');
      if (confirmed) {
        // 発注テンプレ作成の処理（実装は省略）
        alert('発注テンプレを作成しました');
      }
    }

    // 未登録材料がある場合の確認
    if (unregistered.length > 0) {
      const confirmed = confirm('未登録の材料があります。材料マスターへ登録しますか？');
      if (confirmed) {
        // 材料マスター登録の処理（実装は省略）
        alert('材料マスターに登録しました');
      }
    }

    // 明細データの存在確認
    if (items.length === 0) {
      alert('明細を入力してください。');
      return;
    }

    // 明細データのバリデーション
    const validationErrors: { index: number; field: string; message: string }[] = [];
    items.forEach((item, index) => {
      if (!item.category) {
        validationErrors.push({
          index,
          field: 'category',
          message: 'カテゴリを選択してください',
        });
      }
      if (!item.materialId) {
        validationErrors.push({
          index,
          field: 'materialId',
          message: '材料を選択してください',
        });
      }
      if (!item.qty || item.qty <= 0) {
        validationErrors.push({
          index,
          field: 'qty',
          message: '数量を入力してください',
        });
      }
    });

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors
        .map((error) => `${error.index + 1}行目: ${error.message}`)
        .join('\n');
      alert(`見積もりを成立できません:\n${errorMessage}`);
      return;
    }

    // 成立処理の確認
    if (!confirm('この見積を成立にしますか？')) return;

    try {
      const res = await completeEstimate.mutateAsync({
        id: estimateId,
        accepted: true,
        priceCents: 0,
        projectTitle: `${estimateData.data.estimate.customer?.name ?? '案件'}`,
        dueOn: deliveryDate,
        deliveryAt: `${deliveryDate}T${deliveryTime}:00+09:00`,
        items: items.map((item) => ({
          materialId: item.materialId || null,
          materialName: item.materialName,
          category: item.category || null,
          qty: item.qty,
          unit: item.unit || null,
        })),
      });

      if (res?.data?.projectId) {
        // プロジェクトが作成された場合は、直接プロジェクト詳細画面に遷移
        router.push(`/projects/${res.data.projectId}`);
      } else {
        // プロジェクトが作成されなかった場合は、成功メッセージを表示
        alert('見積を成立しました。');
        // 見積詳細を再取得
        window.location.reload();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        '操作が競合しました。少し時間をおいて再試行してください';
      alert(errorMessage);
    }
  }, [
    stockResult,
    completeEstimate,
    estimateId,
    estimateData,
    router,
    items,
    deliveryDate,
    deliveryTime,
  ]);

  // 在庫再取得
  const handleRefreshStock = useCallback(() => {
    refetchAvailability();
  }, [refetchAvailability]);

  // 発注テンプレ作成
  const handleCreateOrderTemplate = useCallback(() => {
    // 発注テンプレ作成の処理（実装は省略）
    alert('発注テンプレを作成しました');
  }, []);

  // ページ離脱時の確認
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (estimateLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (!estimateData?.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">見積が見つかりません</div>
      </div>
    );
  }

  const { estimate } = estimateData.data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">見積詳細</h1>

        {/* 見積メタ情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                基本情報
              </h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">予定日時:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(estimate.scheduledAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {estimate.customer && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  顧客情報
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-gray-600 w-20">名前:</span>
                    <span className="font-medium text-gray-900">{estimate.customer.name}</span>
                  </div>
                  {estimate.customer.phone && (
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20">電話:</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const phoneHref = getPhoneHref(estimate.customer.phone);
                          if (phoneHref) {
                            window.open(phoneHref, '_self');
                          }
                        }}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      >
                        {estimate.customer.phone}
                      </button>
                    </div>
                  )}
                  {estimate.customer.address && (
                    <div className="flex items-start">
                      <span className="text-gray-600 w-20 mt-1">住所:</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const mapsHref = getMapsHref(estimate.customer.address);
                          if (mapsHref) {
                            window.open(mapsHref, '_blank');
                          }
                        }}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors text-left"
                      >
                        {estimate.customer.address}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 在庫サマリバナー */}
      <StockSummaryBanner
        items={items}
        stockResult={stockResult}
        onRefreshStock={handleRefreshStock}
        onCreateOrderTemplate={handleCreateOrderTemplate}
      />

      {/* 明細リスト */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">明細</h2>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            明細を追加
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            明細がありません。明細を追加してください。
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <EstimateItemRow
                key={index}
                item={item}
                stockStatus={stockResult?.perLine?.[index]?.status || 'unregistered'}
                availability={availabilityData?.data?.items || []}
                onUpdate={(updatedItem) => handleItemUpdate(index, updatedItem)}
                onDelete={() => handleItemDelete(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッターバー */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              サマリ:
              {stockResult ? (
                <>
                  <span className="text-green-600 font-medium mx-1">OK</span>
                  {stockResult.summary.insufficientCount > 0 && (
                    <>
                      /{' '}
                      <span className="text-red-600 font-medium mx-1">
                        不足あり {stockResult.summary.insufficientCount}点
                      </span>
                    </>
                  )}
                  {stockResult.summary.unregisteredCount > 0 && (
                    <>
                      /{' '}
                      <span className="text-gray-600 font-medium mx-1">
                        未登録あり {stockResult.summary.unregisteredCount}点
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-500">計算中...</span>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* 納品日時・時刻の設定 */}
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2">
                <label className="text-gray-600">納品日:</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-gray-600">時刻:</label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || updateEstimateItems.isPending}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                {updateEstimateItems.isPending ? '保存中...' : '下書き保存'}
              </button>
              <button
                onClick={handleComplete}
                disabled={completeEstimate.isPending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors"
              >
                {completeEstimate.isPending ? '処理中...' : '確定して成立へ'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* フッターバーの高さ分のスペース */}
      <div className="h-20"></div>
    </div>
  );
}
