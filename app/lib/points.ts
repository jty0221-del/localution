// app/lib/points.ts
// 로컬루션 포인트 · 원장 (localStorage 우선, DB 연동 준비)
// ──────────────────────────────────────────────────────────────

export type PointRuleKey =
  | 'POST_CREATE'
  | 'COMMENT_CREATE'
  | 'POST_FEATURED'
  | 'DAILY_LOGIN'
  | 'MANUAL_ADJUST'

export const POINT_RULES: Record<PointRuleKey, { delta: number; label: string; memo: string }> = {
  POST_CREATE:     { delta: 100, label: '글 작성',         memo: '커뮤니티 게시글 작성 보상' },
  COMMENT_CREATE:  { delta:  50, label: '댓글 작성',       memo: '커뮤니티 댓글 작성 보상' },
  POST_FEATURED:   { delta: 500, label: '인기 게시글 선정', memo: '좋아요 50 이상 달성' },
  DAILY_LOGIN:     { delta:  10, label: '오늘의 출석',     memo: '하루 1회 로그인 보상' },
  MANUAL_ADJUST:   { delta:   0, label: '수동 조정',       memo: '운영자 조정' },
}

export const FEATURED_THRESHOLD = 50 // 좋아요 기준 인기글 선정

export type LedgerEntry = {
  id: string
  user_email: string
  rule_key: PointRuleKey
  delta: number
  ref_type?: 'post' | 'comment' | 'manual' | null
  ref_id?: string | number | null
  memo?: string
  created_at: string // ISO
}

const LS_KEY = 'localution.point_ledger'

function readLedger(): LedgerEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function writeLedger(entries: LedgerEntry[]) {
  if (typeof window === 'undefined') return
  try {
    // 최근 500건만 보관 (localStorage 경량화)
    const trimmed = entries.slice(-500)
    window.localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
  } catch {}
}

function dedupeKey(email: string, rule: PointRuleKey, refType?: string | null, refId?: string | number | null) {
  return `${email}::${rule}::${refType ?? ''}::${refId ?? ''}`
}

/** 포인트 적립 · 중복 방지(ref_type+ref_id 동일 시 동일 룰 재적립 막음) */
export function awardPoints(opts: {
  user_email: string
  rule_key: PointRuleKey
  ref_type?: LedgerEntry['ref_type']
  ref_id?: LedgerEntry['ref_id']
  delta_override?: number
  memo?: string
}): { ok: boolean; duplicate?: boolean; entry?: LedgerEntry; balance?: number } {
  if (!opts.user_email) return { ok: false }
  const rule = POINT_RULES[opts.rule_key]
  if (!rule) return { ok: false }

  const ledger = readLedger()
  const myEmail = opts.user_email.toLowerCase().trim()

  // 동일 참조건 중복 방지
  if (opts.ref_type && opts.ref_id != null) {
    const key = dedupeKey(myEmail, opts.rule_key, opts.ref_type, opts.ref_id)
    const exists = ledger.some(e =>
      dedupeKey(e.user_email, e.rule_key, e.ref_type ?? null, e.ref_id ?? null) === key
    )
    if (exists) return { ok: false, duplicate: true, balance: getBalance(myEmail) }
  }

  const entry: LedgerEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_email: myEmail,
    rule_key: opts.rule_key,
    delta: opts.delta_override ?? rule.delta,
    ref_type: opts.ref_type ?? null,
    ref_id: opts.ref_id ?? null,
    memo: opts.memo ?? rule.memo,
    created_at: new Date().toISOString(),
  }
  writeLedger([...ledger, entry])
  return { ok: true, entry, balance: getBalance(myEmail) }
}

/** 유저 포인트 잔액 */
export function getBalance(user_email: string): number {
  const email = user_email.toLowerCase().trim()
  return readLedger()
    .filter(e => e.user_email === email)
    .reduce((sum, e) => sum + (e.delta || 0), 0)
}

/** 최근 적립 내역 (N건) */
export function getRecentEntries(user_email: string, limit = 20): LedgerEntry[] {
  const email = user_email.toLowerCase().trim()
  return readLedger()
    .filter(e => e.user_email === email)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit)
}

/** 글 좋아요 수 기준 인기글 보상 트리거 */
export function maybeAwardFeatured(opts: {
  post_id: string | number
  author_email: string
  likes: number
}): { ok: boolean; duplicate?: boolean } {
  if (!opts.author_email) return { ok: false }
  if (opts.likes < FEATURED_THRESHOLD) return { ok: false }
  return awardPoints({
    user_email: opts.author_email,
    rule_key: 'POST_FEATURED',
    ref_type: 'post',
    ref_id: opts.post_id,
  })
}

/** 현재 로그인 유저 이메일(브라우저) — localution_user 쿠키 우선 */
export function readMyEmailFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.split('; ').find(c => c.startsWith('localution_user='))
  if (!m) return ''
  try {
    const raw = decodeURIComponent(m.split('=')[1] || '')
    const obj = JSON.parse(raw)
    return (obj?.email || '').toLowerCase().trim()
  } catch { return '' }
}
