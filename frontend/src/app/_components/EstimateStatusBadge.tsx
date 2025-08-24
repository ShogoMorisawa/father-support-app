'use client';

type EstimateStatusBadgeProps = {
  status?: string;
  accepted?: boolean | null;
};

export default function EstimateStatusBadge({ status, accepted }: EstimateStatusBadgeProps) {
  const getStatusInfo = () => {
    if (status === 'scheduled') {
      return { text: '予約', color: 'bg-blue-100 text-blue-800' };
    }
    if (status === 'completed') {
      if (accepted === true) {
        return { text: '成立', color: 'bg-green-100 text-green-800' };
      }
      if (accepted === false) {
        return { text: '不成立', color: 'bg-red-100 text-red-800' };
      }
    }
    if (status === 'cancelled') {
      return { text: 'キャンセル', color: 'bg-red-100 text-red-800' };
    }
    // デフォルト
    return { text: '不明', color: 'bg-gray-100 text-gray-800' };
  };

  const { text, color } = getStatusInfo();

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}
    >
      {text}
    </span>
  );
}
