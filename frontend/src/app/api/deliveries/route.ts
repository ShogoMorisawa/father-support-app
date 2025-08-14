import { bootstrapMockState, db } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  bootstrapMockState();

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') ?? 'pending') as 'pending' | 'all';
  const order = (searchParams.get('order') ?? 'date.asc') as 'date.asc' | 'date.desc';

  const deliveries = db.deliveries as Array<{ date: string }>;

  // pending: 今日未満を除外（「これから納品するもの」）
  const nowJST = new Date();
  const justToday = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate()); // 00:00 local
  const filtered =
    status === 'pending'
      ? deliveries.filter(
          (d: { date: string }) => new Date(d.date).getTime() >= justToday.getTime(),
        )
      : deliveries;

  const sorted = filtered.sort((a, b) =>
    order === 'date.desc'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return NextResponse.json(
    { ok: true, data: { items: sorted, nextCursor: null }, correlationId: crypto.randomUUID() },
    { status: 200 },
  );
}
