// app/api/platform-accounts/route.ts
// ============================================================
// 23차-8b: 플랫폼 자격증명 CRUD (2026-04-21)
//
// GET /api/platform-accounts
// · 본인이 연결한 모든 플랫폼 라벨 반환 (비밀번호 복호화 안 함)
//
// POST /api/platform-accounts
// · body: { platform, account_id, password, platform_store_id?, platform_store_name? }
// · 사전조건: /api/legal/platform-consent 동의 기록 존재
// · 평문 password → encryptSecret() → platform_credentials upsert
// · 응답에는 비밀번호 절대 포함 금지
//
// DELETE /api/platform-accounts?platform=naver_place
// · 연결 해제 (credentials 삭제 + platform_consents soft-revoke)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import {
 VALID_PLATFORMS,
 PLATFORM_LABELS,
 savePlatformCredentials,
 listPlatformCredentialLabels,
 removePlatformCredentials,
 type PlatformSlug,
} from '@/app/lib/platform-credentials'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidPlatform(v: unknown): v is PlatformSlug {
 return typeof v === 'string' && (VALID_PLATFORMS as readonly string[]).includes(v)
}

async function extractIp(): Promise<string | null> {
 try {
 const h = await headers()
 const f = h.get('x-forwarded-for')
 if (f) return f.split(',')[0].trim()
 return h.get('x-real-ip') ?? null
 } catch {
 return null
 }
}

async function extractUa(): Promise<string | null> {
 try {
 const h = await headers()
 return h.get('user-agent') ?? null
 } catch {
 return null
 }
}

// ─────────────────────────────────────────────
// GET — 연결된 플랫폼 라벨 목록
// ─────────────────────────────────────────────
export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }

 const svc = createServiceClient()
 const labels = await listPlatformCredentialLabels(svc, auth.userId)

 return NextResponse.json({
 ok: true,
 accounts: labels,
 available_platforms: VALID_PLATFORMS.map((p) => ({
 platform: p,
 label: PLATFORM_LABELS[p],
 connected: labels.some((l) => l.platform === p),
 })),
 })
}

// ─────────────────────────────────────────────
// POST — 자격증명 저장
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }

 let body: {
 platform?: string
 account_id?: string
 password?: string
 platform_store_id?: string
 platform_store_name?: string
 } = {}
 try {
 body = await req.json()
 } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
 }

 if (!isValidPlatform(body.platform)) {
 return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
 }
 if (!body.account_id || typeof body.account_id !== 'string' || body.account_id.length < 2) {
 return NextResponse.json({ ok: false, error: 'invalid_account_id' }, { status: 400 })
 }
 if (!body.password || typeof body.password !== 'string' || body.password.length < 1) {
 return NextResponse.json({ ok: false, error: 'password_required' }, { status: 400 })
 }

 const svc = createServiceClient()

 // 사전조건: 해당 플랫폼에 대한 유효 동의가 존재해야 함
 const { data: consent, error: consentErr } = await svc
 .from('v_active_platform_consents')
 .select('consent_id, consent_version')
 .eq('user_id', auth.userId)
 .eq('platform', body.platform)
 .maybeSingle()

 if (consentErr) {
 return NextResponse.json(
 { ok: false, error: 'consent_check_failed', message: consentErr.message },
 { status: 500 }
 )
 }
 if (!consent) {
 return NextResponse.json(
 {
 ok: false,
 error: 'consent_required',
 message: '대리권 위임 동의가 먼저 필요합니다. /api/legal/platform-consent POST 선행.',
 },
 { status: 412 } // Precondition Failed
 )
 }

 const ip = await extractIp()
 const ua = await extractUa()

 const result = await savePlatformCredentials(svc, {
 user_id: auth.userId,
 platform: body.platform,
 account_id: body.account_id.trim(),
 password: body.password,
 platform_store_id: body.platform_store_id ?? null,
 platform_store_name: body.platform_store_name ?? null,
 consent_version: consent.consent_version ?? 'v1.0',
 consent_ip: ip,
 consent_user_agent: ua,
 })

 if (!result.ok) {
 return NextResponse.json(
 { ok: false, error: 'save_failed', message: result.error },
 { status: 500 }
 )
 }

 // ── 28차-2: stores 테이블 자동 upsert (단일 진실원) ───────────────
 // 연결 성공 시 매장 정보가 /review-admin, /settings, /qr-admin 등
 // 모든 페이지에서 공유되도록 stores 테이블에도 기본 레코드를 저장한다.
 // 실패해도 연결 자체는 성공으로 응답 (stores 동기화는 부차 기능).
 try {
 const storeName = body.platform_store_name?.trim() || ''
 if (storeName) {
 // 기존 store 가 있으면 이름/ID 업데이트, 없으면 생성
 const { data: existing } = await svc
 .from('stores')
 .select('id, slug, name, naver_place_id')
 .eq('user_id', auth.userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 const isNaverPlace = body.platform === 'naver_place'
 const payload: any = {
 user_id: auth.userId,
 name: existing?.name || storeName,
 updated_at: new Date().toISOString(),
 }
 if (isNaverPlace && body.platform_store_id) {
 payload.naver_place_id = body.platform_store_id
 payload.naver_url = `https://map.naver.com/p/entry/place/${body.platform_store_id}`
 payload.naver_place_url = payload.naver_url
 }

 if (existing?.id) {
 await svc.from('stores').update(payload).eq('id', existing.id)
 } else {
 // 37차-15: stores.slug 가 user_id 무관 unique → user_id 8자 suffix로 충돌 방지
 const slugBase = storeName
 .toLowerCase()
 .replace(/[^a-z0-9가-힣]+/g, '-')
 .replace(/^-+|-+$/g, '') || 'store'
 payload.slug = slugBase + '-' + auth.userId.slice(0, 8)
 payload.created_at = new Date().toISOString()
 const { error: insErr } = await svc.from('stores').insert(payload)
 if (insErr && String(insErr.message || '').includes('duplicate')) {
 // 충돌 시 timestamp 추가 재시도
 payload.slug = slugBase + '-' + auth.userId.slice(0, 8) + '-' + Date.now().toString(36)
 await svc.from('stores').insert(payload)
 }
 }
 }
 } catch (e) {
 console.warn('[platform-accounts] stores auto-upsert failed (non-fatal):', e)
 }

 // ── 쿠팡이츠 자동 큐잉 (장사닥터 패턴) ─────────────────────────
 // 60차: 큐잉 전에 Vercel save-login 먼저 시도 (배민과 동일 패턴).
 // 1) /api/coupang/save-login 처럼 한국 proxy raw HTTP → 쿠키 받으면 저장
 // 2) 성공 시: 워커는 저장된 쿠키로 즉시 reviews fetch (Playwright form login skip)
 // 3) 실패 시: 기존 흐름 (워커 Playwright form login fallback)
 let coupang_job_id: string | null = null
 let coupang_save_login_method: string | null = null
 if (body.platform === 'coupangeats') {
 // (1) Vercel save-login 시도 — Akamai 통과하면 즉시 cookies 저장
 try {
 const { coupangProxyLogin } = await import('@/app/lib/coupang-login')
 const loginResult = await coupangProxyLogin(body.account_id.trim(), body.password)
 if (loginResult.ok) {
 coupang_save_login_method = loginResult.method
 // session_cookies 등 extra_data 업데이트
 const { data: cred } = await svc
 .from('platform_credentials').select('extra_data').eq('user_id', auth.userId).eq('platform', 'coupangeats').maybeSingle()
 const existingExtra = (cred?.extra_data as Record<string, unknown>) || {}
 const newExtra: Record<string, unknown> = {
 ...existingExtra,
 session_cookies: loginResult.cookies,
 coupang_login_method: loginResult.method,
 coupang_login_at: new Date().toISOString(),
 }
 const updateRow: Record<string, unknown> = {
 extra_data: newExtra,
 last_login_status: 'success:save-login',
 last_login_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 }
 // storeId auto-discovery (whoami 응답에서) — 다중 매장 모두 추출
 if (loginResult.whoami) {
 const w: any = loginResult.whoami
 const primarySid = w.responsibleStoreId || w.storeId || w.defaultStoreId ||
 (Array.isArray(w.stores) && w.stores[0]?.storeId) || null
 const sname = w.storeName ||
 (Array.isArray(w.stores) && (w.stores[0]?.name || w.stores[0]?.storeName)) || null
 if (primarySid) updateRow.platform_store_id = String(primarySid)
 if (sname) updateRow.platform_store_name = String(sname)

 // whoami.stores 배열에서 모든 매장 ID 추출 → extra_data.store_ids 에 저장
 if (Array.isArray(w.stores) && w.stores.length > 0) {
 const allIds = w.stores
 .map((s: any) => String(s.storeId || s.id || '').trim())
 .filter((s: string) => /^\d+$/.test(s))
 if (allIds.length > 0) {
 newExtra.store_ids = allIds
 newExtra.store_ids_auto_detected_at = new Date().toISOString()
 console.log('[platform-accounts] coupang multi-store detected:', allIds.length, 'stores:', allIds.join(','))
 }
 }
 }
 await svc.from('platform_credentials').update(updateRow)
 .eq('user_id', auth.userId).eq('platform', 'coupangeats')
 console.log('[platform-accounts] coupang save-login OK:', loginResult.method)
 } else {
 console.warn('[platform-accounts] coupang save-login failed (계속 큐잉):', loginResult.error)
 }
 } catch (e: any) {
 console.warn('[platform-accounts] coupang save-login exception (계속 큐잉):', e?.message)
 }

 // (2) 큐잉 (save-login 결과와 무관 — 워커가 cookies 있으면 사용, 없으면 form login)
 try {
 const enq = await enqueuePlatformJob(
 {
 platform: 'coupangeats',
 action: 'fetch_reviews',
 userId: auth.userId,
 storeId: body.platform_store_id || 'pending',
 payload: {
 initial_sync: true,
 range_days: 365,
 triggered_by: 'connect_flow',
 },
 },
 // 연결 직후 즉시 처리 — priority 1 (post_reply 와 동일 우선순위)
 { priority: 1 }
 )
 if (enq.ok) coupang_job_id = enq.jobId
 } catch (e) {
 console.warn('[platform-accounts] coupang enqueue failed (non-fatal):', e)
 }
 }

 // v1.6w: 요기요 / 배민 도 연결 즉시 자동 fetch (ID/PW 저장만으로 자동 작동)
 let auto_job_id: string | undefined
 if (['yogiyo', 'baemin'].includes(body.platform as string)) {
 try {
 const enq = await enqueuePlatformJob(
 {
 platform: body.platform as any,
 action: 'fetch_reviews',
 userId: auth.userId,
 storeId: body.platform_store_id || 'auto-detect',
 payload: {
 initial_sync: true,
 days_back: 30,
 triggered_by: 'connect_flow',
 },
 },
 { priority: 1 }
 )
 if (enq.ok) auto_job_id = enq.jobId
 console.log('[platform-accounts] ' + body.platform + ' auto-enqueued:', enq.ok)
 } catch (e) {
 console.warn('[platform-accounts] ' + body.platform + ' enqueue failed (non-fatal):', e)
 }
 }

 return NextResponse.json({
 ok: true,
 id: result.id,
 platform: body.platform,
 label: PLATFORM_LABELS[body.platform as PlatformSlug],
 coupang_job_id,
 coupang_save_login_method,
 auto_job_id,
 })
}

// ─────────────────────────────────────────────
// DELETE — 연결 해제 (credentials 삭제 + consent soft-revoke)
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }

 const { searchParams } = new URL(req.url)
 const platform = searchParams.get('platform')
 if (!isValidPlatform(platform)) {
 return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
 }

 const svc = createServiceClient()

 // 1) credentials 삭제
 const removed = await removePlatformCredentials(svc, auth.userId, platform)
 if (!removed.ok) {
 return NextResponse.json(
 { ok: false, error: 'remove_failed', message: removed.error },
 { status: 500 }
 )
 }

 // 2) consent soft-revoke (3년 보관은 유지되고 revoked_at 만 세팅)
 try {
 await svc
 .from('platform_consents')
 .update({
 revoked_at: new Date().toISOString(),
 revoke_reason: 'user_unlink',
 })
 .eq('user_id', auth.userId)
 .eq('platform', platform)
 .is('revoked_at', null)
 } catch (e) {
 console.warn('[platform-accounts] consent revoke failed:', e)
 }

 return NextResponse.json({
 ok: true,
 removed: removed.removed,
 platform,
 })
}



// ─────────────────────────────────────────────
// PATCH — platform_store_id + 매장 정보 동기화
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }

 let body: {
 platform?: string
 platform_store_id?: string
 platform_store_name?: string
 store_address?: string
 store_category?: string
 store_phone?: string
 store_naver_url?: string
 } = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
 }

 if (!isValidPlatform(body.platform)) {
 return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
 }
 if (!body.platform_store_id) {
 return NextResponse.json({ ok: false, error: 'platform_store_id 필요' }, { status: 400 })
 }

 const svc = createServiceClient()

 // 1) platform_credentials 업데이트
 const { error: credErr } = await svc
 .from('platform_credentials')
 .update({
 platform_store_id: body.platform_store_id,
 platform_store_name: body.platform_store_name
 ? String(body.platform_store_name).replace(/<[^>]*>/g, '').trim() || null
 : null,
 updated_at: new Date().toISOString(),
 })
 .eq('user_id', auth.userId)
 .eq('platform', body.platform)

 if (credErr) {
 return NextResponse.json({ ok: false, error: credErr.message }, { status: 500 })
 }

 // 2) stores 테이블 풀 업데이트 (설정 페이지와 연동)
 try {
 const { data: existing } = await svc
 .from('stores')
 .select('id, name')
 .eq('user_id', auth.userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 const storePayload: Record<string, string | null> = {
 updated_at: new Date().toISOString(),
 }
 if (body.platform === 'naver_place' && body.platform_store_id) {
 storePayload.naver_place_id = body.platform_store_id
 storePayload.naver_url = body.store_naver_url || ('https://map.naver.com/p/entry/place/' + body.platform_store_id)
 storePayload.naver_place_url = storePayload.naver_url
 }
 if (body.platform_store_name) {
 // HTML 태그 제거 (Naver API 반환값 정제)
 const rawName = String(body.platform_store_name).replace(/<[^>]*>/g, '').trim()
 const LABEL_SET = new Set(['네이버 플레이스', '배달의민족', '요기요', '쿠팡이츠', '카카오맵'])
 if (rawName && !LABEL_SET.has(rawName)) storePayload.name = rawName
 }
 if (body.store_address) storePayload.address = body.store_address
 if (body.store_category) storePayload.category = body.store_category
 if (body.store_phone) storePayload.phone = body.store_phone

 if (existing?.id) {
 await svc.from('stores').update(storePayload).eq('id', existing.id)
 } else if (body.platform_store_name) {
 // 37차-15: stores.slug 가 user_id 무관 unique → user_id 8자 suffix로 충돌 방지
 const slugBase = (body.platform_store_name || '')
 .toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'store'
 const slug = slugBase + '-' + auth.userId.slice(0, 8)
 const insertPayload = {
 ...storePayload,
 user_id: auth.userId,
 slug,
 created_at: new Date().toISOString(),
 }
 const { error: insErr } = await svc.from('stores').insert(insertPayload)
 if (insErr && String(insErr.message || '').includes('duplicate')) {
 await svc.from('stores').insert({
 ...insertPayload,
 slug: slug + '-' + Date.now().toString(36),
 })
 }
 }
 } catch (e) {
 console.warn('[platform-accounts PATCH] stores sync failed (non-fatal):', e)
 }

 return NextResponse.json({ ok: true, platform: body.platform, platform_store_id: body.platform_store_id })
}
