import { bootstrapMockState, db, getIdem, nextSeq, setIdem } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  // ✅ Next.js 15+: paramsはPromise。awaitが必須
  const { id } = await context.params;
  // ← まず状態を自己修復
  bootstrapMockState();
  const projectId = Number(id);
  const key = req.headers.get('x-idempotency-key');
  const path = `/api/projects/${projectId}/revert-complete`;

  if (!key) {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_request', message: 'Idempotency-Keyが必要です' } },
      { status: 400 },
    );
  }

  const replay = getIdem('POST', path, key);
  if (replay) return NextResponse.json(replay.body, { status: replay.status });

  if (!Number.isFinite(projectId)) {
    const res = { ok: false, error: { code: 'not_found', message: '対象が見つかりません' } };
    setIdem('POST', path, key, 404, res);
    return NextResponse.json(res, { status: 404 });
  }

  const projectsArr = (db as any).projects ?? ((db as any).projects = []);
  const projIdx = projectsArr.findIndex((p: any) => p.id === projectId);
  const proj = projIdx >= 0 ? projectsArr[projIdx] : null;

  if (!proj || proj.status !== 'completed') {
    const res = {
      ok: false,
      error: {
        code: 'conflict',
        message: '元に戻す対象がありません（この案件は完了状態ではありません）',
      },
    };
    setIdem('POST', path, key, 409, res);
    return NextResponse.json(res, { status: 409 });
  }

  // ---- 逆操作（モック）----
  proj.status = 'in_progress';
  proj.completedAt = undefined;

  // 納品予定が無ければ明日JSTの分を作る（デモ用）
  const deliveries: any[] = Array.isArray((db as any).deliveries)
    ? (db as any).deliveries
    : ((db as any).deliveries = []);
  const has = deliveries.some((d) => d.projectId === projectId);
  if (!has) {
    const now = new Date();
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const isoJst = new Date(`${y.toISOString().slice(0, 10)}T00:00:00+09:00`).toISOString();
    const seq = (db as any)._seq ?? ((db as any)._seq = { history: 1, deliveries: 1 });
    deliveries.push({ id: seq.deliveries++, projectId, date: isoJst, address: null });
  }

  const hist = {
    id: nextSeq('history'),
    action: 'project_revert_complete',
    createdAt: new Date().toISOString(),
    targetType: 'project',
    targetId: projectId,
    summary: `${proj?.customerName ?? ''}の完了を元に戻しました`.trim(),
    inverse: { method: 'POST', path: `/api/projects/${projectId}/complete`, payload: null },
  };
  (db as any).history = (db as any).history ?? [];
  (db as any).history.unshift(hist);

  const res = {
    ok: true,
    data: { reverted: true, message: '直前の操作を元に戻しました' },
    correlationId: crypto.randomUUID(),
  };
  setIdem('POST', path, key, 200, res);
  return NextResponse.json(res, { status: 200 });
}
