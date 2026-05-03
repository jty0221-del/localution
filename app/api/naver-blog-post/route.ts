import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 네이버 블로그 관리대행용 포스팅 자동 생성 API
// 입력: { industry, persona, keywords, draft, cta, length, photoNames }
// 출력: { ok, post: string (markdown) }
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser()
    const limitId = auth.ok ? auth.userId : `ip:${getClientIp(req)}`
    const rl = await rateLimit({ bucket: 'naver-blog-post', id: limitId, limit: 10, windowSec: 60 })
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const body = await req.json()
    const {
      industry = '',
      persona = { name: '', title: '', phone: '' },
      keywords = [] as string[],
      draft = '',
      cta = { phone: '', kakao: '', reservation: '' },
      length = 2500,
      photoNames = [] as string[],
    } = body || {}

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY 미설정 — Vercel 환경변수 확인 필요' }, { status: 500 })
    }

    if (!industry.trim() && !keywords.length) {
      return NextResponse.json({ ok: false, error: '업종 또는 타겟 키워드를 입력해주세요' }, { status: 400 })
    }

    const mainKeyword = keywords[0] || industry || ''
    const subKeywords = keywords.slice(1)

    const systemPrompt = `당신은 네이버 블로그 관리대행 10년차 전문가입니다. 소상공인·자영업자용 블로그 포스팅을 작성합니다.

[핵심 원칙]
- 검색 유입을 위한 키워드 최적화
- 고객 궁금증 해결 후 자연스러운 CTA 연결
- 체류시간을 높이는 볼드 후킹 + 사진 분산 배치
- 클라이언트(업체 담당자) 페르소나로 신뢰감 있는 톤 유지

[글 구조]
1. 제목 - 타겟 키워드 자연스럽게 포함, 특수문자(|, ★, ♥ 등) 금지, 50자 이내
2. 오프닝 - 페르소나 인사 + [썸네일 사진 - 별도 삽입] 표시 + 인용문(>) 캐치프레이즈 + 신뢰도 요소 + 본문 연결 브릿지
3. 본문 - 소제목(볼드) 3개 이상, 섹션당 핵심문장 2~3개 볼드 처리, 사진 파일명을 본문 흐름에 분산 배치
4. CTA - 부담 낮추는 멘트 + 연락처 볼드 + 예상 질문 3개를 → 로 제시 + 긴급성/희소성 클로징(볼드)
5. 해시태그 - --- 구분선 후 20~30개, # 시작, 핵심 키워드 변형 + 업종 + 지역 + 롱테일

[절대 금지]
- 이모티콘 사용 금지 (📷, ✅, 🚗, ★ 등 전부)
- 제목 특수 구분자 금지 (|, /, :: 등)
- 사진 몰아 배치 금지 (분산 필수)
- 제공된 사진 누락 금지 (전부 사용)
- 키워드 스터핑 금지

[톤 규칙]
- 페르소나 직업적 전문성 + 대화하듯 친근하게
- 존댓말 (합쇼체와 해요체 혼용 가능)
- 기초 설명 생략, 고객이 실제로 궁금해하는 포인트 집중
- "솔직히 말씀드리면", "자신 있게 말씀드립니다" 같은 진정성 표현 활용

[출력 형식]
마크다운 형식. 볼드는 **텍스트**, 인용문은 >, 소제목은 **볼드**(헤딩 # 금지), 사진은 파일명만 한 줄 표기, 해시태그는 본문 끝 --- 아래.

JSON이나 코드블록 없이, 완성된 블로그 포스팅 본문만 출력하세요.`

    const photoBlock = photoNames.length > 0
      ? `\n\n[제공된 사진 파일명 — 전부 본문에 분산 배치]\n${photoNames.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}`
      : '\n\n[사진 없음 — 본문 흐름에 맞춰 "[사진]" 자리 표시만 삽입]'

    const userMsg = `[업종/주제] ${industry || '(미지정)'}

[페르소나]
- 이름: ${persona.name || '(담당자)'}
- 직함: ${persona.title || ''}
- 연락처: ${persona.phone || ''}

[타겟 키워드]
- 메인: ${mainKeyword}
- 서브: ${subKeywords.join(', ') || '(없음)'}

[초안/메모]
${draft || '(없음 - 업종과 키워드 기반으로 작성)'}

[CTA 정보]
- 전화: ${cta.phone || ''}
- 카카오톡 채널: ${cta.kakao || ''}
- 예약/상담 링크: ${cta.reservation || ''}
${photoBlock}

[글자 수 목표]
${length}자 내외

위 정보로 네이버 블로그 포스팅 마크다운 1편을 완성하세요.`

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: AbortSignal.timeout(55000),  // 55초 timeout (장문 블로그 생성, maxDuration:60 안에 끝나도록)
    })

    if (!apiRes.ok) {
      const txt = await apiRes.text()
      return NextResponse.json({ ok: false, error: 'Anthropic API 오류: ' + txt }, { status: 500 })
    }

    const data = await apiRes.json()
    const text = data?.content?.[0]?.text || ''

    if (!text) {
      return NextResponse.json({ ok: false, error: '응답이 비어있습니다', raw: data }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: text })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '알 수 없는 오류' }, { status: 500 })
  }
}
