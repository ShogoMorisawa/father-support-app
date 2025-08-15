'use client';
import { useCustomers, useCustomerSearch } from '@/lib/api/hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const { data: listData } = useCustomers('name.asc', 200);
  const { data: searchData } = useCustomerSearch(q, 50);
  const itemsAll: any[] = listData?.data?.items ?? [];
  const itemsSearch: any[] = searchData?.data?.items ?? [];
  const items = useMemo(() => (q.trim() ? itemsSearch : itemsAll), [q, itemsAll, itemsSearch]);

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客台帳</h1>
        <Link href="/customers/new" className="underline text-sm">
          新規登録
        </Link>
      </div>

      <div className="rounded border bg-white p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="名前・カナ・電話で検索"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">名前</th>
              <th className="px-3 py-2 text-left">電話</th>
              <th className="px-3 py-2 text-left">住所</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.phone ?? '-'}</td>
                <td className="px-3 py-2">{c.address ?? '-'}</td>
                <td className="px-3 py-2 text-center">
                  <Link className="underline" href={`/customers/${c.id}`}>
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                  顧客がいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
