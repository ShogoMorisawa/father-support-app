'use client';
import { useEffect, useState } from 'react';

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
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(false);
      onClose();
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose]);
  if (!open) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded bg-black text-white px-4 py-3 shadow-lg flex items-center gap-2">
      <span className="text-sm">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="ml-2 rounded bg-white text-black px-2 py-1 text-xs hover:bg-gray-100"
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={() => {
          setOpen(false);
          onClose();
        }}
        className="ml-2 opacity-80 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
