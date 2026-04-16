import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('localution_session')
  cookieStore.delete('localution_user')
  return NextResponse.redirect('/login')
}
