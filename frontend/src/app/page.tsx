'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import DeliveriesCard from './_components/DeliveriesCard';

export default function Page() {
  // 動作確認用に軽いquery（あとで消してOK）
  const { data, isLoading } = useQuery({
    queryKey: ['hello'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return 'Hello from React Query!';
    },
  });

  const cards = [
    { href: '/calendar', title: 'カレンダー', desc: '作業予定と納品を確認' },
    { href: '/tasks', title: '作業一覧', desc: '案件の進行・完了' },
    { href: '/inventory', title: '在庫', desc: '材料の残量と入荷' },
    { href: '/customers', title: '顧客', desc: '検索・履歴・統合' },
    { href: '/history', title: '履歴（Undo）', desc: '直近操作の取り消し' },
  ];

  return (
    <main className="p-4 mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">ホーム</h1>
      {/* v1.2追加：直近3件・日付昇順の「納品予定」カード */}
      <div className="grid gap-3 sm:grid-cols-2">
        <DeliveriesCard />
      </div>
      <p className="text-sm text-gray-600">{isLoading ? 'Loading...' : data}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="border rounded p-3 hover:bg-gray-50">
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-gray-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
