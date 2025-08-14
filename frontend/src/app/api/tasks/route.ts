import { db, Task } from '@/app/api/_mock/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const order = searchParams.get('order') ?? 'due.asc'; // due.asc | due.desc（将来拡張想定）

  const tasks = [...db.tasks].sort((a: Task, b: Task) => {
    const da = new Date(a.dueOn).getTime();
    const dbt = new Date(b.dueOn).getTime();
    return order === 'due.desc' ? dbt - da : da - dbt;
  });

  return NextResponse.json({
    ok: true,
    data: tasks,
    correlationId: crypto.randomUUID(),
  });
}
