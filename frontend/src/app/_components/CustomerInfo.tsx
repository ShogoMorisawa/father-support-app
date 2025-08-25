import Link from 'next/link';

// 電話番号をクリック可能にするコンポーネント
export function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return <span className="text-gray-400">-</span>;

  const telLink = phone.replace(/[^\d]/g, '');

  return (
    <div className="flex items-center gap-2">
      <a href={`tel:${telLink}`} className="text-blue-600 hover:underline flex items-center gap-1">
        📞 {phone}
      </a>
      <button
        onClick={() => navigator.clipboard.writeText(phone)}
        className="text-gray-500 hover:text-gray-700 p-1"
        title="コピー"
      >
        ⧉
      </button>
    </div>
  );
}

// 検索ハイライト付きの電話番号リンクコンポーネント
export function HighlightedPhoneLink({
  phone,
  searchQuery,
}: {
  phone: string | null;
  searchQuery: string;
}) {
  if (!phone) return <span className="text-gray-400">-</span>;

  const telLink = phone.replace(/[^\d]/g, '');

  // 検索クエリでハイライト処理
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="flex items-center gap-2">
      <a href={`tel:${telLink}`} className="text-blue-600 hover:underline flex items-center gap-1">
        📞 {highlightText(phone, searchQuery)}
      </a>
      <button
        onClick={() => navigator.clipboard.writeText(phone)}
        className="text-gray-500 hover:text-gray-700 p-1"
        title="コピー"
      >
        ⧉
      </button>
    </div>
  );
}

// 住所を地図リンクにするコンポーネント
export function AddressLink({ address }: { address: string | null }) {
  if (!address) return <span className="text-gray-400">-</span>;

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  return (
    <div className="flex items-center gap-2">
      <span>📍 {address}</span>
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

// ステータスバッジコンポーネント
export function StatusBadge({ customer }: { customer: any }) {
  // 仮のロジック（後でAPIから取得するデータに基づいて実装）
  const hasActiveTasks = customer.activeTasksCount > 0;
  const hasPendingDeliveries = customer.deliveriesPendingCount > 0;

  if (hasActiveTasks || hasPendingDeliveries) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        進行中
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      完了のみ
    </span>
  );
}

// 顧客名とカナを表示するコンポーネント
export function CustomerName({ customer }: { customer: any }) {
  return (
    <div>
      <div className="font-medium text-base">{customer.name}</div>
      <div className="text-sm text-gray-500">{customer.nameKana || 'カナ未設定'}</div>
    </div>
  );
}

// クイックアクションボタン
export function QuickActionButton({
  href,
  onClick,
  children,
  variant = 'blue',
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'gray' | 'purple';
}) {
  const baseClasses = 'px-3 py-1 rounded text-xs transition-colors';
  const variantClasses = {
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    green: 'bg-green-600 text-white hover:bg-green-700',
    gray: 'bg-gray-600 text-white hover:bg-gray-700',
    purple: 'bg-purple-600 text-white hover:bg-purple-700',
  };

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${variantClasses[variant]}`}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}
