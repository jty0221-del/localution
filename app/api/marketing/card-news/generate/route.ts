// app/api/marketing/card-news/generate/route.ts
// ============================================================
// 24차-2: 카드뉴스 생성 API (Anthropic Claude)
//
// Claude Design 3종 연동 (단일 프롬프트 내장):
//   ① ux-copy:          헤드라인 15자·소제목 20자·CTA 7자 제약
//   ② accessibility:    WCAG AA 대비 4.5:1 + 폰트 17pt/36pt+ 강제
//   ③ design-critique:  시선흐름·계층·일관성 비평 출력
//
// env 필수: ANTHROPIC_API_KEY (Vercel 등록)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-3-5-sonnet-20241022'
// 향후 'claude-sonnet-4-6' 로 교체 가능

interface GenerateBody {
  topic: string
  target?: string
  tone?: 'info' | 'empathy' | 'warning' | 'action'
  ratio?: '1:1' | '4:5'
  slide_count?: 8 | 10
  platform?: 'instagram' | 'blog' | 'place' | 'threads'
  youtube_title?: string | null
}

const TONE_DESCRIPTION: Record<string, string> = {
  info:    '정보형 — 지식·팁을 차분히 전달, 과장 없이 팩트 위주',
  empathy: '공감형 — 사장님 고민·불만·실수에 먼저 공감, 해결책 후반 배치',
  warning: '경고형 — "이렇게 하면 망한다" 느낌으로 리스크 환기',
  action:  '실행형 — "오늘 바로 해보세요" 행동 지시, 스텝·체크리스트 중심',
}

function buildPrompt(body: GenerateBody) {
  const { topic, target, tone, ratio, slide_count, platform, youtube_title } = body
  const toneKey = tone || 'action'
  return `너는 하랑마케팅(10년차 자영업 마케팅 대행사, 대표 전태영)의 카드뉴스 제작팀이다.
아래 요구사항으로 **${slide_count}장**짜리 카드뉴스를 만들어라.

[주제] ${topic}
[타겟] ${target || '자영업자·소상공인'}
[톤] ${toneKey} — ${TONE_DESCRIPTION[toneKey]}
[비율] ${ratio} (${ratio === '1:1' ? '1080×1080 정사각' : '1080×1350 세로'})
[업로드 채널] ${platform}
${youtube_title ? `[연결 유튜브 제목] ${youtube_title} ← CTA 슬라이드에 "영상으로 보기" 유도 문구 자연스럽게 삽입` : ''}

## 구조 (반드시 이 순서)
1. 표지(cover) 1장 — 훅 헤드라인 + 부제
2. 본문(body) ${(slide_count || 8) - 2}장 — 1슬라이드 = 1메시지 원칙
3. CTA(cta) 1장 — 행동 유도 + 하랑마케팅 브랜딩

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
      "highlight": "string (body 좌상단 라벨, 예: '1단계' '핵심 팁') | null",
      "bullets": ["string", ...]
    }
  ],
  "hashtags": {
    "instagram": ["태그15개 (샵 없이)"],
    "blog":      ["태그10개"],
    "threads":   ["태그5개"]
  },
  "ux_copy_notes": ["카피 교정 포인트 3~5개"],
  "design_critique": ["비평 3~5개"],
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
      slide_count: body.slide_count === 10 ? 10 : 8,
      platform: body.platform || 'instagram',
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
        slide_count: body.slide_count || 8,
        platform: body.platform || 'instagram',
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
