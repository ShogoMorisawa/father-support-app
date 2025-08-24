'use client';
import CustomerSearchBox from '@/app/_components/CustomerSearchBox';
import Toast from '@/app/_components/Toast';
import { useCreateEstimate } from '@/lib/api/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Item = { materialName: string; quantity: number };

export default function NewEstimatePage() {
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [customer, setCustomer] = useState<any>({ name: '' });
  const [items, setItems] = useState<Item[]>([{ materialName: '', quantity: 1 }]);
  const [toast, setToast] = useState<string | null>(null);
  const create = useCreateEstimate();
  const router = useRouter();

  const addItem = () => setItems((prev) => [...prev, { materialName: '', quantity: 1 }]);
  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">見積の新規作成</h1>

      <div className="rounded border bg-white p-4 space-y-4">
        <div>
          <label className="block text-sm mb-1">見積日時</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-3 py-2"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <CustomerSearchBox value={customer} onChange={setCustomer} />

        <div>
          <label className="block text-sm mb-2">アイテム</label>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-center">
                <input
                  className="col-span-4 border rounded px-2 py-2"
                  placeholder="材料名"
                  value={it.materialName}
                  onChange={(e) => updateItem(i, { materialName: e.target.value })}
                />
                <input
                  className="col-span-1 border rounded px-2 py-2 text-right"
                  type="number"
                  min={0}
                  step={0.001}
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                />
                <button
                  className="col-span-1 border rounded px-2 py-2"
                  onClick={() => removeItem(i)}
                >
                  削除
                </button>
              </div>
            ))}
            <button className="rounded border px-3 py-1" onClick={addItem}>
              行を追加
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={async () => {
              try {
                const payload = {
                  scheduledAt: new Date(scheduledAt).toISOString(),
                  customer: {
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                  },
                  items: items
                    .filter((it) => it.materialName.trim().length > 0)
                    .map((it) => ({ materialName: it.materialName, quantity: it.quantity })),
                };
                await create.mutateAsync(payload);
                setToast('見積を作成しました。');
                setTimeout(() => router.push('/estimates'), 500);
              } catch {
                setToast('作成に失敗しました。入力内容をご確認ください。');
              }
            }}
          >
            登録
          </button>
          <button className="px-3 py-1 rounded border" onClick={() => router.back()}>
            戻る
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
