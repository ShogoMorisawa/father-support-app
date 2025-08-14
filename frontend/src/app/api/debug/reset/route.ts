import { bootstrapMockState, db, idem } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function GET() {
  bootstrapMockState();
  const projects = Array.isArray((db as any).projects) ? (db as any).projects : [];
  const tasks = Array.isArray((db as any).tasks) ? (db as any).tasks : [];
  const history = Array.isArray((db as any).history) ? (db as any).history : [];
  const deliveries = Array.isArray((db as any).deliveries) ? (db as any).deliveries : [];
  const seq = (db as any)._seq ?? {};
  const idemSize = idem && typeof (idem as any).size === 'number' ? (idem as any).size : 0;
  const todayJST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const pendingDeliveries = deliveries.filter(
    (d: any) => new Date(d.date).toISOString().slice(0, 10) >= todayJST,
  );

  return NextResponse.json({
    ok: true,
    data: {
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        history: history.length,
        deliveries: deliveries.length,
        pendingDeliveries: pendingDeliveries.length,
        idem: idemSize,
      },
      projects,
      tasks,
      history,
      deliveries,
      seq,
    },
    correlationId: crypto.randomUUID(),
  });
}
