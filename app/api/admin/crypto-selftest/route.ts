// app/api/admin/crypto-selftest/route.ts
// ============================================================
// 23차-2: 암호화 유틸 자체 검증 엔드포인트 (2026-04-21)
//
//   GET /api/admin/crypto-selftest
//   · requireAdmin() 로 관리자만 접근
//   · crypto-utils.selfTest() 호출
//   · KEK 환경변수 로드 + AES-256-GCM 암/복호화 왕복 검증
// ============================================================
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { selfTest } from '@/app/lib/crypto-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = selfTest()

  // 환경변수 존재 여부만 별도 표시 (값은 절대 노출 안 함)
  const envInfo = {
    has_kek_hex:    !!process.env.ENCRYPTION_KEK_HEX,
    kek_hex_length: process.env.ENCRYPTION_KEK_HEX?.length || 0,
    kek_version:    process.env.ENCRYPTION_KEK_VERSION || '(unset)',
  }

  return NextResponse.json({
    ok: result.ok,
    message: result.message,
    env: envInfo,
    timestamp: new Date().toISOString(),
  }, { status: result.ok ? 200 : 500 })
}
