import type { components } from '@/lib/api/types';
type HistoryItem = components['schemas']['HistoryItem'] & {
  inverse?: { method?: string; path?: string; payload?: unknown } | null;
};

export function formatHistorySummary(ev: HistoryItem): string {
  // サーバがsummaryを返していれば最優先（仕様の文例：「山田様の作業完了」）
  if (ev.summary && ev.summary.trim().length > 0) return ev.summary;

  // 簡易フォールバック（既知actionの語彙に寄せる）
  const a = (ev.action || '').toLowerCase();
  if (a.includes('project') && a.includes('complete')) return '作業完了';
  if (a.includes('stock') && a.includes('adjust')) return '在庫の調整';
  if (a.includes('customer') && a.includes('merge')) return '顧客の統合';
  return '操作';
}
