import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 광고업계에서 통용되는 영상 기획 JSON 스키마에 맞춰
// Claude가 상세 scene-by-scene 기획을 자동 생성한다.
//
// 입력: { storeName, category, keywords, usp, mood, duration, platform, cta }
// 출력: VideoScript JSON
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      storeName = '우리 매장',
      category = '카페',
      keywords = [],
      usp = '',
      mood = 'upbeat',
      duration = 30,
      platform = 'reels',
      cta = '지금 방문하기',
    } = body || {}

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY 미설정 — Vercel 환경변수 확인 필요' }, { status: 500 })
    }

    const sceneCount = duration <= 15 ? 5 : duration <= 30 ? 8 : 12
    const perScene = Math.round((duration / sceneCount) * 10) / 10

    const systemPrompt = `당신은 인스타그램 릴스 · 유튜브 쇼츠 · 틱톡 영상을 기획하는 10년차 광고 크리에이티브 디렉터입니다.
한국 소상공인 / 자영업자의 영상 콘텐츠를 기획합니다.
반드시 아래 JSON 스키마를 엄격히 준수해 응답하세요. JSON 이외의 텍스트, 설명, 마크다운 코드블록(\`\`\`)은 절대 포함하지 마세요.

[스키마]
{
  "meta": {
    "title": string,
    "platform": "${platform}",
    "duration_sec": ${duration},
    "aspect_ratio": "9:16",
    "mood": "${mood}",
    "language": "ko"
  },
  "brand": {
    "store_name": string,
    "category": string,
    "keywords": string[],
    "usp": string
  },
  "hooks": string[3],   // 3초 내 후킹 문구 3가지 제안
  "scenes": [           // 정확히 ${sceneCount}개의 씬
    {
      "order": number,
      "start_sec": number,
      "duration": number,     // 각 씬 ${perScene}초 내외
      "visual_cue": string,   // 촬영 지시 (예: "매장 외관 롱샷, 정면 45도")
      "overlay_text": string, // 화면에 얹는 자막
      "text_position": "top"|"center"|"bottom",
      "text_size": "sm"|"md"|"lg"|"xl",
      "transition": "cut"|"fade"|"slide"|"zoom",
      "effect": string        // 선택 (slow motion, time lapse, whip pan 등) 없으면 ""
    }
  ],
  "audio": {
    "bgm_mood": string,
    "bgm_tempo": "slow"|"medium"|"fast",
    "bgm_keyword_hint": string,  // 음원 검색 키워드 (예: "k-pop upbeat cafe vlog")
    "voiceover": string          // 나레이션 대본 (없으면 "")
  },
  "cta": {
    "text": string,
    "position": "end",
    "duration": number
  },
  "production_notes": string[], // 촬영·편집 팁 3~5개
  "hashtags": string[]          // 인스타/틱톡 해시태그 10개 내외
}

[요구사항]
- 첫 3초 후킹이 영상 생사를 결정합니다. hooks는 반드시 시선을 끌 수 있는 짧고 강한 문구 3개
- overlay_text는 짧고 임팩트 있게 (한국어, 15자 이내 권장)
- visual_cue는 촬영자가 바로 이해할 수 있도록 구체적으로
- hashtags는 한국어·영어 혼용, #없이 단어만
- mood 기반으로 톤 유지 (upbeat=경쾌, premium=고급, warm=따뜻, chic=시크)
- 소상공인 현실적 촬영 가능한 장면 위주 (스마트폰 1대로 찍을 수 있는 수준)`

    const userMsg = `매장명: ${storeName}
업종: ${category}
핵심 키워드: ${(keywords || []).filter(Boolean).join(', ') || '없음'}
차별점(USP): ${usp || '따뜻한 접객과 믿을 수 있는 퀄리티'}
분위기: ${mood}
영상 길이: ${duration}초
플랫폼: ${platform}
CTA 문구: ${cta}

위 정보로 ${platform} 영상 기획 JSON을 생성하세요.`

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    if (!apiRes.ok) {
      const txt = await apiRes.text()
      return NextResponse.json({ ok: false, error: 'Anthropic API 오류: ' + txt }, { status: 500 })
    }

    const data = await apiRes.json()
    const text = data?.content?.[0]?.text || ''

    // JSON 추출 (LLM이 실수로 markdown fence 넣었을 경우 대비)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: 'JSON 파싱 실패', raw: text }, { status: 500 })
    }

    let script
    try {
      script = JSON.parse(jsonMatch[0])
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'JSON 파싱 에러: ' + e.message, raw: text }, { status: 500 })
    }

    return NextResponse.json({ ok: true, script })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '알 수 없는 오류' }, { status: 500 })
  }
}
