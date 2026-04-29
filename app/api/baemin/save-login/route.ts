// app/api/baemin/save-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, createPublicKey, publicEncrypt, constants, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 서울 리전 우선 배정 — 배민 서버가 한국 IP 외 차단
export const preferredRegion = 'icn1'

const ALGO = 'aes-256-gcm'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const decipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8')
}

function rsaEncryptHex(modHex: string, expHex: string, text: string): string {
  const n = Buffer.from(modHex, 'hex').toString('base64url')
  const e = Buffer.from(expHex, 'hex').toString('base64url')
  const key = createPublicKey({ key: { kty: 'RSA', n, e }, format: 'jwk' })
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(text)).toString('hex')
}

function extractCookies(res: Response): string[] {
  const parts: string[] = []
  if ((res.headers as any).getSetCookie) {
    for (const c of (res.headers as any).getSetCookie()) {
      const p = c.split(';')[0].trim()
      if (p) parts.push(p)
    }
  }
  if (parts.length === 0) {
    res.headers.forEach((val: string, name: string) => {
      if (name.toLowerCase() === 'set-cookie') {
        const p = val.split(';')[0].trim()
        if (p && !parts.includes(p)) parts.push(p)
      }
    })
  }
  return parts
}

export async function doLogin(id: string, pw: string): Promise<string> {
  const base = 'https://biz-member.baemin.com'
  const commonHdrs: Record<string, string> = {
    'User-Agent': UA,
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
  }

  // Step 0: 로그인 페이지 방문 → dsid 등 초기 쿠키 획득
  const preRes = await fetch(base + '/login', {
    headers: { ...commonHdrs, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
    cache: 'no-store',
  })
  const preCookies = extractCookies(preRes)
  const preHdr = preCookies.join('; ')

  // Step 1: RSA 공개키 획득
  const ts1 = Date.now()
  const initRes = await fetch(base + '/v1/login/init?__ts=' + ts1, {
    headers: {
      ...commonHdrs,
      'Accept': 'application/json, text/plain, */*',
      'Origin': base,
      'Referer': base + '/login',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(preHdr ? { 'Cookie': preHdr } : {}),
    },
    cache: 'no-store',
  })

  if (!initRes.ok) {
    const body = await initRes.text().catch(() => '')
    throw new Error('로그인 초기화 실패 (' + initRes.status + ')' + (body ? ': ' + body.slice(0, 100) : ''))
  }

  const initCookies = [...preCookies, ...extractCookies(initRes)]
  const initData = await initRes.json()
  if (initData.status !== 'SUCCESS') throw new Error('초기화 오류: ' + initData.status)

  const modHex: string = initData.data.tag
  const expHex: string = initData.data.value
  const value1 = rsaEncryptHex(modHex, expHex, id.trim())
  const value2 = rsaEncryptHex(modHex, expHex, pw.trim())
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const pwDecoy = Array.from({ length: 60 }, () => chars[Math.floor(Math.random() * 36)]).join('')

  // Step 2: 로그인
  const ts2 = Date.now()
  const loginRes = await fetch(base + '/v1/login?__ts=' + ts2, {
    method: 'POST',
    headers: {
      ...commonHdrs,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Origin': base,
      'Referer': base + '/login',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(initCookies.length > 0 ? { 'Cookie': initCookies.join('; ') } : {}),
    },
    body: JSON.stringify({ id: id.trim(), pw: pwDecoy, value1, value2, token: '', autoLogin: false }),
    cache: 'no-store',
  })

  const loginData = await loginRes.json().catch(() => ({}))
  if ((loginData as any).status !== 'SUCCESS') {
    const msg = (loginData as any).message || (loginData as any).status || '로그인 실패'
    if ((loginData as any).status === 'FAIL_WRONG_AUTHENTICATION') {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    throw new Error(msg)
  }

  // Step 3: 모든 쿠키 수집
  const allCookies = [...initCookies, ...extractCookies(loginRes)]
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const c of allCookies) {
    const key = c.split('=')[0]
    if (!seen.has(key)) { seen.add(key); deduped.push(c) }
  }

  if (deduped.length === 0) throw new Error('로그인 후 쿠키를 받지 못했어요.')
  return deduped.join('; ')
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!
  const svc = createServiceClient()

  try {
    const body = await req.json().catch(() => ({}))
    const { baemin_id, baemin_pw, shop_no } = body || {}
    if (!baemin_id || !baemin_pw) {
      return NextResponse.json({ ok: false, error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const cookieStr = await doLogin(String(baemin_id), String(baemin_pw))

    const idEnc     = encryptStr(String(baemin_id))
    const pwEnc     = encryptStr(String(baemin_pw))
    const cookieEnc = encryptStr(cookieStr)
    const shopNo    = String(shop_no || '14637452')

    const extraData = {
      baemin_id_enc: idEnc.enc, baemin_id_iv: idEnc.iv, baemin_id_tag: idEnc.tag,
      baemin_pw_enc: pwEnc.enc, baemin_pw_iv: pwEnc.iv, baemin_pw_tag: pwEnc.tag,
      baemin_cookie_enc: cookieEnc.enc, baemin_cookie_iv: cookieEnc.iv, baemin_cookie_tag: cookieEnc.tag,
    }

    const { data: existing } = await svc
      .from('platform_credentials').select('id')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()

    if (existing) {
      const { error } = await svc.from('platform_credentials')
        .update({ extra_data: extraData, platform_store_id: shopNo })
        .eq('id', (existing as any).id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await svc.from('platform_credentials')
        .insert({ user_id: userId, platform: 'baemin', platform_store_id: shopNo, extra_data: extraData })
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ ok: true, message: '배민 연동 완료! 이제 리뷰를 자동으로 가져와요.' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '연동 실패' }, { status: 500 })
  }
}
