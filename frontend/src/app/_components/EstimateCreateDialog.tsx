'use client';

import { useCreateEstimate } from '@/lib/api/hooks';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onDone?: (msg?: string) => void;
};

function nowJstLocal() {
  // input[type=datetime-local] 用の "YYYY-MM-DDThh:mm"
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}T${pad(
    jst.getHours(),
  )}:${pad(jst.getMinutes())}`;
}
function localToIsoInJst(local: string) {
  // "YYYY-MM-DDThh:mm" を JST として ISO へ
  if (!local) return new Date().toISOString();
  return new Date(`${local}:00+09:00`).toISOString();
}

export default function EstimateCreateDialog({ open, onClose, onDone }: Props) {
  const [scheduledAtLocal, setScheduledAtLocal] = useState(nowJstLocal());
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');

  const createMut = useCreateEstimate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-3">見積もり予定を登録</h2>

        <div className="space-y-3">
          <label className="block text-sm">
            訪問日時（JST）
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border px-2 py-1"
              value={scheduledAtLocal}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            お名前
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="山田 太郎 様"
            />
          </label>

          <label className="block text-sm">
            電話番号
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="090-xxxx-xxxx"
            />
          </label>

          <label className="block text-sm">
            住所
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="大分県別府市…"
            />
          </label>

          <label className="block text-sm">
            メモ（任意）
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="犬がいます。インターホン後に少し待つ"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button className="px-3 py-1 rounded border" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            disabled={!customerName || !phone || !address || createMut.isPending}
            onClick={async () => {
              await createMut.mutateAsync({
                scheduledAt: localToIsoInJst(scheduledAtLocal),
                customerName,
                phone,
                address,
                memo: memo || undefined,
              });
              onDone?.('見積もり予定を登録しました。');
              onClose();
            }}
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
}
