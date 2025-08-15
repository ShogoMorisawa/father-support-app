'use client';
import DeliveriesCard from './_components/DeliveriesCard';
import LowStockCard from './_components/LowStockCard';

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <DeliveriesCard />
      <LowStockCard />
    </main>
  );
}
