// JSTフォーマッタは再利用（パフォーマンス/一貫性）
const fmtYmdJST = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const fmtHmJST = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** ISO(UTC) -> 'YYYY-MM-DD'（JST） */
export function isoToJstYmd(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtYmdJST.format(d);
}

/** ISO(UTC) -> 'HH:mm'（JST） */
export function isoToJstHm(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtHmJST.format(d);
}

/** 今日の 'YYYY-MM-DD'（JST） */
export function todayJstYmd(): string {
  return fmtYmdJST.format(new Date());
}

/** 明日の 'YYYY-MM-DD'（JST） */
export function tomorrowJstYmd(): string {
  // 日本はDSTなしなので +24h でOK
  return fmtYmdJST.format(new Date(Date.now() + 24 * 60 * 60 * 1000));
}
