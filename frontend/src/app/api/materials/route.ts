import { NextRequest, NextResponse } from 'next/server';
import { bootstrapMockState, db, ensureMaterialsSeed } from '../_mock/db';

function correlationId() {
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: NextRequest) {
  await bootstrapMockState();
  ensureMaterialsSeed();

  const { searchParams } = new URL(req.url);
  const order = searchParams.get('order') || 'name.asc';
  const onlyLow = (searchParams.get('onlyLow') || 'false') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  let items = (db.materials as any[]).slice();

  if (onlyLow) {
    items = items.filter((m) => Number(m.currentQty ?? 0) < Number(m.thresholdQty ?? 0));
  }
  if (order === 'name.asc') {
    items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ja'));
  } else if (order === 'name.desc') {
    items.sort((a, b) => String(b.name).localeCompare(String(a.name), 'ja'));
  }

  items = items.slice(0, limit);

  return NextResponse.json(
    { ok: true, data: { items }, correlationId: correlationId() },
    { status: 200 },
  );
}
