// シンプルなメモリ上のデータ。開発サーバ再起動でリセットされます。

export type Task = {
  taskId: number;
  projectId: number;
  customerName: string;
  title: string;
  dueOn: string; // ISO
  address?: string;
  kind?: string; // 例: "障子"
  material?: string; // 例: "かがやき"
  quantity?: number; // 例: 3
};

export type Delivery = {
  id: number;
  taskId: number;
  projectId: number;
  customerName: string;
  date: string; // ISO
  status: 'pending' | 'done' | 'cancelled';
  title: string;
};

export type HistoryItem = {
  id: number;
  action: string;
  createdAt: string; // ISO
  summary?: string;
  inverse?: { method?: string; path?: string; payload?: unknown } | null;
};

// ---- Estimates (見積) ----
export type EstimateItem = {
  materialId?: number | null;
  materialName: string;
  quantity: number; // DECIMAL(12,3) 相当
};

export type Estimate = {
  id: number;
  scheduledAt: string; // ISO (JST想定)
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

let nextHistoryId = 3;

export const db = {
  tasks: <Task[]>[
    {
      taskId: 901,
      projectId: 101,
      customerName: '山田様',
      title: '障子4枚張り替え',
      dueOn: '2025-08-13', // 昨日 → 超過
      address: '大分県別府市駅前町1-1',
      kind: '障子',
      material: 'かがやき',
      quantity: 4,
    },
    {
      taskId: 902,
      projectId: 102,
      customerName: '川澤様',
      title: '網戸3枚交換',
      dueOn: '2025-08-15',
      address: '大分県別府市北浜3-3-3',
      kind: '網戸',
      material: 'グラスファイバー',
      quantity: 3,
    },
    {
      taskId: 903,
      projectId: 103,
      customerName: '森沢様',
      title: '襖2枚 張替',
      dueOn: '2025-08-16',
      address: '大分県別府市浜町5-5-5',
      kind: '襖',
      material: '雲竜紙',
      quantity: 2,
    },
  ],
  deliveries: <Delivery[]>[
    {
      taskId: 1001,
      projectId: 501,
      customerName: '山田 太郎',
      date: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'pending',
      title: '障子4枚 納品',
    },
    {
      taskId: 1002,
      projectId: 502,
      customerName: '佐藤 花子',
      date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      status: 'pending',
      title: '網戸2枚 納品',
    },
  ],
  history: <HistoryItem[]>[
    {
      id: 1,
      action: 'project.complete',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      summary: '山田様の作業を完了（在庫自動減算）',
      inverse: { method: 'POST', path: '/api/projects/501/revert-complete' },
    },
    {
      id: 2,
      action: 'stock.receive',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      summary: '障子紙 かがやき を入荷 +10',
      inverse: undefined,
    },
  ],
  estimates: <Estimate[]>[
    {
      id: 1,
      scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
      customerName: '田中様',
      phone: '090-0000-0000',
      address: '大分県別府市北浜1-1-1',
      memo: '犬がいます。インターホン後に少し待つ',
      status: 'scheduled',
      items: [{ materialId: null, materialName: '障子紙 かがやき', quantity: 4 }],
      projectId: null,
    },
    {
      id: 2,
      scheduledAt: new Date(
        new Date(Date.now() + 1 * 24 * 3600 * 1000).setHours(15, 0, 0, 0),
      ).toISOString(),
      customerName: '佐藤様',
      phone: '080-1111-1111',
      address: '大分県別府市駅前町2-2-2',
      status: 'scheduled',
      items: [{ materialId: null, materialName: '網戸 グラスファイバー', quantity: 2 }],
      projectId: null,
    },
    {
      id: 3,
      scheduledAt: new Date(
        new Date(Date.now() + 2 * 24 * 3600 * 1000).setHours(9, 30, 0, 0),
      ).toISOString(),
      customerName: '鈴木様',
      phone: '070-2222-2222',
      address: '大分県別府市浜町3-3-3',
      status: 'scheduled',
      items: [],
      projectId: null,
    },
  ],
};

export function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  const newItem: HistoryItem = {
    id: nextHistoryId++,
    createdAt: new Date().toISOString(),
    ...item,
  };
  db.history.unshift(newItem);
  return newItem;
}

export function revertComplete(projectId: number) {
  // 本物の在庫処理はしないが、履歴だけ追加してそれっぽく
  return addHistory({
    action: 'project.revert_complete',
    summary: `プロジェクト#${projectId} の完了を取り消し`,
    inverse: { method: 'POST', path: `/api/projects/${projectId}/complete` },
  });
}

// === Idempotency & History SEQ/型 ===

// Idempotencyの簡易ストア（キー: METHOD:PATH|X-Idempotency-Key）
export const idem = new Map<string, { status: number; body: unknown }>();

export function idemKey(method: string, path: string, key: string) {
  return `${method.toUpperCase()}:${path}|${key}`;
}
export function getIdem(method: string, path: string, key?: string | null) {
  if (!key) return null;
  return idem.get(idemKey(method, path, key)) ?? null;
}
export function setIdem(method: string, path: string, key: string, status: number, body: unknown) {
  const k = idemKey(method, path, key);
  const val = { status, body };
  idem.set(k, val);
  return val;
}

// 履歴イベントの型とストア初期化（未定義なら作成）
(db as any).history = Array.isArray((db as any).history) ? (db as any).history : [];
export type HistoryEvent = {
  id: number;
  action: string;
  createdAt: string; // ISO
  targetType: string; // "project" など
  targetId: number;
  summary?: string;
  inverse: { method: 'POST'; path: string; payload?: unknown | null };
};
export function nextSeq(name: 'history' | 'deliveries' | 'estimates' = 'estimates') {
  (db as any)._seq = (db as any)._seq ?? { history: 1, deliveries: 1, estimates: 1 };
  const n = (db as any)._seq[name] ?? 1;
  (db as any)._seq[name] = n + 1;
  return n;
}
// ----- _seq 初期化：既存最大IDに合わせる -----
(db as any)._seq = (db as any)._seq ?? { history: 1, deliveries: 1, estimates: 1 };
{
  const histArr: any[] = (db as any).history;
  const maxHistId = histArr.reduce((m, ev) => {
    const n = Number(ev?.id) || 0;
    return n > m ? n : m;
  }, 0);
  if ((db as any)._seq.history <= maxHistId) {
    (db as any)._seq.history = maxHistId + 1;
  }
  // 重複ID・無効IDを正規化してユニーク化
  const seen = new Set<number>();
  for (const ev of histArr) {
    let id = Number(ev?.id) || 0;
    if (id <= 0 || seen.has(id)) {
      id = (db as any)._seq.history++;
      ev.id = id;
    }
    seen.add(id);
  }
}

export function bootstrapMockState(): void {
  const anydb = db as any;

  // 安全に配列を用意
  anydb.tasks = Array.isArray(anydb.tasks) ? anydb.tasks : [];
  anydb.projects = Array.isArray(anydb.projects) ? anydb.projects : [];
  anydb.history = Array.isArray(anydb.history) ? anydb.history : [];
  anydb.deliveries = Array.isArray(anydb.deliveries) ? anydb.deliveries : [];
  anydb.estimates = Array.isArray(anydb.estimates) ? anydb.estimates : [];

  // tasks から projects を補完（無ければ作る）
  const projects: any[] = anydb.projects;
  const projById = new Map<number, any>(projects.map((p: any) => [p.id, p]));
  for (const t of anydb.tasks as any[]) {
    if (!projById.has(t.projectId)) {
      const proj = {
        id: t.projectId,
        customerName: t.customerName,
        status: 'in_progress' as const,
      };
      projects.push(proj);
      projById.set(t.projectId, proj);
    }
  }

  // history の表記ゆれ／targetId／inverse／現在状態を自己修復
  for (const ev of anydb.history as any[]) {
    // action の表記ゆれ
    if (ev.action === 'project.complete') ev.action = 'project_complete';
    if (ev.action === 'project.revert_complete') ev.action = 'project_revert_complete';

    // targetId を inverse.path から推定
    let pid: number | undefined = Number(ev?.targetId);
    if (!Number.isFinite(pid)) {
      const m = String(ev?.inverse?.path || '').match(/\/projects\/(\d+)\//);
      if (m) pid = Number(m[1]);
    }
    if (Number.isFinite(pid!)) {
      ev.targetId = pid!;
      ev.targetType = ev.targetType ?? 'project';

      // プロジェクトが無ければ作る（例: 501）
      if (!projById.has(pid!)) {
        const name =
          typeof ev.summary === 'string' && ev.summary.includes('様')
            ? ev.summary.split('様')[0] + '様'
            : `顧客${pid}`;
        const proj = { id: pid, customerName: name, status: 'in_progress' as const };
        projects.push(proj);
        projById.set(pid!, proj);
      }

      // inverse.path の補完
      if (!ev.inverse || !ev.inverse.path) {
        ev.inverse = {
          method: 'POST',
          path: `/api/projects/${pid}/revert-complete`,
          payload: null,
        };
      }

      // 「完了」履歴があるなら現在状態を completed に寄せる
      if (ev.action === 'project_complete') {
        const p = projById.get(pid!);
        if (p && p.status !== 'completed') {
          p.status = 'completed';
          if (!p.completedAt) p.completedAt = ev.createdAt ?? new Date().toISOString();
        }
      }
    }
  }

  const todayJST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date()); // "YYYY-MM-DD"
  anydb._seq = anydb._seq ?? { history: 1, deliveries: 1 };

  const deliveries: Delivery[] = anydb.deliveries;
  const hasDeliveryFor = new Map<number, boolean>();
  for (const d of deliveries) hasDeliveryFor.set(d.projectId, true);

  for (const t of anydb.tasks as any[]) {
    if (String(t.dueOn) >= todayJST && !hasDeliveryFor.get(t.projectId)) {
      const d: Delivery = {
        taskId: t.taskId,
        id: anydb._seq.deliveries++,
        projectId: t.projectId,
        customerName: t.customerName,
        date: new Date(`${t.dueOn}T00:00:00+09:00`).toISOString(),
        status: 'pending',
        title: t.title,
      };
      deliveries.push(d);
      hasDeliveryFor.set(t.projectId, true);
      // ステータスを「納品予定」に寄せる
      const p = projById.get(t.projectId);
      if (p && p.status !== 'completed') p.status = 'delivery_scheduled';
    }
  }

  // 履歴IDのユニーク化とシーケンス調整
  anydb._seq = anydb._seq ?? { history: 1, deliveries: 1 };
  const histArr: any[] = anydb.history;
  const maxId = histArr.reduce((m, ev) => Math.max(m, Number(ev?.id) || 0), 0);
  if (anydb._seq.history <= maxId) anydb._seq.history = maxId + 1;

  const seen = new Set<number>();
  for (const ev of histArr) {
    let id = Number(ev?.id) || 0;
    if (id <= 0 || seen.has(id)) {
      id = anydb._seq.history++;
      ev.id = id;
    }
    seen.add(id);
  }
}
