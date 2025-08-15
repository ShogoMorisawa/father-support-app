'use client';
import { useMaterials } from '@/lib/api/hooks';

export default function InventoryPage() {
  const { data } = useMaterials('name.asc', 500);
  const items: any[] = data?.data?.items ?? [];
  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">在庫</h1>
      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-right">現在庫</th>
              <th className="px-3 py-2 text-right">閾値</th>
              <th className="px-3 py-2">状態</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => {
              const low = m.low || m.currentQty < m.thresholdQty;
              return (
                <tr key={m.id} className={low ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2 text-right">{m.currentQty}</td>
                  <td className="px-3 py-2 text-right">{m.thresholdQty}</td>
                  <td className="px-3 py-2">
                    {low ? <span className="text-red-600 font-medium">要補充</span> : '-'}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                  在庫データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
