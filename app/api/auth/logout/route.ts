import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.localution.co.kr'
  const res = NextResponse.redirect(baseUrl + '/login')
  res.cookies.set('localution_session', '', { maxAge: 0, path: '/' })
  return res
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.localution.co.kr'
  const res = NextResponse.redirect(baseUrl + '/login')
  res.cookies.set('localution_session', '', { maxAge: 0, path: '/' })
  return res
}
