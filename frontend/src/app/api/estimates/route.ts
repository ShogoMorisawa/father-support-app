import { NextRequest, NextResponse } from 'next/server';
import {
  bootstrapMockState,
  db,
  ensureMonotonicSeqFor,
  getIdem,
  nextSeq,
  setIdem,
} from '../_mock/db';

type EstimateItem = {
  materialId?: number | null;
  materialName: string;
  quantity: number; // DECIMAL(12,3)相当
};

type Estimate = {
  id: number;
  scheduledAt: string; // ISO
  customerId?: number | null;
  customerName: string;
  phone: string;
  address: string;
  memo?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  accepted?: boolean | null;
  priceCents?: number | null;
  items: EstimateItem[];
  projectId?: number | null;
};

function correlationId() {
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function toJstDateString(d: Date) {
  // JST(+9)で YYYY-MM-DD
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 60 * 60000);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const day = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function datePartJst(iso: string) {
  return toJstDateString(new Date(iso));
}
function ensureEstimatesSeed() {
  if (!db.estimates) db.estimates = [];
  if (db.estimates.length === 0) {
    const today = new Date();
    const seed = [1, 2, 3].map((n) => {
      const d = new Date(today.getTime() + n * 24 * 60 * 60 * 1000);
      return <Estimate>{
        id: nextSeq(),
        scheduledAt: new Date(d.setHours(10, 0, 0, 0)).toISOString(),
        customerName: `田中様 ${n}`,
        phone: '090-0000-0000',
        address: '大分県別府市○○',
        memo: n === 1 ? '犬がいます。インターホン押してから少し待つ' : undefined,
        status: 'scheduled',
        items: [],
      };
    });
    db.estimates.push(...seed);
    // 既存データの最大IDに seq を合わせる
    ensureMonotonicSeqFor(db.estimates as any[]);
  }
}

// GET /api/estimates?from&to&cursor&limit
export async function GET(req: NextRequest) {
  await bootstrapMockState();
  ensureEstimatesSeed();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from'); // YYYY-MM-DD (JST)
  const to = searchParams.get('to'); // YYYY-MM-DD (JST)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  let items = (db.estimates as Estimate[])
    .slice()
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  if (from) items = items.filter((e) => datePartJst(e.scheduledAt) >= from);
  if (to) items = items.filter((e) => datePartJst(e.scheduledAt) <= to);

  const paged = items.slice(0, limit);
  const nextCursor = items.length > limit ? `${limit}` : null;

  return NextResponse.json(
    { ok: true, data: { items: paged, nextCursor }, correlationId: correlationId() },
    { status: 200 },
  );
}

// POST /api/estimates  （Idempotency 必須）
export async function POST(req: NextRequest) {
  await bootstrapMockState();
  ensureEstimatesSeed();
  // 採番前に、既存の最大IDに seq を寄せる（重複防止）
  ensureMonotonicSeqFor(db.estimates as any[]);

  const idemp = req.headers.get('x-idempotency-key');
  if (!idemp) {
    return NextResponse.json(
      { ok: false, error: { code: 'missing_idempotency', message: 'Idempotencyキーが必要です。' } },
      { status: 400 },
    );
  }
  const idemHit = getIdem('POST:/api/estimates', idemp);
  if (idemHit) return NextResponse.json(idemHit.body, { status: idemHit.status });

  const body = (await req.json()) as {
    scheduledAt: string;
    customerId?: number | null;
    customerName: string;
    phone: string;
    address: string;
    memo?: string | null;
  };

  const est: Estimate = {
    id: nextSeq(),
    scheduledAt: body.scheduledAt,
    customerId: body.customerId ?? null,
    customerName: body.customerName,
    phone: body.phone,
    address: body.address,
    memo: body.memo ?? null,
    status: 'scheduled',
    items: [],
  };
  (db.estimates as Estimate[]).push(est);

  const resBody = { ok: true, data: { estimate: est }, correlationId: correlationId() };
  setIdem('POST', '/api/estimates', idemp, 200, resBody);
  return NextResponse.json(resBody, { status: 200 });
}
