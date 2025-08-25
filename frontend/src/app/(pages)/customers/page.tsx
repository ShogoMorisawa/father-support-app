'use client';
import { useCustomers, useCustomerSearch } from '@/lib/api/hooks';
import { CustomerName, PhoneLink, AddressLink, StatusBadge, QuickActionButton } from '@/app/_components/CustomerInfo';
import { SearchHighlight, PhoneSearchHighlight } from '@/app/_components/SearchHighlight';
import Link from 'next/link';
import { useMemo, useState, useCallback, useEffect } from 'react';

// スケルトン行コンポーネント
function CustomerSkeletonRow() {
  return (
    <tr className="border-t animate-pulse">
      <td className="px-3 py-2">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-3 bg-gray-100 rounded w-20 mt-1"></div>
      </td>
      <td className="px-3 py-2">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-3 py-2">
        <div className="h-4 bg-gray-200 rounded w-40"></div>
      </td>
      <td className="px-3 py-2">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex gap-2 justify-center">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-12"></div>
        </div>
      </td>
    </tr>
  );
}

// ハイライト付き顧客名コンポーネント
function HighlightedCustomerName({ customer, searchQuery }: { customer: any; searchQuery: string }) {
  return (
    <div>
      <div className="font-medium text-base">
        <SearchHighlight text={customer.name} searchQuery={searchQuery} />
      </div>
      <div className="text-sm text-gray-500">
        <SearchHighlight text={customer.nameKana || 'カナ未設定'} searchQuery={searchQuery} />
      </div>
    </div>
  );
}

// ハイライト付き住所コンポーネント
function HighlightedAddressLink({ address, searchQuery }: { address: string | null; searchQuery: string }) {
  if (!address) return <span className="text-gray-400">-</span>;
  
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  
  return (
    <div className="flex items-center gap-2">
      <span>
        📍 <SearchHighlight text={address} searchQuery={searchQuery} />
      </span>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline text-sm"
      >
        地図で開く
      </a>
    </div>
  );
}

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [order, setOrder] = useState<'name.asc' | 'last_activity.desc'>('name.asc');
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: listData, isLoading: listLoading } = useCustomers(order, 200);
  const { data: searchData, isLoading: searchLoading } = useCustomerSearch(debouncedQ, 50);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);

    return () => clearTimeout(timer);
  }, [q]);

  // ローディング状態の管理
  useEffect(() => {
    setIsLoading(listLoading || searchLoading);
  }, [listLoading, searchLoading]);

  const items = useMemo(() => {
    const itemsAll: any[] = listData?.data?.items ?? [];
    const itemsSearch: any[] = searchData?.data?.items ?? [];
    return debouncedQ.trim() ? itemsSearch : itemsAll;
  }, [debouncedQ, listData?.data?.items, searchData?.data?.items]);

  const handleOrderChange = useCallback((newOrder: 'name.asc' | 'last_activity.desc') => {
    setOrder(newOrder);
  }, []);

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客台帳</h1>
        <Link 
          href="/customers/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          ＋ 新規登録
        </Link>
      </div>

      {/* 検索・並び替え */}
      <div className="rounded border bg-white p-4 space-y-3">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">検索</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前・カナ・電話で検索（例: 山田 090）"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ハイフン無視の電話検索・部分一致の複合語に対応
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">並び替え</label>
            <select
              value={order}
              onChange={(e) => handleOrderChange(e.target.value as 'name.asc' | 'last_activity.desc')}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name.asc">名前順（あいうえお）</option>
              <option value="last_activity.desc">最近の活動順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 顧客一覧テーブル */}
      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium">顧客情報</th>
              <th className="px-3 py-3 text-left font-medium">連絡先</th>
              <th className="px-3 py-3 text-left font-medium">住所</th>
              <th className="px-3 py-3 text-center font-medium">ステータス</th>
              <th className="px-3 py-3 text-center font-medium">アクション</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // スケルトン表示
              Array.from({ length: 5 }).map((_, i) => (
                <CustomerSkeletonRow key={i} />
              ))
            ) : items.length > 0 ? (
              items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <HighlightedCustomerName customer={c} searchQuery={debouncedQ} />
                  </td>
                  <td className="px-3 py-3">
                    <PhoneSearchHighlight phone={c.phone} searchQuery={debouncedQ} />
                    {c.phone && (
                      <div className="mt-1">
                        <PhoneLink phone={c.phone} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <HighlightedAddressLink address={c.address} searchQuery={debouncedQ} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge customer={c} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <QuickActionButton
                        href={`/estimates/new?name=${encodeURIComponent(c.name || '')}&phone=${encodeURIComponent(c.phone || '')}&address=${encodeURIComponent(c.address || '')}`}
                        variant="blue"
                      >
                        見積作成
                      </QuickActionButton>
                      <QuickActionButton
                        href={`/customers/${c.id}`}
                        variant="gray"
                      >
                        詳細
                      </QuickActionButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={5}>
                  <div className="space-y-2">
                    <p className="text-lg">顧客がいません</p>
                    <Link 
                      href="/customers/new"
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      ＋ 新規登録
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション（将来の実装） */}
      {items.length >= 200 && (
        <div className="text-center text-sm text-gray-500">
          200件以上表示中。ページネーション機能は今後のアップデートで追加予定です。
        </div>
      )}
    </main>
  );
}
