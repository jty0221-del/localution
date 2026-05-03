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

  // question 은 naver.ts 에서 이미 한국어 instruction 포함하여 전달됨
  // 마크다운/따옴표 없이 답만 출력하도록 명시
  const promptText = (question || '이 이미지를 보고 이미지 속 질문에 답하세요.')
    + ' 마크다운, 따옴표, ** 없이 순수 텍스트로만 답하세요.'

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
      signal: AbortSignal.timeout(30000),  // 30초 timeout (Vision은 더 오래 걸림)
    })

    const claudeJson = await claudeRes.json()
    // 마크다운 포매팅 제거: Claude가 **굵게** 또는 _기울임_ 형식으로 답할 수 있음
    const rawAnswer = (claudeJson?.content?.[0]?.text || '').trim()
    const answer = rawAnswer
      .replace(/\*\*/g, '')   // **bold** 제거
      .replace(/\*/g, '')     // *italic* 제거
      .replace(/`/g, '')      // `code` 제거
      .replace(/^["'「『]/,'').replace(/["'」』]$/,'')  // 따옴표 제거
      .trim()

    if (!answer) {
      return NextResponse.json({ error: 'no answer from Claude', detail: JSON.stringify(claudeJson).slice(0, 200) }, { status: 502 })
    }

    return NextResponse.json({ answer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch error' }, { status: 500 })
  }
}
