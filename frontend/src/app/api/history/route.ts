import { bootstrapMockState, db } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // ← まず状態を自己修復
  bootstrapMockState();

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get('limit') ?? 10);
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 10;

  const projects = new Map<number, any>(
    (Array.isArray((db as any).projects) ? (db as any).projects : []).map((p: any) => [p.id, p]),
  );

  const items = ((Array.isArray((db as any).history) ? (db as any).history : []) as any[])
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((ev: any) => {
      const pid: number | undefined =
        Number(ev?.targetId) ||
        Number(String(ev?.inverse?.path || '').match(/\/projects\/(\d+)\//)?.[1]);
      const proj = pid ? projects.get(pid) : null;

      let canUndo = false;
      const path = String(ev?.inverse?.path || '');
      if (path.endsWith('/revert-complete')) {
        // 取り消しは現在 completed のときだけ可能
        canUndo = proj?.status === 'completed';
      } else if (path.endsWith('/complete')) {
        // 完了は現在 completed でないときだけ可能
        canUndo = proj?.status !== 'completed';
      }
      return { ...ev, canUndo };
    })
    .slice(0, limit);

  return NextResponse.json(
    { ok: true, data: { items }, correlationId: crypto.randomUUID() },
    { status: 200 },
  );
}
