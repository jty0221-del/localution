// app/api/naver-cookie-helper/route.ts
// 41차-15: 네이버 쿠키 추출 헬퍼 (임시, 관리자 전용)
// GET /api/naver-cookie-helper?token=xxx  → HTML 안내 페이지 반환
// 실제 쿠키 저장은 /api/platform-accounts/cookies 가 처리
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, note: 'use POST /api/platform-accounts/cookies' })
}
