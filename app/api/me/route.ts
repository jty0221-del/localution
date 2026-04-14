import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = req.cookies.get('localution_session')?.value
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  try {
    const user = JSON.parse(Buffer.from(session, 'base64').toString('utf8'))
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('localution_session')
  return res
}
