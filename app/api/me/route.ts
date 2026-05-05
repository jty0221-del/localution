import { NextRequest, NextResponse } from 'next/server'
import { verifyCookie } from '@/app/lib/cookieSigning'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // v1.6q: signed cookie 도 verify 해서 반환 (Naver/Kakao 양쪽 호환)
  const userCookie = req.cookies.get('localution_user')?.value
  if (!userCookie) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  // 1차: signed cookie verify
  const verified = verifyCookie(userCookie)
  if (verified) {
    return NextResponse.json({ user: verified })
  }
  // 2차: legacy 평문 JSON (호환)
  try {
    const user = JSON.parse(userCookie)
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('localution_session')
  res.cookies.delete('localution_user')
  return res
}
