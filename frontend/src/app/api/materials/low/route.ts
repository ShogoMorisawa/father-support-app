import { NextRequest, NextResponse } from 'next/server';
import { bootstrapMockState, db, ensureMaterialsSeed } from '../../_mock/db';

function correlationId() {
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(_req: NextRequest) {
  await bootstrapMockState();
  ensureMaterialsSeed();

  const items = (db.materials as any[])
    .filter((m) => Number(m.currentQty ?? 0) < Number(m.thresholdQty ?? 0))
    .map((m) => ({
      materialId: m.id,
      name: m.name,
      unit: m.unit, // unitフィールドも追加
      currentQty: m.currentQty,
      thresholdQty: m.thresholdQty,
    }));

  return NextResponse.json(
    { ok: true, data: { items }, correlationId: correlationId() },
    { status: 200 },
  );
}
