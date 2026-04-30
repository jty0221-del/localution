// app/api/platform-accounts/naver-cookie/route.ts
// 네이버 세션 쿠키 저장/조회
//   GET                       → has_cookie 여부만 반환
//   GET ?nid_aut=X&nid_ses=Y  → URL 파라미터로 바로 저장
//   GET ?cookie_str=X         → 쿠키 헤더 문자열 파싱 후 저장
//   POST { cookie_json }      → JSON 배열로 저장
//   POST { nid_aut, nid_ses } → 개별 값으로 저장
//   POST { cookie_str }       → 쿠키 헤더 문자열로 저장
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  const hex = raw.replace(/\s+/g, '')
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function encryptCookie(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    enc: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

async function saveCookieJson(userId: string, cookieJson: string): Promise<string> {
  const svc = createServiceClient()
  const now = new Date().toISOString()

  // ── 1) platform_credentials.extra_data 에 저장 (Worker가 확실히 읽는 테이블) ──
  const { data: cred, error: credErr } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', userId)
    .eq('platform', 'naver_place')
    .maybeSingle()

  if (credErr) throw new Error(`platform_credentials 조회 실패: ${credErr.message}`)
  if (!cred) throw new Error('네이버 플랫폼 계정이 연결되지 않았어요. 먼저 네이버 계정을 연결해주세요.')

  const prevExtra = (cred.extra_data as Record<string, unknown>) ?? {}
  const { error: updateErr } = await svc
    .from('platform_credentials')
    .update({ extra_data: { ...prevExtra, naver_session_cookie: cookieJson, naver_cookie_updated_at: now } })
    .eq('user_id', userId)
    .eq('platform', 'naver_place')

  if (updateErr) throw new Error(`쿠키 저장 실패: ${updateErr.message}`)

  // ── 2) naver_session_cookies 테이블에도 병행 저장 (구버전 호환) ──
  try {
    const { enc, iv, tag } = encryptCookie(cookieJson)
    const { data: existing } = await svc
      .from('naver_session_cookies')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (existing?.id) {
      await svc.from('naver_session_cookies')
        .update({ cookie_enc: enc, cookie_iv: iv, cookie_tag: tag, updated_at: now })
        .eq('user_id', userId)
    } else {
      await svc.from('naver_session_cookies')
        .insert({ user_id: userId, cookie_enc: enc, cookie_iv: iv, cookie_tag: tag, updated_at: now })
    }
  } catch { /* 구버전 테이블 없어도 무시 */ }

  return now
}

function parseCookieStr(str: string): { aut: string; ses: string } | null {
  const clean = str.replace(/^cookie:\s*/i, '').trim()
  const aut = (clean.match(/NID_AUT=([^;\s]+)/) || [])[1]?.trim()
  const ses = (clean.match(/NID_SES=([^;\s]+)/) || [])[1]?.trim()
  if (!aut) return null
  return { aut, ses: ses || aut }
}

/** 쿠키 문자열에서 전체 쿠키 배열 추출 (SmartPlace 전용 쿠키 포함) */
function parseAllCookiesFromStr(str: string): object[] | null {
  const clean = str.replace(/^cookie:\s*/i, '').trim()
  const nowSec = Math.floor(Date.now() / 1000)
  const cookies: object[] = []

  for (const part of clean.split(/;\s*/)) {
    const eqIdx = part.indexOf('=')
    if (eqIdx < 0) continue
    const name = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    if (!name || !value) continue

    // SmartPlace 전용 쿠키는 new.smartplace.naver.com 도메인
    const isSmartPlace = name.startsWith('nstore_') || name === 'smart_biz_session'
    cookies.push({
      name,
      value,
      domain: isSmartPlace ? 'new.smartplace.naver.com' : '.naver.com',
      path: '/',
      httpOnly: false,
      secure: true,
      expires: nowSec + 86400 * 30,
    })
  }

  if (!cookies.some((c: any) => c.name === 'NID_AUT')) return null
  return cookies
}

function makeCookieArr(aut: string, ses: string): object[] {
  const nowSec = Math.floor(Date.now() / 1000)
  return [
    { name: 'NID_AUT', value: aut, domain: '.naver.com', path: '/', httpOnly: true, secure: true, expires: nowSec + 86400 * 30 },
    { name: 'NID_SES', value: ses || aut, domain: '.naver.com', path: '/', httpOnly: true, secure: true, expires: nowSec + 86400 * 7 },
  ]
}

// ── GET ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const nidAut = searchParams.get('nid_aut')
  const nidSes = searchParams.get('nid_ses')
  const cookieStrParam = searchParams.get('cookie_str')

  // ?nid_aut=X&nid_ses=Y → 바로 저장
  if (nidAut) {
    try {
      const arr = makeCookieArr(nidAut, nidSes || nidAut)
      const now = await saveCookieJson(auth.userId!, JSON.stringify(arr))
      return NextResponse.json({ ok: true, message: '쿠키 저장 완료!', updated_at: now })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
    }
  }

  // ?cookie_str=... → 전체 쿠키 파싱 후 저장
  if (cookieStrParam) {
    const allArr = parseAllCookiesFromStr(decodeURIComponent(cookieStrParam))
    if (!allArr) return NextResponse.json({ ok: false, error: 'NID_AUT를 찾을 수 없어요' }, { status: 400 })
    try {
      const now = await saveCookieJson(auth.userId!, JSON.stringify(allArr))
      return NextResponse.json({ ok: true, message: '쿠키 저장 완료!', updated_at: now })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
    }
  }

  // 기본: 저장 여부만 반환
  const svc = createServiceClient()
  const { data } = await svc
    .from('naver_session_cookies')
    .select('updated_at')
    .eq('user_id', auth.userId!)
    .maybeSingle()
  return NextResponse.json({ ok: true, has_cookie: !!data, updated_at: data?.updated_at ?? null })
}

// ── POST ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }

  let cookieJson: string

  if (body.cookie_json) {
    // JSON 배열 문자열
    try { JSON.parse(body.cookie_json); cookieJson = body.cookie_json }
    catch { return NextResponse.json({ ok: false, error: '쿠키 JSON 형식이 올바르지 않아요' }, { status: 400 }) }
  } else if (body.nid_aut) {
    // 개별 값
    const arr = makeCookieArr(String(body.nid_aut).trim(), String(body.nid_ses || body.nid_aut).trim())
    cookieJson = JSON.stringify(arr)
  } else if (body.cookie_str) {
    // 쿠키 헤더 문자열 — 전체 쿠키 배열로 파싱 (nstore_session 포함)
    const allArr = parseAllCookiesFromStr(String(body.cookie_str))
    if (!allArr) return NextResponse.json({ ok: false, error: 'NID_AUT를 찾을 수 없어요' }, { status: 400 })
    cookieJson = JSON.stringify(allArr)
  } else if (Array.isArray(body)) {
    // 배열 직접
    cookieJson = JSON.stringify(body)
  } else {
    return NextResponse.json({ ok: false, error: 'cookie_json / nid_aut / cookie_str 중 하나 필요' }, { status: 400 })
  }

  try {
    const now = await saveCookieJson(auth.userId!, cookieJson)
    return NextResponse.json({ ok: true, updated_at: now })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
