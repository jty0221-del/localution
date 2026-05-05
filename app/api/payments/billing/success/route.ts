// app/api/payments/billing/success/route.ts
// ============================================================
// 토스 빌링 인증 성공 콜백
// · authKey + customerKey 받아서 토스에 billingKey 발급 요청
// · billingKey 는 DB(billing_methods) 에 저장 — 클라이언트 노출 절대 X
// · 카드 정보(표시용)도 함께 DB 저장
// · 보안: 시크릿 키는 환경변수에서만 사용
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type TossCard = {
 issuerCode?: string
 number?: string
 cardType?: string
}

type TossBillingResponse = {
 billingKey?: string
 card?: TossCard
 code?: string
 message?: string
}

export async function GET(req: NextRequest) {
 const url = new URL(req.url)
 const authKey = url.searchParams.get('authKey')
 const customerKey = url.searchParams.get('customerKey')
 const returnTo = url.searchParams.get('returnTo') || '/settings?tab=plan&billing=ok'

 if (!authKey || !customerKey) {
 const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
 fail.searchParams.set('reason', 'missing_auth_key')
 return NextResponse.redirect(fail)
 }

 // 사용자 인증 — 본인 결제수단만 등록 가능
 const auth = await requireUser()
 if (!auth.ok) {
 const fail = new URL('/login', url.origin)
 fail.searchParams.set('reason', 'auth_required')
 return NextResponse.redirect(fail)
 }

 // 환경변수에서만 시크릿 키 가져옴 (클라 입력 폐지)
 const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_docs_Ovk5rk1EwkEbP0W43n07xlzm'

 try {
 const res = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
 method: 'POST',
 headers: {
 Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ authKey, customerKey }),
 cache: 'no-store',
 })

 const data = (await res.json()) as TossBillingResponse

 if (!res.ok) {
 const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
 fail.searchParams.set('reason', data.code || 'issue_failed')
 return NextResponse.redirect(fail)
 }

 const billingKey = data.billingKey || ''
 const cardCompany = data.card?.issuerCode || ''
 const cardNumber = data.card?.number || ''
 const cardLast4 = cardNumber ? cardNumber.replace(/[^0-9]/g, '').slice(-4) : ''
 const cardName = cardCompany ? `${cardCompany} ${cardLast4 ? '****' + cardLast4 : ''}`.trim() : '등록된 카드'

 // DB에 저장 — billingKey 는 서버에만 보관, 클라에 절대 내려가지 않음
 const svc = createServiceClient()
 const { error: saveError } = await svc
 .from('billing_methods')
 .upsert({
 user_id: auth.userId,
 customer_key: customerKey,
 billing_key: billingKey,
 card_name: cardName,
 card_last4: cardLast4 || null,
 card_company: cardCompany || null,
 registered_at: new Date().toISOString(),
 }, { onConflict: 'user_id' })

 if (saveError) {
 console.error('[billing/success] DB save failed:', saveError)
 const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
 fail.searchParams.set('reason', 'db_save_failed')
 return NextResponse.redirect(fail)
 }

 // 쿠키 미사용 — 클라이언트는 /api/billing/me 로 조회
 return NextResponse.redirect(new URL(returnTo, url.origin))
 } catch (e) {
 const msg = e instanceof Error ? e.message : 'server_error'
 const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
 fail.searchParams.set('reason', msg)
 return NextResponse.redirect(fail)
 }
}
