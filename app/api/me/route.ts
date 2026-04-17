import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // localution_user 쿠키(JSON)에서 사용자 정보 직접 읽기
  // localution_session(raw access_token)은 백엔드 인증 토큰 용도로 보존
  const userCookie = req.cookies.get('localution_user')?.value
  const session = req.cookies.get('localution_session')?.value

  if (!userCookie || !session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
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
