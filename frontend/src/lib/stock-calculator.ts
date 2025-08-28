import { paths } from './api/types';

type EstimateItem =
  paths['/estimates/{id}']['get']['responses']['200']['content']['application/json']['data']['items'][0];
type MaterialsAvailabilityItem =
  paths['/materials/availability']['get']['responses']['200']['content']['application/json']['data']['items'][0];

export interface StockCalculationResult {
  shortages: Array<{
    name: string;
    required: number;
    available: number;
    shortage: number;
    unit: string;
  }>;
  unregistered: Array<{
    name: string;
    required: number;
    unit: string;
  }>;
  summary: {
    ok: boolean;
    insufficientCount: number;
    unregisteredCount: number;
  };
  perLine: Array<{
    status: 'ok' | 'shortage' | 'unregistered';
  }>;
}

/**
 * 見積明細の在庫計算を行う
 * @param items 見積明細
 * @param availability 在庫可用性データ
 * @returns 在庫計算結果
 */
export function computeEstimateStock(
  items: EstimateItem[],
  availability: MaterialsAvailabilityItem[],
): StockCalculationResult {
  const shortages: StockCalculationResult['shortages'] = [];
  const unregistered: StockCalculationResult['unregistered'] = [];
  const perLine: StockCalculationResult['perLine'] = [];

  // 同一材料の合計requiredを事前計算
  const materialTotals = new Map<number, number>();

  items.forEach((item) => {
    if (item.qty && item.qty > 0 && item.materialId) {
      const current = materialTotals.get(item.materialId) || 0;
      materialTotals.set(item.materialId, current + item.qty);
    }
  });

  // 各行の在庫判定
  items.forEach((item) => {
    if (!item.qty || item.qty <= 0) {
      perLine.push({ status: 'ok' });
      return;
    }

    if (!item.materialId) {
      // 未登録材料
      unregistered.push({
        name: item.materialName,
        required: item.qty,
        unit: item.unit || '個',
      });
      perLine.push({ status: 'unregistered' });
      return;
    }

    // 登録済み材料の在庫チェック
    const totalRequired = materialTotals.get(item.materialId) || 0;
    const materialAvailability = availability.find((a) => a.id === item.materialId);

    if (materialAvailability && materialAvailability.availableQty >= totalRequired) {
      perLine.push({ status: 'ok' });
    } else {
      perLine.push({ status: 'shortage' });

      // 不足情報は既に計算済みの場合は追加しない
      if (!shortages.some((s) => s.name === item.materialName)) {
        const shortage = Math.max(0, totalRequired - (materialAvailability?.availableQty || 0));
        shortages.push({
          name: item.materialName,
          required: totalRequired,
          available: materialAvailability?.availableQty || 0,
          shortage,
          unit: materialAvailability?.unit || '個',
        });
      }
    }
  });

  return {
    shortages,
    unregistered,
    summary: {
      ok: shortages.length === 0,
      insufficientCount: shortages.length,
      unregisteredCount: unregistered.length,
    },
    perLine,
  };
}

/**
 * 数量を3桁小数でフォーマット（末尾ゼロを抑制）
 * @param qty 数量
 * @returns フォーマットされた文字列
 */
export function formatQty(qty: number | string | null | undefined): string {
  // 数値でない場合は0として扱う
  if (qty === null || qty === undefined || qty === '') {
    return '0';
  }

  // 文字列の場合は数値に変換を試行
  const numQty = typeof qty === 'string' ? parseFloat(qty) : qty;

  // 数値変換に失敗した場合やNaNの場合は0
  if (isNaN(numQty)) {
    return '0';
  }

  if (numQty === 0) return '0';
  if (numQty === Math.floor(numQty)) return numQty.toString();
  return numQty.toFixed(3).replace(/\.?0+$/, '');
}

/**
 * 数量差を3桁小数でフォーマット
 * @param diff 数量差
 * @returns フォーマットされた文字列
 */
export function formatQtyDiff(diff: number | string | null | undefined): string {
  // 数値でない場合は0として扱う
  if (diff === null || diff === undefined || diff === '') {
    return '0';
  }

  // 文字列の場合は数値に変換を試行
  const numDiff = typeof diff === 'string' ? parseFloat(diff) : diff;

  // 数値変換に失敗した場合やNaNの場合は0
  if (isNaN(numDiff)) {
    return '0';
  }

  if (numDiff === 0) return '0';
  const absDiff = Math.abs(numDiff);
  if (absDiff === Math.floor(absDiff)) return numDiff.toString();
  return numDiff.toFixed(3).replace(/\.?0+$/, '');
}
