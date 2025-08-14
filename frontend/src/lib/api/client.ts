// ベースURL（本番はApp RunnerのURL、開発はRailsの http://localhost:3000）
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function resolveUrl(path: string) {
  // Next.jsのモックAPI（/api/...）はBASEを付けずに同一オリジンへ
  if (path.startsWith('/api/')) return path;
  return `${API_BASE}${path}`;
}

// 安全なUUID（ブラウザにcryptoが無い場合のフォールバック付き）
function newUUID() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// 共通エラー型（OpenAPIの共通フォーマットと相性良し）
export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;
  constructor(
    status: number,
    body: { error?: { code?: string; message?: string; fields?: Record<string, string> } },
  ) {
    super(body?.error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.code = body?.error?.code ?? undefined;
    this.fields = body?.error?.fields ?? undefined;
  }
}

// リクエストオプション型（OpenAPIの共通フォーマットと相性良し）
type RequestOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown; // JSONにシリアライズ
  correlationId?: string; // 任意。なければ付けない
};

// ベースAPI関数（OpenAPIの共通フォーマットに準拠）
export async function api(path: string, opts: RequestOpts = {}) {
  const method = (opts.method ?? 'GET').toUpperCase() as RequestOpts['method'];
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method!);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };

  // 変化系は毎回Idempotency-Keyを自動付与
  if (isMutation) headers['X-Idempotency-Key'] = newUUID();
  if (opts.correlationId) headers['X-Correlation-Id'] = opts.correlationId;

  const res = await fetch(resolveUrl(path), {
    method,
    headers,
    body: isMutation ? JSON.stringify(opts.body ?? {}) : undefined,
    cache: 'no-store',
    // 認証導入時は credentials, Authorization などをここに
  });

  const json = await res.json().catch(() => ({})); // JSONでない時の保険（基本はJSON想定）

  if (!res.ok) {
    // 409は“競合”（楽観ロック/多重送信）— UIで再読込・再操作を促す
    throw new ApiError(res.status, json);
  }
  return json; // { ok: true, data: {...}, correlationId: "..." } の想定
}

// 糖衣関数（使いやすく）
api.get = <T = unknown>(path: string, headers?: Record<string, string>) =>
  api(path, { method: 'GET', headers }) as Promise<T>;

api.post = <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
  api(path, { method: 'POST', body, headers }) as Promise<T>;
api.patch = <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
  api(path, { method: 'PATCH', body, headers }) as Promise<T>;
api.del = <T = unknown>(path: string, headers?: Record<string, string>) =>
  api(path, { method: 'DELETE', headers }) as Promise<T>;

export default api;
