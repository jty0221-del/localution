import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
 const baseUrl = new URL(request.url).origin
 const cookieStore = await cookies()
 cookieStore.delete('localution_session')
 cookieStore.delete('localution_user')
 return NextResponse.redirect(new URL('/login', baseUrl))
}
