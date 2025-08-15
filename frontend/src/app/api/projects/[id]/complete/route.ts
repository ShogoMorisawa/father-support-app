import {
  adjustMaterialsForProject,
  bootstrapMockState,
  db,
  ensureMaterialsSeed,
  getIdem,
  nextSeq,
  setIdem,
} from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  // ✅ Next.js 15+: paramsはPromise。awaitが必須
  const { id } = await context.params;
  // ← まず状態を自己修復
  bootstrapMockState();
  ensureMaterialsSeed();

  const projectId = Number(id);
  const key = req.headers.get('x-idempotency-key');
  const path = `/api/projects/${projectId}/complete`;

  if (!key) {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_request', message: 'Idempotency-Keyが必要です' } },
      { status: 400 },
    );
  }

  const replay = getIdem('POST', path, key);
  if (replay) return NextResponse.json(replay.body, { status: replay.status });

  const body = await req.json().catch(() => ({} as any));
  const completedAt: string | undefined = body?.completedAt;

  if (!Number.isFinite(projectId)) {
    const res = { ok: false, error: { code: 'not_found', message: '対象が見つかりません' } };
    setIdem('POST', path, key, 404, res);
    return NextResponse.json(res, { status: 404 });
  }

  // projects配列を確実に用意
  const projectsArr = (db as any).projects ?? ((db as any).projects = []);
  let projIdx = projectsArr.findIndex((p: any) => p.id === projectId);
  let proj = projIdx >= 0 ? projectsArr[projIdx] : null;

  // ✅ tasksからスタブ自動作成（開発モック時の404回避）
  if (!proj) {
    const task = (db as any).tasks?.find?.((t: any) => t.projectId === projectId);
    if (task) {
      proj = { id: projectId, status: 'in_progress', customerName: task.customerName };
      projectsArr.push(proj);
      projIdx = projectsArr.length - 1;
    }
  }

  if (!proj) {
    const res = { ok: false, error: { code: 'not_found', message: '対象が見つかりません' } };
    setIdem('POST', path, key, 404, res);
    return NextResponse.json(res, { status: 404 });
  }

  if (proj.status === 'completed') {
    const res = { ok: false, error: { code: 'conflict', message: 'すでに完了済みです' } };
    setIdem('POST', path, key, 409, res);
    return NextResponse.json(res, { status: 409 });
  }

  // ---- 原子的な完了処理（モック）----
  proj.status = 'completed';
  proj.completedAt = completedAt ?? new Date().toISOString();

  // 納品予定（deliveries）を削除
  (db as any).deliveries = Array.isArray((db as any).deliveries) ? (db as any).deliveries : [];
  (db as any).deliveries = (db as any).deliveries.filter((d: any) => d.projectId !== projectId);

  // 履歴に逆操作を保存
  const hist = {
    id: nextSeq('history'),
    action: 'project_complete',
    createdAt: new Date().toISOString(),
    targetType: 'project',
    targetId: projectId,
    summary: `${proj?.customerName ?? ''}の作業完了`.trim(),
    inverse: { method: 'POST', path: `/api/projects/${projectId}/revert-complete`, payload: null },
  };
  (db as any).history = (db as any).history ?? [];
  (db as any).history.unshift(hist);

  // 在庫を減算（tasks.items の qty を合算）。Idempotencyヒット時はこのコードに来ないため多重減算されない。
  try {
    const pid = Number(id);
    adjustMaterialsForProject(pid, -1);
  } catch {
    // モックのため黙殺（本実装ではログ）
  }

  const res = {
    ok: true,
    data: { projectId, completed: true, message: '作業を完了しました' },
    correlationId: crypto.randomUUID(),
  };
  setIdem('POST', path, key, 200, res);
  return NextResponse.json(res, { status: 200 });
}
