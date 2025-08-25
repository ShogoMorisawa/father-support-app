'use client';

import { useState } from 'react';

interface EditEstimateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scheduledAt: string) => void;
  initialScheduledAt: string;
  isPending: boolean;
}

export default function EditEstimateScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  initialScheduledAt,
  isPending,
}: EditEstimateScheduleModalProps) {
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!initialScheduledAt) return '';

    // scheduledAtをJSTで yyyy-MM-ddTHH:mm に整形
    const date = new Date(initialScheduledAt);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduledAt) {
      onSubmit(scheduledAt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4 space-y-3 shadow-lg">
        <div className="text-lg font-bold">見積日時変更</div>
        <div className="text-sm text-gray-600">見積もりの予定日時を変更できます。</div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-600">予定日時</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border px-3 py-2"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={onClose}
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded bg-black text-white px-3 py-2 disabled:opacity-50"
              disabled={isPending || !scheduledAt}
            >
              {isPending ? '更新中…' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
