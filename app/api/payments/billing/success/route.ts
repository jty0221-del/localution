import { NextRequest, NextResponse } from 'next/server'

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
    const cardInfo = {
      cardCompany: data.card?.issuerCode || '',
      cardNumber: data.card?.number || '',
      cardType: data.card?.cardType || '',
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error'
    const fail = new URL(returnTo.replace('billing=ok', 'billing=fail'), url.origin)
    fail.searchParams.set('reason', msg)
    return NextResponse.redirect(fail)
  }
}
