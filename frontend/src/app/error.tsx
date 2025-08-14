'use client';
export default function Error({ error }: { error: Error }) {
  return <div className="p-4 text-red-600">エラー：{error.message}</div>;
}
