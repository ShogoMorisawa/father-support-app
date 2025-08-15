'use client';
import { useLowMaterials } from '@/lib/api/hooks';
import Link from 'next/link';

export default function LowStockCard() {
  const { data } = useLowMaterials();
  const items: any[] = data?.data?.items ?? [];
  const count = items.length;
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">在庫アラート</h2>
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-sm underline">
            在庫を見る
          </Link>
          {count > 0 && (
            <Link href="/inventory/order" className="text-sm underline">
              発注テンプレを作成
            </Link>
          )}
        </div>
      </div>
      {count === 0 ? (
        <p className="text-sm text-gray-600">在庫は十分です。</p>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-sm">
            閾値未満 <span className="ml-1 font-bold">{count}</span> 件
          </span>
          <span className="text-sm text-gray-600">補充をご検討ください。</span>
        </div>
      )}
    </div>
  );
}
