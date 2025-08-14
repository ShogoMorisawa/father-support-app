import { NextResponse } from 'next/server';
import {
  bootstrapMockState,
  db,
  ensureMonotonicSeqFor,
  getIdem,
  nextSeq,
  setIdem,
} from '../../../_mock/db';

type EstimateItem = { materialId?: number | null; materialName: string; quantity: number };
type Estimate = {
  id: number;
  scheduledAt: string;
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

// Next.js 15: 第二引数は { params: Promise<...> }
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  await bootstrapMockState();
  if (!db.estimates) db.estimates = [];

  const idemp = req.headers.get('x-idempotency-key');
  if (!idemp) {
    return NextResponse.json(
      { ok: false, error: { code: 'missing_idempotency', message: 'Idempotencyキーが必要です。' } },
      { status: 400 },
    );
  }
  const method = 'POST';
  const path = `/api/estimates/${idStr}/complete`;
  const idemHit = getIdem(method, path, idemp);
  if (idemHit) return NextResponse.json(idemHit.body, { status: idemHit.status });

  const id = Number(idStr);
  const est = (db.estimates as Estimate[]).find((e) => e.id === id);
  if (!est) {
    return NextResponse.json(
      { ok: false, error: { code: 'not_found', message: '見積が見つかりませんでした。' } },
      { status: 404 },
    );
  }
  if (est.status !== 'scheduled') {
    return NextResponse.json(
      { ok: false, error: { code: 'conflict', message: 'この見積はすでに確定済みです。' } },
      { status: 409 },
    );
  }

  const body = (await req.json()) as {
    accepted: boolean;
    priceCents?: number | null;
    items?: EstimateItem[];
  };
  est.accepted = body.accepted;
  est.priceCents = body.priceCents ?? null;
  est.items = Array.isArray(body.items) ? body.items : [];
  est.status = 'completed';

  let projectId: number | null = null;

  if (body.accepted) {
    // 成立時：案件(Project)と作業(Task)をざっくり生成（モック）
    const store = db as any;
    store.projects = Array.isArray(store.projects) ? store.projects : [];
    store.tasks = Array.isArray(store.tasks) ? store.tasks : [];
    // 既存の最大IDに seq を合わせてから採番
    ensureMonotonicSeqFor(db.estimates as any[], store.projects as any[], store.tasks as any[]);

    const newProjectId: number = nextSeq('history');
    projectId = newProjectId;
    store.projects.push({
      id: newProjectId,
      customerName: est.customerName,
      phone: est.phone,
      address: est.address,
      status: 'in_progress',
      title: `${est.customerName} 邸 工事`,
      createdAt: new Date().toISOString(),
    });

    // 期日の混在に備え、due(ISO) と dueOn(YYYY-MM-DD JST) の両方を設定
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const jst = new Date(utc + 9 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymdJst = `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}`;

    store.tasks.push({
      id: nextSeq('history'),
      projectId: newProjectId,
      title: '見積成立→作業登録',
      due: now.toISOString(),
      dueOn: ymdJst,
      items: (est.items || []).map((it) => ({
        materialId: it.materialId ?? null,
        materialName: it.materialName,
        qtyPlanned: it.quantity,
      })),
      status: 'todo',
    });

    est.projectId = projectId;
  }

  const resBody = { ok: true, data: { estimate: est, projectId }, correlationId: correlationId() };
  setIdem(method, path, idemp, 200, resBody);
  return NextResponse.json(resBody, { status: 200 });
}
