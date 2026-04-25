// app/api/marketing/card-news/generate/route.ts
// ============================================================
// 24차-2: 카드뉴스 생성 API (Anthropic Claude) — Instagram 캐러셀 전용
//
// Claude Design 3종 연동 (단일 프롬프트 내장):
//   ① ux-copy:          헤드라인 15자·소제목 20자·CTA 15자 제약
//   ② accessibility:    WCAG AA 대비 4.5:1 + 폰트 17pt/36pt+ 강제
//   ③ design-critique:  시선흐름·계층·일관성 비평 출력
//
// Instagram 캐러셀 특화:
//   - 표지: 스크롤 멈추는 훅 (숫자·호기심·반전 3종 중 1)
//   - 마지막 본문: "다음 장 → 저장" 암시
//   - CTA: 저장·공유·팔로우 3종 유도 (인스타 노출 알고리즘 최적화)
//
// env 필수: ANTHROPIC_API_KEY (Vercel 등록)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
// 27차-9b: claude-3-5-sonnet-20241022 deprecation 대응 — 최신 sonnet-4-6 로 교체
// env ANTHROPIC_MODEL 로 오버라이드 가능 (공식 지원 중단 시 즉시 교체)
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

interface GenerateBody {
  topic: string
  target?: string
  tone?: 'info' | 'empathy' | 'warning' | 'action'
  ratio?: '1:1' | '4:5'
  slide_count?: 8 | 10
  platform?: 'instagram'
  format?: 'carousel'
  youtube_title?: string | null
}

const TONE_DESCRIPTION: Record<string, string> = {
  info:    '정보형 — 지식·팁을 차분히 전달, 과장 없이 팩트 위주',
  empathy: '공감형 — 사장님 고민·불만·실수에 먼저 공감, 해결책 후반 배치',
  warning: '경고형 — "이렇게 하면 망한다" 느낌으로 리스크 환기',
  action:  '실행형 — "오늘 바로 해보세요" 행동 지시, 스텝·체크리스트 중심',
}

function buildPrompt(body: GenerateBody) {
  const { topic, target, tone, ratio, slide_count, youtube_title } = body
  const toneKey = tone || 'action'
  const totalSlides = slide_count || 10
  const bodyCount = totalSlides - 2
  return `너는 하랑마케팅(10년차 자영업 마케팅 대행사, 대표 전태영)의 **인스타그램 캐러셀 제작팀**이다.
아래 요구사항으로 **${totalSlides}장**짜리 **Instagram 캐러셀**을 만들어라.

[주제] ${topic}
[타겟] ${target || '자영업자·소상공인'}
[톤] ${toneKey} — ${TONE_DESCRIPTION[toneKey]}
[비율] ${ratio} (${ratio === '1:1' ? '1080×1080 정사각' : '1080×1350 세로 — 피드 체류시간↑'})
[업로드 채널] Instagram 캐러셀 (최대 10장 스와이프)
${youtube_title ? `[연결 유튜브 제목] ${youtube_title} ← CTA 슬라이드에 "영상으로 보기" 유도 문구 자연스럽게 삽입` : ''}

## 인스타 캐러셀 필수 법칙 (생략 금지)
1. **표지는 스크롤 멈추는 훅** — 숫자·호기심·반전 3종 중 반드시 1개 사용
   (예: "예약 전환 90% 이렇게 만든다" / "아무도 안 알려주는 3가지" / "돈 버는 사장의 반대")
2. **끝까지 보고 싶게 하는 티징** — 표지 subcopy 에 "→ 스와이프" 암시 키워드 (예: "3번째가 핵심")
3. **마지막 본문 슬라이드** — "다음 장 → 저장해두세요" 암시 (CTA 직전에 행동 유도)
4. **CTA 슬라이드** — 저장(Save)·공유(Share)·팔로우(Follow) 3종 중 최소 2개 명시 유도
5. **해시태그는 인스타 위주 15개** — blog/threads 는 참고용 소수만

## 구조 (반드시 이 순서)
1. 표지(cover) 1장 — 스크롤 멈추는 헤드라인 + 스와이프 유도 subcopy
2. 본문(body) ${bodyCount}장 — 1슬라이드 = 1메시지 원칙
   · 첫 본문: 공감/진단 (사장님 현 상황 찌르기)
   · 중간 본문: 핵심 인사이트·팁 순차 공개
   · 마지막 본문: "지금 저장해두세요" 또는 "다음 장에서 실전 적용" 암시
3. CTA(cta) 1장 — 행동 유도(저장·공유·팔로우) + 하랑마케팅 @harang.marketing 브랜딩

## Claude Design 3종 제약 (생략 금지)
### ① UX Copy (design:ux-copy)
- 표지 헤드라인: **15자 이내**, 구어체 훅, 숫자·감정어 포함
- 본문 헤드라인: **20자 이내**, 결론 먼저
- 본문 subcopy: **60자 이내**, 한 문장
- CTA 헤드라인: **15자 이내**, 행동 동사로 시작
- 금지어: "여러분", "오늘은 ~에 대해 알아보겠습니다", 근거 없는 수치("매출 300% 증가" 등)

### ② Accessibility (design:accessibility-review)
- 네이비 #1F2937 위 #FFFFFF → 대비 12.6:1 (AAA)
- 옐로우 #FACC15 위 #111827 → 12.1:1 (AAA)
- 흰 배경 위 #111827 → 19.0:1 (AAA)
- 최소 폰트: 본문 17pt, 헤드라인 36pt+
- accessibility.passed = true (벗어나면 false + 이유)

### ③ Design Critique (design:design-critique)
- 시선 흐름 Z/F 패턴 (상단 훅 → 중앙 메시지 → 하단 CTA)
- 슬라이드 전체 계층 일관성 (bullet 리스트는 본문 0~2장만)
- 정보 밀도 경고: 한 슬라이드 3개 이상 정보 → critique 에 기록
- 캐러셀 완결성: 표지→본문→CTA 내러티브 흐름 평가

## 출력 — 엄격한 JSON (다른 설명·머리말 금지)
{
  "topic": "${topic}",
  "target": "${target || '자영업자·소상공인'}",
  "tone": "${toneKey}",
  "slides": [
    {
      "role": "cover|body|cta",
      "headline": "string (위 제약 준수)",
      "subcopy": "string | null",
      "highlight": "string (body 좌상단 라벨, 예: '1단계' '핵심 팁' '마지막') | null",
      "bullets": ["string", ...]
    }
  ],
  "hashtags": {
    "instagram": ["태그15개 (샵 없이) — #자영업, #소상공인, #사장님공부 포함"],
    "blog":      ["태그5개 (인스타 복제 가능)"],
    "threads":   ["태그3개"]
  },
  "ux_copy_notes": ["카피 교정 포인트 3~5개"],
  "design_critique": ["비평 3~5개 + 캐러셀 내러티브 흐름 평가 1개"],
  "accessibility": {
    "contrast_ratio": "12.6:1",
    "min_font_size": "17pt",
    "passed": true
  }
}`
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    // 카드뉴스 생성은 무거운 호출 — 분당 5회로 더 보수적으로
    const rl = await rateLimit({ bucket: 'card-news', id: auth.userId, limit: 5, windowSec: 60 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    let body: GenerateBody
    try {
      body = (await req.json()) as GenerateBody
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    if (!body.topic || !body.topic.trim()) {
      return NextResponse.json({ error: 'topic 필수' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY 미설정 — Vercel env 등록 필요' },
        { status: 503 }
      )
    }

    const prompt = buildPrompt({
      topic: body.topic,
      target: body.target,
      tone: body.tone || 'action',
      ratio: body.ratio || '1:1',
      slide_count: body.slide_count === 8 ? 8 : 10,
      platform: 'instagram',
      format: 'carousel',
      youtube_title: body.youtube_title || null,
    })

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Anthropic API ${res.status}`, detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await res.json()
    const text: string = data?.content?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: '응답에서 JSON 을 찾지 못함', raw: text.slice(0, 500) },
        { status: 502 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (_e) {
      return NextResponse.json(
        { error: 'JSON 파싱 실패', raw: jsonMatch[0].slice(0, 500) },
        { status: 502 }
      )
    }

    if (!Array.isArray(parsed?.slides) || parsed.slides.length === 0) {
      return NextResponse.json(
        { error: 'slides 배열 누락', raw: parsed },
        { status: 502 }
      )
    }

    // 보정
    parsed.hashtags = parsed.hashtags || { instagram: [], blog: [], threads: [] }
    parsed.ux_copy_notes = parsed.ux_copy_notes || []
    parsed.design_critique = parsed.design_critique || []
    parsed.accessibility = parsed.accessibility || {
      contrast_ratio: '12.6:1',
      min_font_size: '17pt',
      passed: true,
    }

    // 사용 로그 (실패는 무시)
    try {
      const svc = createServiceClient()
      await svc.from('card_news_log').insert({
        user_id: auth.userId,
        topic: body.topic,
        target: body.target || null,
        tone: body.tone || 'action',
        slide_count: body.slide_count || 10,
        platform: 'instagram_carousel',
        input_tokens: data?.usage?.input_tokens || null,
        output_tokens: data?.usage?.output_tokens || null,
      })
    } catch (_) {
      // 로그 실패는 메인 응답에 영향 없음
    }

    return NextResponse.json(parsed, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
