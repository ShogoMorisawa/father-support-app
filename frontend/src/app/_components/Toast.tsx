'use client';
import { useEffect } from 'react';

type Props = {
  message: string;
  onClose: () => void;
  duration?: number; // ms
};
export default function Toast({ message, onClose, duration = 3000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-md border bg-white shadow px-4 py-2 text-sm"
    >
      {message}
      <button aria-label="閉じる" className="ml-3 underline" onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}
