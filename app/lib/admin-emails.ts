// app/lib/admin-emails.ts
// ============================================================
// 43차-1 · 관리자 이메일 화이트리스트 단일 source of truth
//   · adminAuth.ts (서버), admin/layout.tsx (클라), middleware.ts (Edge)
//     이 모두 여기서 import 한다.
//   · Edge runtime 에서도 동작해야 하므로 Node API/서버 컴포넌트 의존성 없음.
// ============================================================

const STATIC_ADMIN_EMAILS = [
  'jty0221@gmail.com',
  'jty0221@naver.com',
  'halang@localution.co.kr',
  'admin@localution.co.kr',
] as const

const envList = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export const ADMIN_EMAILS: readonly string[] = Array.from(
  new Set([...STATIC_ADMIN_EMAILS, ...envList]),
)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
