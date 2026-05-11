// app/api/admin/yogiyo-dom-probe/route.ts
// ============================================================
// v38: yogiyo CEO 로그인 페이지 DOM 진단 — selector 변경 추적
//   · server-side fetch 로 HTML 가져와서 input 태그 분석
//   · selector 후보 자동 추출 → worker yogiyo.ts 업데이트 시 참고
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOGIN_URL = 'https://ceo.yogiyo.co.kr/login/'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  try {
    const r = await fetch(LOGIN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    const html = await r.text()
    const htmlSize = html.length

    // input 태그 추출
    const inputRegex = /<input\b([^>]*)>/gi
    const inputs: string[] = []
    let m
    while ((m = inputRegex.exec(html)) !== null) {
      inputs.push(m[0].slice(0, 300))
      if (inputs.length >= 30) break
    }

    // form 태그 추출
    const formRegex = /<form\b([^>]*)>/gi
    const forms: string[] = []
    while ((m = formRegex.exec(html)) !== null) {
      forms.push(m[0].slice(0, 200))
      if (forms.length >= 10) break
    }

    // 주요 키워드 등장 여부
    const keywords = {
      'password': (html.match(/password/gi) || []).length,
      'username': (html.match(/username/gi) || []).length,
      '비밀번호': (html.match(/비밀번호/g) || []).length,
      '아이디': (html.match(/아이디/g) || []).length,
      'login': (html.match(/login/gi) || []).length,
      'react': (html.match(/react/gi) || []).length,
      'next': (html.match(/__NEXT|next\.js/gi) || []).length,
      '#root': (html.match(/#root|id="root"/gi) || []).length,
      'noscript': (html.match(/<noscript/gi) || []).length,
    }

    // JS-only 페이지인지 판단 (input 0개 + react/next 존재)
    const isSpa = inputs.length === 0 && (keywords.react > 0 || keywords.next > 0)

    return NextResponse.json({
      ok: true,
      url: LOGIN_URL,
      status: r.status,
      html_size: htmlSize,
      inputs_count: inputs.length,
      forms_count: forms.length,
      keywords,
      is_spa: isSpa,
      sample_inputs: inputs.slice(0, 10),
      sample_forms: forms.slice(0, 5),
      html_first_500: html.slice(0, 500),
      html_last_500: html.slice(-500),
      hint: isSpa
        ? 'SPA 페이지 — server-side HTML 에 input 없음. Playwright + waitFor + networkidle 필수. yogiyo.ts 의 networkidle 후 추가 retry 필요'
        : 'server HTML 에 input 발견 — selector 매칭 가능',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
