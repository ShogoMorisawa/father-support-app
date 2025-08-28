import { formatQty } from '@/lib/format/quantity';

type StockStatus = 'ok' | 'shortage' | 'unregistered';

interface StockBadgeProps {
  status: StockStatus;
  className?: string;
}

export default function StockBadge({ status, className = '' }: StockBadgeProps) {
  const getBadgeStyle = (status: StockStatus) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shortage':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unregistered':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getBadgeText = (status: StockStatus) => {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'shortage':
        return '不足';
      case 'unregistered':
        return '未登録';
      default:
        return '不明';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle(
        status,
      )} ${className}`}
    >
      {getBadgeText(status)}
    </span>
  );
}

interface StockSummaryBannerProps {
  overallStatus: 'ok' | 'shortage';
  shortages: Array<{
    name: string;
    required: number;
    available: number;
    shortage: number;
    unit: string;
  }>;
  unregistered: Array<{
    name: string;
    required: number;
    unit: string;
  }>;
}

export function StockSummaryBanner({
  overallStatus,
  shortages,
  unregistered,
}: StockSummaryBannerProps) {
  if (overallStatus === 'ok' && unregistered.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
        <div className="flex items-center">
          <span className="text-green-600 text-sm font-medium">✓ この見積は在庫で対応可能です</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
      <div className="space-y-1">
        {shortages.length > 0 && (
          <div className="text-red-700 text-sm">
            <span className="font-medium">不足：</span>
            {shortages.slice(0, 2).map((item, index) => (
              <span key={item.name}>
                {index > 0 && ' / '}
                {item.name} {formatQty(-item.shortage)}
                {item.unit}
              </span>
            ))}
            {shortages.length > 2 && (
              <span className="text-red-600">（ほか{shortages.length - 2}件）</span>
            )}
          </div>
        )}
        {unregistered.length > 0 && (
          <div className="text-gray-600 text-sm">
            <span className="font-medium">未登録（在庫不明）：</span>
            {unregistered.map((item, index) => (
              <span key={item.name}>
                {index > 0 && '・'}
                {item.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
