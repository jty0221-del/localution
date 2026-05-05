// app/api/translate/papago/route.ts
// ============================================================
// Papago 자동 번역 API
// POST { text, source, target }
// · source: 'ko' | 'en' | 'ja' | 'zh-CN' (default: ko)
// · target: 'en' | 'ja' | 'zh-CN' | 'ko'
// · 반환: { ok, translated }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAPAGO_URL = 'https://openapi.naver.com/v1/papago/n2mt'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const text = String(body?.text || '').slice(0, 1000)
 const source = String(body?.source || 'ko')
 const target = String(body?.target || 'en')

 if (!text.trim()) {
 return NextResponse.json({ ok: false, error: 'empty_text' }, { status: 400 })
 }

 const clientId = process.env.NAVER_CLIENT_ID
 const clientSecret = process.env.NAVER_CLIENT_SECRET
 if (!clientId || !clientSecret) {
 return NextResponse.json({
 ok: false,
 error: 'no_credentials',
 message: 'NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수 없음',
 }, { status: 500 })
 }

 try {
 const params = new URLSearchParams({ source, target, text })

 const res = await fetch(PAPAGO_URL, {
 method: 'POST',
 headers: {
 'X-Naver-Client-Id': clientId,
 'X-Naver-Client-Secret': clientSecret,
 'Content-Type': 'application/x-www-form-urlencoded',
 },
 body: params.toString(),
 signal: AbortSignal.timeout(8000),
 })

 if (!res.ok) {
 const errText = await res.text().catch(() => '')
 return NextResponse.json({
 ok: false,
 error: 'papago_error',
 status: res.status,
 message: errText.slice(0, 200),
 }, { status: 502 })
 }

 const json: any = await res.json()
 const translated = json?.message?.result?.translatedText
 if (!translated) {
 return NextResponse.json({
 ok: false,
 error: 'no_translation',
 message: '번역 결과 없음',
 }, { status: 500 })
 }

 return NextResponse.json({ ok: true, translated, source, target })
 } catch (e: any) {
 return NextResponse.json({
 ok: false,
 error: 'exception',
 message: String(e?.message).slice(0, 200),
 }, { status: 500 })
 }
}
