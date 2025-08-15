'use client';
import Toast from '@/app/_components/Toast';
import { useCreateCustomer } from '@/lib/api/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewCustomerPage() {
  const [form, setForm] = useState<any>({ name: '', nameKana: '', phone: '', address: '' });
  const create = useCreateCustomer();
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">顧客の新規登録</h1>

      <div className="rounded border bg-white p-4 space-y-3">
        {['name', 'nameKana', 'phone', 'address'].map((k) => (
          <div key={k}>
            <label className="block text-sm mb-1">
              {k === 'name' ? '名前' : k === 'nameKana' ? 'カナ' : k === 'phone' ? '電話' : '住所'}
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form[k] || ''}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <button
            className="rounded bg-black text-white px-3 py-2"
            onClick={async () => {
              try {
                const res = await create.mutateAsync({
                  name: form.name,
                  nameKana: form.nameKana,
                  phone: form.phone,
                  address: form.address,
                });
                setToast('顧客を登録しました。');
                setTimeout(() => router.push('/customers'), 500);
              } catch {
                setToast('登録に失敗しました。入力内容をご確認ください。');
              }
            }}
          >
            登録
          </button>
          <button className="rounded border px-3 py-2" onClick={() => router.back()}>
            戻る
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
