// app/api/review-reply/submit/route.ts
// ============================================================
// 43차-6 · LEGACY → /api/review-reply/auto-publish 로 forward
//
//   기존 30차-21 의 "수동 클립보드 모드" 는 폐기되고
//   41차-10 부터 auto-publish 가 단일 진실원이 되었음.
//   외부 호출자(있다면) 호환을 위해 동일 페이로드를 forward.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const url = new URL('/api/review-reply/auto-publish', req.nextUrl.origin)
  const cookie = req.headers.get('cookie') ?? ''
  const body = await req.text()
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body,
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}
