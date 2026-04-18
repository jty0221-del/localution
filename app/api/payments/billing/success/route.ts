import { NextRequest, NextResponse } from 'next/server'

/**
 * Toss Payments 빌링 인증 성공 콜백
 * 사용자가 카드 등록을 완료하면 이 라우트로 authKey와 customerKey가 전달된다.
 * 여기서 Toss 빌링키를 발급받아 서버에 저장하고 /settings 페이지로 복귀.
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const authKey = url.searchParams.get('authKey')
  const customerKey = url.searchParams.get('customerKey')
  const returnTo = url.searchParams.get('returnTo') || '/settings?tab=plan&billing=ok'

  // authKey가 없으면 바로 실패 처리
  if (!authKey || !customerKey) {
    const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
    fail.searchParams.set('reason', 'missing_auth_key')
    return NextResponse.redirect(fail)
  }

  // Toss 비밀키 (서버 전용)
  const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_docs_Ovk5rk1EwkEbP0W43n07xlzm'

  try {
    // 빌링키 발급
    const res = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey, customerKey }),
      cache: 'no-store',
    })

    const data: any = await res.json()

    if (!res.ok) {
      console.error('[billing/success] 빌링키 발급 실패:', data)
      const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
      fail.searchParams.set('reason', encodeURIComponent((data && data.code) || 'issue_failed'))
      return NextResponse.redirect(fail)
    }

    // 빌링키 확보. 실제 운영에서는 DB에 저장해야 하나,
    // 현재는 쿠키로 7일 보관 (MVP)
    const billingKey: string = String(data.billingKey || '')
    const cardInfo = {
      cardCompany: (data.card && data.card.issuerCode) || '',
      cardNumber:  (data.card && data.card.number)     || '',
      cardType:    (data.card && data.card.cardType)   || '',
    }

    const redirect = NextResponse.redirect(new URL(returnTo, url.origin))
    redirect.cookies.set('localution_billing_key', billingKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect.cookies.set('localution_billing_customer', customerKey, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect.cookies.set('localution_billing_card', JSON.stringify(cardInfo), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return redirect
  } catch (e: any) {
    console.error('[billing/success] 예외:', e)
    const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
    fail.searchParams.set('reason', encodeURIComponent(e?.message || 'server_error'))
    return NextResponse.redirect(fail)
  }
}

export const dynamic = 'force-dynamic'
