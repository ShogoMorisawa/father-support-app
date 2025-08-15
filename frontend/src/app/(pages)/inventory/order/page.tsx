'use client';

import { useLowMaterials } from '@/lib/api/hooks';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type OrderRow = {
  id: number;
  name: string;
  unit?: string | null;
  currentQty: number;
  thresholdQty: number;
  orderQty: number; // 発注数量（編集可）
};

function toYmd(date = new Date()) {
  // JST基準で YYYY/MM/DD
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '/');
}

export default function InventoryOrderTemplatePage() {
  const { data, isLoading } = useLowMaterials();
  const items: any[] = data?.data?.items ?? [];
  const initialRows = useMemo<OrderRow[]>(() => {
    return items.map((m) => {
      // 推奨発注量：とりあえず「閾値の2倍まで補う」= max(threshold*2 - current, threshold - current, 1)
      const deficit = Math.max(m.thresholdQty - m.currentQty, 0);
      const target = Math.max(m.thresholdQty * 2 - m.currentQty, deficit, 1);
      return {
        id: m.id,
        name: m.name,
        unit: m.unit ?? '',
        currentQty: Number(m.currentQty ?? 0),
        thresholdQty: Number(m.thresholdQty ?? 0),
        orderQty: Math.ceil(target), // 最小1、整数に丸め（必要なら小数も可）
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  const [rows, setRows] = useState<OrderRow[]>(initialRows);
  useEffect(() => setRows(initialRows), [initialRows]);

  const subject = `【発注依頼】資材補充のお願い（${toYmd()}）`;
  const body = useMemo(() => {
    const lines: string[] = [];
    lines.push('いつもお世話になっております。');
    lines.push('以下の資材の発注をお願いいたします。');
    lines.push('');
    rows.forEach((r) => {
      if (r.orderQty > 0) {
        lines.push(`・${r.name}：${r.orderQty}${r.unit ? ` ${r.unit}` : ''}`);
      }
    });
    lines.push('');
    lines.push('納品先：＿＿＿＿＿＿＿＿＿＿（ご指定ください）');
    lines.push(`希望納期：${toYmd()}（最短）`);
    lines.push('');
    lines.push('——');
    lines.push('発注元：＿＿＿＿＿＿＿＿＿＿');
    lines.push('ご連絡先：＿＿＿＿＿＿＿＿＿＿');
    return lines.join('\n');
  }, [rows]);

  const mailto = useMemo(() => {
    const to = encodeURIComponent('supplier@example.com'); // 取引先が決まり次第、環境変数等で差し替えOK
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    return `mailto:${to}?subject=${s}&body=${b}`;
  }, [subject, body]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      alert('件名と本文をコピーしました。');
    } catch {
      alert('コピーに失敗しました。手動で選択してコピーしてください。');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">発注テンプレート</h1>
        <div className="text-sm">
          <Link className="underline" href="/inventory">
            在庫一覧へ戻る
          </Link>
        </div>
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-right">現在庫</th>
              <th className="px-3 py-2 text-right">閾値</th>
              <th className="px-3 py-2 text-right">発注数量</th>
              <th className="px-3 py-2">単位</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  読み込み中…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  閾値を下回る在庫はありません。
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`row-${r.id}-${i}`} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right">{r.currentQty}</td>
                <td className="px-3 py-2 text-right">{r.thresholdQty}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-24 border rounded px-2 py-1 text-right"
                    value={r.orderQty}
                    onChange={(e) => {
                      const v = Number(e.target.value || 0);
                      setRows((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, orderQty: v } : x)),
                      );
                    }}
                  />
                </td>
                <td className="px-3 py-2">{r.unit || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div>
          <div className="text-sm text-gray-600 mb-1">件名</div>
          <input className="w-full border rounded px-3 py-2" value={subject} readOnly />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">本文</div>
          <textarea className="w-full border rounded px-3 py-2 h-48" value={body} readOnly />
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="rounded bg-black text-white px-3 py-2">
            件名＋本文をコピー
          </button>
          <a href={mailto} className="rounded border px-3 py-2 inline-flex items-center">
            メールアプリで開く
          </a>
        </div>
        <p className="text-xs text-gray-500">
          ※ supplier@example.com はダミーです。取引先が決まり次第差し替えてください。
        </p>
      </div>
    </main>
  );
}
