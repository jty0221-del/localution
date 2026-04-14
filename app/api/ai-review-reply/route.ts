import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── 언어 감지 (문자 비중 기반) ────────────────────────────────
function detectLang(text: string): string {
  const t = text.trim()
  if (!t) return 'ko'
  const koChars = (t.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length
  const jaChars = (t.match(/[\u3040-\u30FF\u31F0-\u31FF]/g) || []).length
  const zhChars = (t.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length
  const arChars = (t.match(/[\u0600-\u06FF]/g) || []).length
  const enChars = (t.match(/[a-zA-Z]/g) || []).length
  const total   = t.replace(/\s/g, '').length || 1
  const scores: Record<string, number> = {
    ko: koChars / total, ja: jaChars / total,
    zh: zhChars / total, ar: arChars / total, en: enChars / total,
  }
  const dominant = Object.entries(scores).filter(([, v]) => v > 0.08).sort(([, a], [, b]) => b - a)[0]
  return dominant ? dominant[0] : 'ko'
}

// ── 언어별 설정 ───────────────────────────────────────────────
const LANG_CONFIG: Record<string, { rule: string; forbidden: string; userPrefix: string }> = {
  ko: {
    rule:      '반드시 한국어로만 답변하세요. 영어·일본어 등 다른 언어는 단 한 글자도 사용하지 마세요.',
    forbidden: '영어·일본어·중국어 등 다른 언어 단 한 글자도 금지',
    userPrefix:'다음 리뷰에 한국어로만 답변하세요:',
  },
  en: {
    rule:      'YOU MUST WRITE YOUR ENTIRE RESPONSE IN ENGLISH ONLY.',
    forbidden: 'ABSOLUTELY NO Korean, Japanese, Chinese, or any non-English text.',
    userPrefix:'Reply to this review in ENGLISH ONLY:',
  },
  ja: {
    rule:      '必ず日本語のみで返答してください。',
    forbidden: '韓国語・英語など他の言語は絶対禁止。日本語のみ。',
    userPrefix:'以下のレビューに日本語のみで返答してください:',
  },
  zh: {
    rule:      '请务必只用中文回复。',
    forbidden: '绝对禁止使用韩语、英语等其他语言。只用中文。',
    userPrefix:'请用中文回复以下评论:',
  },
  ar: {
    rule:      'يجب أن تكتب ردك باللغة العربية فقط.',
    forbidden: 'ممنوع تماماً استخدام أي لغة غير العربية.',
    userPrefix:'يرجى الرد على هذا التعليق باللغة العربية فقط:',
  },
}

// ── 리뷰 타입 분류 ────────────────────────────────────────────
function classifyReview(text: string, rating: number): 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only' {
  const t = text.trim()
  if (!t) return rating > 0 ? 'empty' : 'photo_only'
  if (t.length < 5) return 'photo_only'
  if (rating <= 2) return 'negative'
  if (rating >= 4) return 'positive'
  return 'neutral'
}

// ── 시스템 프롬프트 빌더 ──────────────────────────────────────
function buildSystemPrompt(ctx: {
  lang: string
  platform: string
  bizType: string
  storeName: string
  region: string
  mainKeyword: string
  subKeywords: string
  storeDesc: string
  storeStrengths: string
  ownerMindset: string
  reviewType: 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only'
  rating: number
  aiSettings: {
    tone: string
    length: string
    includes: Record<string, boolean>
    closing: string
    excludes: string
  }
}): string {
  const { lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
          storeDesc, storeStrengths, ownerMindset, reviewType, rating, aiSettings } = ctx
  const lc = LANG_CONFIG[lang] || LANG_CONFIG['ko']
  const isKo = lang === 'ko'

  const toneMap: Record<string, string> = {
    friendly: isKo ? '친근하고 따뜻한 어투 (사장님이 직접 쓴 듯한 진정성 있는)' : 'warm, friendly, and genuine',
    formal:   isKo ? '정중하고 격식 있는 예의 바른 어투' : 'polite and professional',
    expert:   isKo ? '전문적이고 신뢰감 있는 업종 전문가 어투' : 'expert and trustworthy',
  }

  const lengthMap: Record<string, string> = {
    short:  isKo ? '4~5문장 (120~180자)'   : '4-5 sentences',
    medium: isKo ? '7~9문장 (220~360자)'   : '7-9 sentences',
    long:   isKo ? '10~13문장 (360~520자)' : '10-13 sentences',
  }

  const tone   = toneMap[aiSettings.tone]   || toneMap['friendly']
  const length = lengthMap[aiSettings.length] || lengthMap['medium']

  const kwArr = [
    region && mainKeyword ? `${region} ${mainKeyword}` : '',
    region && bizType     ? `${region} ${bizType}`     : '',
    mainKeyword,
    ...subKeywords.split(',').map(k => k.trim()).filter(Boolean),
  ].filter(Boolean)

  const lines: string[] = []

  // ① 언어 규칙
  lines.push(`━━━ LANGUAGE RULE (HIGHEST PRIORITY) ━━━`)
  lines.push(lc.rule)
  lines.push(`FORBIDDEN: ${lc.forbidden}`)
  lines.push(``)

  // ② 역할 정의
  lines.push(`You are a professional marketing expert writing ${platform} review replies on behalf of "${storeName || '이 매장'}" owner.`)
  lines.push(``)

  // ③ 매장 정보
  lines.push(`[매장 정보]`)
  if (storeName)       lines.push(`• 매장명: ${storeName}`)
  if (region)          lines.push(`• 지역: ${region}`)
  if (bizType)         lines.push(`• 업종: ${bizType}`)
  if (storeDesc)       lines.push(`• 매장 소개: ${storeDesc}`)
  if (storeStrengths)  lines.push(`• 매장 강점: ${storeStrengths}`)
  if (ownerMindset)    lines.push(`• 사장 마인드/철학: ${ownerMindset}`)
  if (kwArr.length)    lines.push(`• SEO 핵심 키워드: ${kwArr.join(' / ')}`)
  lines.push(``)

  // ④ 리뷰 상황별 특별 지침
  lines.push(`[이 리뷰의 상황 및 답글 전략]`)

  if (reviewType === 'empty' || reviewType === 'photo_only') {
    lines.push(`• 이 고객은 텍스트 리뷰 없이 ${rating > 0 ? `별점 ${rating}점` : '사진만'}을 남겼습니다.`)
    lines.push(`• 고객의 방문 자체에 감사하되, 매장의 강점·철학·업종 특성을 자연스럽게 어필하세요.`)
    lines.push(`• 매장 소개나 강점을 바탕으로 "이런 점이 마음에 드셨으면 좋겠다"는 뉘앙스로 작성하세요.`)
    lines.push(`• 다음 방문 시 기대할 수 있는 경험을 살짝 언급하여 재방문을 유도하세요.`)
  } else if (reviewType === 'negative') {
    lines.push(`• 이 고객은 별점 ${rating}점의 부정적인 리뷰를 남겼습니다.`)
    lines.push(`• 방어적이거나 변명하는 태도는 절대 금지. 진심 어린 사과가 먼저입니다.`)
    lines.push(`• 고객의 불만을 구체적으로 인정하고, 개선 의지를 명확히 전달하세요.`)
    lines.push(`• 사장의 마인드/철학을 바탕으로 "이런 기준을 지키려 했는데 부족했다"는 자세로 작성하세요.`)
    lines.push(`• 마지막에는 재방문 기회를 정중하게 요청하세요 (강요 금지).`)
  } else if (reviewType === 'positive') {
    lines.push(`• 이 고객은 별점 ${rating}점의 긍정적인 리뷰를 남겼습니다.`)
    lines.push(`• 리뷰에서 언급된 구체적인 내용에 직접 공감하고 반응하세요.`)
    lines.push(`• 매장 강점과 사장 마인드를 자연스럽게 녹여 브랜드 신뢰감을 높이세요.`)
  } else {
    lines.push(`• 이 고객은 별점 ${rating}점의 리뷰를 남겼습니다. 균형 잡힌 답변을 작성하세요.`)
    lines.push(`• 긍정적 언급에 감사하고, 아쉬운 점은 개선 의지를 보여주세요.`)
  }
  lines.push(``)

  // ⑤ 답변 기준
  lines.push(`[답변 기준]`)
  lines.push(`• 톤: ${tone}`)
  lines.push(`• 길이: ${length}`)
  lines.push(``)

  // ⑥ SEO 최적화
  if (kwArr.length) {
    lines.push(`[SEO 최적화]`)
    lines.push(`• 아래 키워드를 답변 내에 자연스럽게 2~3회 녹여 넣으세요: ${kwArr.slice(0, 4).join(', ')}`)
    lines.push(`• 매장명 또는 지역+업종을 첫 문단 또는 마지막 문단에 반드시 1회 이상 언급`)
    lines.push(`• 검색엔진이 긍정 신호로 인식하는 자연어 형태로 키워드 삽입`)
    lines.push(``)
  }

  // ⑦ 포함 요소
  const includeItems: string[] = []
  if (aiSettings.includes['thanks'])      includeItems.push('방문·리뷰에 대한 진심 어린 감사')
  if (aiSettings.includes['revisit'])     includeItems.push('자연스러운 재방문 유도')
  if (aiSettings.includes['mention'])     includeItems.push('고객이 언급한 메뉴·서비스·경험에 직접 공감 (빈 리뷰면 매장 대표 메뉴·서비스 언급)')
  if (aiSettings.includes['personalize']) includeItems.push('닉네임 확인 시 "OO님" 으로 시작')
  if (aiSettings.includes['improve'])     includeItems.push('부정 언급 시 진정성 있는 사과 + 개선 의지')
  if (aiSettings.includes['keyword'])     includeItems.push('매장 핵심 키워드를 문맥에 맞게 자연 삽입')
  if (aiSettings.includes['strengths'])   includeItems.push('매장의 강점·차별점을 자연스럽게 어필')
  if (aiSettings.includes['mindset'])     includeItems.push('사장의 마인드·철학이 답변 전체에 배어 있어야 함')

  if (includeItems.length) {
    lines.push(`[필수 포함 요소]`)
    includeItems.forEach(item => lines.push(`• ${item}`))
    lines.push(`• 따뜻하고 인간적인 감성이 전체에 배어 있어야 함`)
    lines.push(``)
  }

  // ⑧ 절대 금지
  lines.push(`[절대 금지]`)
  lines.push(`• ${lc.forbidden}`)
  lines.push(`• 번역투·기계적 표현`)
  lines.push(`• 동일 표현 반복`)
  lines.push(`• 이모지 2개 초과`)
  if (aiSettings.excludes) lines.push(`• 사용 금지 표현: ${aiSettings.excludes}`)
  lines.push(``)

  // ⑨ 고정 마무리
  if (aiSettings.closing) {
    lines.push(`[고정 마무리 문구]`)
    lines.push(`마지막 문장은 반드시: "${aiSettings.closing}"`)
    lines.push(``)
  }

  lines.push(`리뷰 상황에 맞게 매장의 강점·사장 마인드를 담아 고객 맞춤형 답변을 작성하세요.`)
  return lines.join('\n')
}

// ── POST 핸들러 ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      review = '',
      rating = 0,
      platform = '리뷰 플랫폼',
      bizType = '',
      storeName = '',
      region = '',
      mainKeyword = '',
      subKeywords = '',
      storeDesc = '',
      storeStrengths = '',
      ownerMindset = '',
      aiSettings = {
        tone: 'friendly',
        length: 'medium',
        includes: { thanks: true, revisit: true, mention: true, personalize: false,
                    improve: true, keyword: true, strengths: true, mindset: false },
        closing: '',
        excludes: '',
      },
    } = body

    // 텍스트 없어도 OK — 별점만 있어도 생성 가능
    const reviewText = (review || '').trim()
    const reviewType = classifyReview(reviewText, rating)
    const lang = detectLang(reviewText)
    const lc   = LANG_CONFIG[lang] || LANG_CONFIG['ko']

    const systemPrompt = buildSystemPrompt({
      lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
      storeDesc, storeStrengths, ownerMindset, reviewType, rating, aiSettings,
    })

    // 유저 메시지 — 빈 리뷰 처리
    let userMessage: string
    if (reviewType === 'empty') {
      userMessage = `${lc.userPrefix}\n\n[이 고객은 텍스트 리뷰 없이 별점 ${rating}점만 남겼습니다. 매장 정보와 강점을 활용해서 따뜻한 감사 답글을 작성해 주세요.]`
    } else if (reviewType === 'photo_only') {
      userMessage = `${lc.userPrefix}\n\n[이 고객은 사진만 올리고 텍스트를 남기지 않았습니다. 매장 강점과 사장 마인드를 담아 자연스러운 감사 답글을 작성해 주세요.]`
    } else {
      userMessage = `${lc.userPrefix}\n\n"${reviewText}"`
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // 목업 응답 (리뷰 타입별)
      const name = storeName || '저희 매장'
      const kw   = mainKeyword || bizType || ''
      const reg  = region || ''

      const mocks: Record<string, Record<string, string>> = {
        empty: {
          ko: `방문해 주셔서 진심으로 감사드립니다 😊 별점을 남겨주신 것만으로도 큰 힘이 됩니다. ${reg && kw ? `${reg} ${kw}` : `${name}`}으로서 매번 최선을 다하고 있습니다. ${storeStrengths ? `저희의 자랑은 ${storeStrengths}입니다. ` : ''}${ownerMindset ? `${ownerMindset} ` : ''}다음에 방문하실 때는 더욱 만족스러운 경험을 드릴 수 있도록 준비하겠습니다. ${aiSettings.closing || '또 찾아주세요!'}`,
          en: `Thank you so much for visiting ${name} and leaving a rating! 😊 Your support means everything to us. As a ${kw || 'local business'} in ${reg || 'our area'}, we strive to deliver the best experience every time. ${aiSettings.closing || 'We hope to see you again soon!'}`,
        },
        negative: {
          ko: `불편하셨던 점 진심으로 사과드립니다. 고객님의 소중한 피드백을 마음 깊이 새기겠습니다. ${ownerMindset ? `저희는 ${ownerMindset} 마음으로 운영하고 있는데, 이번에 기대에 미치지 못해 정말 죄송합니다. ` : ''}지적해 주신 부분을 개선하여 다음 방문 시에는 더 나은 경험을 드릴 수 있도록 최선을 다하겠습니다. ${aiSettings.closing || '기회를 주신다면 정말 감사하겠습니다.'}`,
          en: `We sincerely apologize for your unsatisfactory experience. Your feedback is invaluable to us. We are committed to improving and would love the opportunity to make it right. ${aiSettings.closing || 'We hope to see you again.'}`,
        },
        positive: {
          ko: `이렇게 따뜻한 리뷰를 남겨주셔서 진심으로 감사드립니다 😊 ${reg && kw ? `${reg} ${kw}` : name}에서 좋은 시간 보내셨다니 정말 기쁩니다. ${storeStrengths ? `${storeStrengths}로 항상 최선을 다하고 있습니다. ` : ''}${ownerMindset ? `${ownerMindset} ` : ''}앞으로도 같은 정성으로 모시겠습니다. ${aiSettings.closing || '또 찾아주세요!'}`,
          en: `Thank you so much for your wonderful review! 😊 We're thrilled you had a great experience at ${name}. ${aiSettings.closing || 'We look forward to seeing you again!'}`,
        },
        neutral: {
          ko: `리뷰 감사드립니다 😊 더 좋은 경험을 드리기 위해 항상 노력하겠습니다. ${storeStrengths ? `저희의 강점인 ${storeStrengths}을 더욱 살릴 수 있도록 하겠습니다. ` : ''}${aiSettings.closing || '다음에 또 방문해 주세요!'}`,
          en: `Thank you for your feedback! We always strive to improve. ${aiSettings.closing || 'Hope to see you again!'}`,
        },
      }

      const typeKey = reviewType === 'photo_only' ? 'empty' : reviewType
      const mockSet = mocks[typeKey] || mocks['positive']
      const reply = mockSet[lang] || mockSet['ko']

      return NextResponse.json({ reply, lang, reviewType, mock: true })
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'AI 서버 오류' }, { status: 500 })
    }

    const data  = await resp.json()
    const reply = data.content?.[0]?.text?.trim() || '답변 생성 실패'

    return NextResponse.json({ reply, lang, reviewType })
  } catch (err) {
    console.error('ai-review-reply error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
