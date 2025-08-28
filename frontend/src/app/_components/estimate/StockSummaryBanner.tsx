'use client';

import { formatQtyDiff, StockCalculationResult } from '@/lib/stock-calculator';

interface StockSummaryBannerProps {
  items: any[];
  stockResult: StockCalculationResult | null;
  onRefreshStock: () => void;
  onCreateOrderTemplate: () => void;
}

export function StockSummaryBanner({
  items,
  stockResult,
  onRefreshStock,
  onCreateOrderTemplate,
}: StockSummaryBannerProps) {
  // 明細がない場合は「未確定」ピルを表示
  if (!items || items.length === 0) {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">
            未確定（現地で確定してください）
          </span>
        </div>
      </div>
    );
  }

  // 在庫計算結果がない場合は何も表示しない
  if (!stockResult) {
    return null;
  }

  const { summary, shortages } = stockResult;

  // 在庫OKの場合
  if (summary.ok) {
    return (
      <div
        className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-green-800 font-medium">この見積は在庫で賄えます</span>
          </div>
          <button
            onClick={onRefreshStock}
            className="text-green-600 hover:text-green-800 text-sm font-medium px-3 py-1 rounded border border-green-300 hover:border-green-400 transition-colors"
          >
            在庫を再取得
          </button>
        </div>
      </div>
    );
  }

  // 在庫不足がある場合
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            <span className="text-red-800 font-medium">在庫不足あり：</span>
          </div>
          <div className="ml-6 text-red-700 text-sm">
            {shortages.map((shortage, index) => (
              <span key={shortage.name}>
                {shortage.name} −{formatQtyDiff(shortage.shortage)}
                {index < shortages.length - 1 ? ' / ' : ''}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefreshStock}
            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-300 hover:border-red-400 transition-colors"
          >
            在庫を再取得
          </button>
          <button
            onClick={onCreateOrderTemplate}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            発注テンプレを作成
          </button>
        </div>
      </div>
    </div>
  );
}
