/**
 * 数量の表示フォーマット用ユーティリティ
 * 3桁小数に丸め、末尾0をトリム（例: 2.250 → 2.25, 2.000 → 2）
 */

/**
 * 数量を3桁小数に丸めて末尾0をトリムする
 * @param n 数量（number）
 * @returns フォーマット済み文字列
 *
 * @example
 * formatQty(2.250) // "2.25"
 * formatQty(2.000) // "2"
 * formatQty(0.005) // "0.005"
 * formatQty(1.2345) // "1.235"
 */
export function formatQty(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) {
    return '0';
  }

  // 3桁小数に丸める
  const rounded = Math.round(n * 1000) / 1000;

  // 末尾0をトリム
  return rounded.toString().replace(/\.?0+$/, '');
}

/**
 * 数量の差分を表示用にフォーマット（不足分など）
 * @param n 数量（number）
 * @returns フォーマット済み文字列（負数の場合は"-"付き）
 *
 * @example
 * formatQtyDiff(-0.5) // "-0.5"
 * formatQtyDiff(1.25) // "1.25"
 */
export function formatQtyDiff(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) {
    return '0';
  }

  const formatted = formatQty(Math.abs(n));
  return n < 0 ? `-${formatted}` : formatted;
}
