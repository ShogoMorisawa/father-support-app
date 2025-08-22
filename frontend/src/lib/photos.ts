const BASE = (process.env.NEXT_PUBLIC_PHOTO_BASE_URL || '').replace(/\/$/, '');

export function photoUrlFromKey(key: string | undefined | null): string | null {
  if (!key) return null;
  if (!BASE) return null; // ベース未設定なら直リンクを出さない
  // key は S3 オブジェクトキー。URL の path にそのまま乗せる
  // 例: https://cdn.example.com/uploads/projects/123/.../file.jpg
  return `${BASE}/${encodeURI(key)}`;
}
