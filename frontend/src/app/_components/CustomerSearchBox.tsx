'use client';
import { useCustomerSearch } from '@/lib/api/hooks';
import { useEffect, useState } from 'react';

type Customer = { id?: number; name: string; phone?: string; address?: string };

export default function CustomerSearchBox(props: {
  value: Customer;
  onChange: (c: Customer) => void;
}) {
  const { value, onChange } = props;
  const [q, setQ] = useState(value?.name ?? '');
  const [focused, setFocused] = useState(false);
  const { data } = useCustomerSearch(q);
  const items: any[] = data?.data?.items ?? [];

  useEffect(() => {
    setQ(value?.name ?? '');
  }, [value?.name]);

  const showList = focused && q.trim().length > 0 && items.length > 0;

  return (
    <div className="relative">
      <label className="block text-sm mb-1">お名前</label>
      <input
        value={q}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          onChange({ ...value, name: e.target.value });
        }}
        className="w-full border rounded px-3 py-2"
        placeholder="例）山田太郎"
      />
      {showList && (
        <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
          {items.map((c) => (
            <li
              key={c.id}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
              onMouseDown={() =>
                onChange({ id: c.id, name: c.name, phone: c.phone, address: c.address })
              }
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-600">
                {c.phone ?? '-'} / {c.address ?? '-'}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-sm mb-1">電話</label>
          <input
            value={value?.phone ?? ''}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="090-xxxx-xxxx"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">住所</label>
          <input
            value={value?.address ?? ''}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="大分市…"
          />
        </div>
      </div>
    </div>
  );
}
