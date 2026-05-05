import { NextRequest, NextResponse } from 'next/server'

/**
 * Toss Payments 빌링 인증 실패 콜백
 * 사용자가 카드 등록을 취소하거나 실패하면 이 라우트로 redirect됨.
 * code/message 파라미터를 settings로 들고 가서 사용자에게 표시.
 */

export async function GET(req: NextRequest) {
 const url = new URL(req.url)
 const code = url.searchParams.get('code') || 'unknown'
 const message = url.searchParams.get('message') || ''
 const returnTo = url.searchParams.get('returnTo') || '/settings?tab=plan&billing=fail'

 const target = new URL(returnTo, url.origin)
 target.searchParams.set('reason', code)
 if (message) target.searchParams.set('msg', message)

 return NextResponse.redirect(target)
}

export const dynamic = 'force-dynamic'
