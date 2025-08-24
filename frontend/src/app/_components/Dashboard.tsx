'use client';
import { useDashboard } from '@/lib/api/hooks';
import Link from 'next/link';

function todayJstYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // YYYY-MM-DD
}
function isoToJstYmd(iso?: string) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  // en-CA は YYYY-MM-DD 形式
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}
function jstTime(iso?: string) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const today = todayJstYmd();
  const { data, isLoading, error } = useDashboard({
    date: today,
    // 充分に大きめに取ってクライアント側で「今日」に絞る
    estimatesLimit: 100,
    tasksLimit: 0, // ホームでは表示しない
    deliveriesLimit: 300,
    historyLimit: 0, // ホームでは表示しない
    lowLimit: 0, // ホームでは表示しない（在庫はメニュー遷移）
  });
  if (isLoading) return <p className="p-4">読み込み中です…</p>;
  if (error) return <p className="p-4 text-red-600">通信に失敗しました。再試行してください。</p>;

  const d = data?.data;

  // ---- 今日の見積（時間順）
  const estimatesAll: any[] = d?.estimates ?? [];
  const estimatesToday = estimatesAll
    .filter((e) => e.status === 'scheduled' && isoToJstYmd(e.scheduledAt) === today)
    .sort(
      (a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
    );

  // ---- 今日の納品（期日一致）
  const deliveriesAll: any[] = d?.deliveries ?? [];
  const deliveriesToday = deliveriesAll
    .filter((x) => x.date === today)
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));

  return (
    <div className="space-y-4">
      {/* ヘッダ：今日の概要 + クイック導線 */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/estimates/new" className="underline">
            見積を作成
          </Link>
          <Link href="/deliveries/tools" className="underline">
            納品調整
          </Link>
          <Link href="/calendar" className="underline">
            カレンダー
          </Link>
        </nav>
      </div>
      <div className="text-sm text-gray-600">対象日：{d?.date ?? today}</div>

      {/* 今日の見積 */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">今日の見積</h2>
          <Link href="/estimates" className="text-sm underline">
            一覧へ
          </Link>
        </div>
        {estimatesToday.length === 0 ? (
          <p className="text-sm text-gray-500">本日の見積はありません。</p>
        ) : (
          <ul className="space-y-2">
            {estimatesToday.map((e) => (
              <li key={`est-${e.id}`} className="text-sm">
                <div className="text-gray-600">{jstTime(e.scheduledAt)}</div>
                <div className="font-medium">{e.customerName ?? '（無名）'}</div>
                {e.address && <div className="text-xs text-gray-600">{e.address}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 今日の納品 */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">今日の納品</h2>
          <div className="flex items-center gap-3">
            <Link href="/deliveries/tools" className="text-sm underline">
              調整ツール
            </Link>
            <Link href="/deliveries" className="text-sm underline">
              一覧へ
            </Link>
          </div>
        </div>
        {deliveriesToday.length === 0 ? (
          <p className="text-sm text-gray-500">本日の納品はありません。</p>
        ) : (
          <ul className="space-y-2">
            {deliveriesToday.map((dl) => (
              <li key={`del-${dl.id}`} className="text-sm">
                <div className="font-medium">{dl.customerName ?? '-'}</div>
                <div className="text-gray-600">{dl.title ?? '納品'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ここから下の"なんでもカード"はホームから撤去し、メニュー遷移に一本化 */}
      {/* 顧客 / 在庫 / 作業 / 履歴 などはそれぞれのページへ */}
    </div>
  );
}
