'use client';

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
  placeholder?: string;
  className?: string;
}

export function CategorySelector({
  value,
  onChange,
  placeholder = '種別を選択',
  className = '',
}: CategorySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      <option value="">{placeholder}</option>
      <option value="障子">障子</option>
      <option value="襖">襖</option>
      <option value="網戸">網戸</option>
    </select>
  );
}
