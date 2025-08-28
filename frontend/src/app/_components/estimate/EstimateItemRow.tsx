'use client';

import { paths } from '@/lib/api/types';
import { formatQty } from '@/lib/stock-calculator';
import { useEffect, useState } from 'react';
import { MaterialPicker } from './MaterialPicker';

type MaterialsAvailabilityItem =
  paths['/materials/availability']['get']['responses']['200']['content']['application/json']['data']['items'][0];

interface EstimateItemRowProps {
  item: {
    id?: number | null;
    materialId?: number | null;
    materialName: string;
    category?: string | null;
    qty: number;
    unit?: string | null;
    position?: number | null;
  };
  stockStatus: 'ok' | 'shortage' | 'unregistered';
  availability: MaterialsAvailabilityItem[];
  onUpdate: (updatedItem: EstimateItemRowProps['item']) => void;
  onDelete: () => void;
}

export function EstimateItemRow({
  item,
  stockStatus,
  availability,
  onUpdate,
  onDelete,
}: EstimateItemRowProps) {
  const [localItem, setLocalItem] = useState(item);
  const [showMaterialPicker, setShowMaterialPicker] = useState(!item.materialId);
  const [showCategorySelector, setShowCategorySelector] = useState(!item.category);

  // 材料が選択されているかどうか
  const hasSelectedMaterial = item.materialId && item.materialName;
  const selectedMaterial = availability.find((m) => m.id === item.materialId);

  // itemが変更されたときにlocalItemを更新
  useEffect(() => {
    setLocalItem(item);
    setShowMaterialPicker(!item.materialId);
    setShowCategorySelector(!item.category);
  }, [item]);

  const handleMaterialChange = (
    materialId: number | null,
    materialName: string,
    unit?: string,
    category?: string,
  ) => {
    // カテゴリーが渡されていない場合は既存のカテゴリーを保持
    const updated = {
      ...localItem,
      materialId,
      materialName,
      unit,
      category: category || localItem.category,
    };
    setLocalItem(updated);
    onUpdate(updated);
    setShowMaterialPicker(false);
  };

  const handleQtyChange = (qty: number) => {
    const updated = { ...localItem, qty };
    setLocalItem(updated);
    onUpdate(updated);
  };

  const handleCategoryChange = (category: string) => {
    const updated = { ...localItem, category };
    setLocalItem(updated);
    onUpdate(updated);
    setShowCategorySelector(false);
    setShowMaterialPicker(true);
  };

  const handleQuickAdd = (amount: number) => {
    const newQty = (localItem.qty || 0) + amount;
    if (newQty >= 0) {
      handleQtyChange(newQty);
    }
  };

  const handleMaterialClear = () => {
    const updated = { ...localItem, materialId: null, materialName: '', unit: null };
    setLocalItem(updated);
    onUpdate(updated);
    setShowMaterialPicker(true);
  };

  // 行バッジのスタイル
  const getStatusBadgeStyle = () => {
    switch (stockStatus) {
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shortage':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unregistered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (stockStatus) {
      case 'ok':
        return '在庫あり';
      case 'shortage':
        return '在庫不足';
      case 'unregistered':
        return '未登録';
      default:
        return '不明';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* カテゴリ */}
        <div className="md:col-span-2">
          {showCategorySelector ? (
            <select
              value={localItem.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">未選択</option>
              <option value="障子">障子</option>
              <option value="網戸">網戸</option>
              <option value="襖">襖</option>
            </select>
          ) : item.category ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-blue-800 font-medium text-sm">カテゴリー</div>
              <div className="text-blue-600 text-sm mt-1">{item.category}</div>
            </div>
          ) : null}
        </div>

        {/* 材料選択 */}
        <div className="md:col-span-4">
          {showMaterialPicker ? (
            <MaterialPicker
              value={localItem.materialId || null}
              onChange={handleMaterialChange}
              availability={availability}
              placeholder="材料を選択または入力"
            />
          ) : hasSelectedMaterial ? (
            <div className="space-y-2">
              {/* 選択中材料の表示 */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-green-800 font-medium">{item.materialName}</div>
                    {selectedMaterial && (
                      <div className="text-green-600 text-sm mt-1">
                        在庫: {selectedMaterial.availableQty} / 予定消費:{' '}
                        {selectedMaterial.committedQty}
                        {selectedMaterial.unit && (
                          <span className="ml-1">({selectedMaterial.unit})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMaterialClear}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
                    >
                      クリア
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : item.category ? (
            <div className="text-gray-500 text-sm italic">材料を選択してください</div>
          ) : (
            <div className="text-gray-500 text-sm italic">カテゴリーを選択してください</div>
          )}
        </div>

        {/* 数量 */}
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.001"
              value={localItem.qty || ''}
              onChange={(e) => handleQtyChange(parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
            <span className="text-gray-600">{localItem.unit || ''}</span>
          </div>

          {/* クイック加算ボタン */}
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => handleQuickAdd(1)}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors"
            >
              +1
            </button>
            <button
              onClick={() => handleQuickAdd(0.5)}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors"
            >
              +0.5
            </button>
            <button
              onClick={() => handleQuickAdd(0.25)}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors"
            >
              +0.25
            </button>
            <button
              onClick={() => handleQuickAdd(-1)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
            >
              -1
            </button>
            <button
              onClick={() => handleQuickAdd(-0.5)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
            >
              -0.5
            </button>
            <button
              onClick={() => handleQuickAdd(-0.25)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
            >
              -0.25
            </button>
          </div>

          {/* 数量表示 */}
          <div className="text-sm text-gray-600 mt-2">
            数量: {localItem.qty ? formatQty(localItem.qty) : '0'} {localItem.unit || ''}
          </div>
        </div>

        {/* 行バッジ */}
        <div className="md:col-span-2 flex justify-center">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadgeStyle()}`}
          >
            {getStatusText()}
          </span>
        </div>

        {/* 操作ボタン */}
        <div className="md:col-span-2 flex gap-2 justify-end">
          <button
            onClick={onDelete}
            className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50 transition-colors text-sm"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
