// app/api/captcha-solve/route.ts
// ============================================================
// 내부 전용: Railway 워커가 Naver 로그인 CAPTCHA를 해결할 때 호출
//   - 한국어 영수증 CAPTCHA를 Claude Vision으로 풀이
//   - 인증: SUPABASE_SERVICE_ROLE_KEY (Railway와 Vercel 양측 모두 보유)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 인증: SUPABASE_SERVICE_ROLE_KEY 로 Bearer 토큰 검증
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!token || token !== serviceRoleKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  let body: { image?: string; question?: string; mediaType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const { image, question, mediaType } = body
  if (!image) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 })
  }

  const promptText = (question || '이 이미지에서 질문에 답하세요')
    + '\n한국어로 답하세요. 답만 짧게 (예: 순창, 3, 15000). 다른 설명 없이 답만.'

  // base64 첫 4자로 실제 파일 형식 감지: /9j/=JPEG, iVBO=PNG
  const detectedMediaType = (mediaType as string) || (image.startsWith('/9j/') ? 'image/jpeg' : 'image/png')

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: detectedMediaType, data: image } },
            { type: 'text', text: promptText },
          ],
        }],
      }),
    })

    const claudeJson = await claudeRes.json()
    const answer = (claudeJson?.content?.[0]?.text || '').trim()

    if (!answer) {
      return NextResponse.json({ error: 'no answer from Claude', detail: JSON.stringify(claudeJson).slice(0, 200) }, { status: 502 })
    }

    return NextResponse.json({ answer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch error' }, { status: 500 })
  }
}
