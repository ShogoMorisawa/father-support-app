'use client';
import { useEffect } from 'react';

type Props = {
  message: string;
  onClose: () => void;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

export default function Toast({
  message,
  onClose,
  durationMs = 3000,
  actionLabel,
  onAction,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [onClose, durationMs]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded bg-black text-white px-4 py-3 shadow-lg flex items-center gap-3">
      <span className="text-sm">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="ml-2 rounded bg-white text-black px-2 py-1 text-xs hover:bg-gray-100"
        >
          {actionLabel}
        </button>
      )}
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
        ×
      </button>
    </div>
  );
}
