import { bootstrapMockState, db, idem } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function GET() {
  // 自己修復を適用して現在の一貫した状態を可視化
  bootstrapMockState();
  const projects = Array.isArray((db as any).projects) ? (db as any).projects : [];
  const tasks = Array.isArray((db as any).tasks) ? (db as any).tasks : [];
  const deliveries = Array.isArray((db as any).deliveries) ? (db as any).deliveries : [];
  const materials = Array.isArray((db as any).materials) ? (db as any).materials : [];
  const materialsLow = materials.filter((m: any) => Number(m.currentQty ?? 0) < Number(m.thresholdQty ?? 0));
  const history = Array.isArray((db as any).history) ? (db as any).history : [];
  const seq = (db as any)._seq ?? {};
  const idemSize = idem && typeof (idem as any).size === 'number' ? (idem as any).size : 0;

  return NextResponse.json({
    ok: true,
    data: {
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        deliveries: deliveries.length,
        materials: materials.length,
        materialsLow: materialsLow.length,
        history: history.length,
        idem: idemSize,
      },
      projects,
      tasks,
      deliveries,
      materials,
      materialsLow,
      history,
      seq,
    },
    correlationId: crypto.randomUUID(),
  });
}
