'use client';
import Dashboard from './_components/Dashboard';

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <Dashboard />
    </main>
  );
}
