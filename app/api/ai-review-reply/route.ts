import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── 언어 감지 (문자 비중 기반) ────────────────────────────────
function detectLang(text: string): string {
  const t = text.trim()
  const koChars = (t.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length
  const jaChars = (t.match(/[\u3040-\u30FF\u31F0-\u31FF]/g) || []).length
  const zhChars = (t.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length
  const arChars = (t.match(/[\u0600-\u06FF]/g) || []).length
  const enChars = (t.match(/[a-zA-Z]/g) || []).length
  const total   = t.replace(/\s/g, '').length || 1

  const scores: Record<string, number> = {
    ko: koChars / total,
    ja: jaChars / total,
    zh: zhChars / total,
    ar: arChars / total,
    en: enChars / total,
  }

  const dominant = Object.entries(scores)
    .filter(([, v]) => v > 0.08)
    .sort(([, a], [, b]) => b - a)[0]

  return dominant ? dominant[0] : 'ko'
}

// ── 언어별 설정 ───────────────────────────────────────────────
const LANG_CONFIG: Record<string, {
  rule: string
  forbidden: string
  userPrefix: string
}> = {
  ko: {
    rule:      '반드시 한국어로만 답변하세요. 영어·일본어 등 다른 언어는 단 한 글자도 사용하지 마세요.',
    forbidden: '영어·일본어·중국어 등 다른 언어 단 한 글자도 금지',
    userPrefix:'다음 리뷰에 한국어로만 답변하세요:',
  },
  en: {
    rule:      'YOU MUST WRITE YOUR ENTIRE RESPONSE IN ENGLISH ONLY. Do NOT use Korean, Japanese, or any other language — not even one word.',
    forbidden: 'ABSOLUTELY NO Korean (한국어), Japanese, Chinese, or any non-English text. Every word must be English.',
    userPrefix:'Reply to this review in ENGLISH ONLY. No Korean. No other language:',
  },
  ja: {
    rule:      '必ず日本語のみで返答してください。韓国語・英語など他の言語は一文字も使わないでください。',
    forbidden: '韓国語・英語など他の言語は絶対禁止。日本語のみ。',
    userPrefix:'以下のレビューに日本語のみで返答してください:',
  },
  zh: {
    rule:      '请务必只用中文回复。不得使用韩语、英语或任何其他语言。',
    forbidden: '绝对禁止使用韩语、英语等其他语言。只用中文。',
    userPrefix:'请用中文回复以下评论:',
  },
  ar: {
    rule:      'يجب أن تكتب ردك باللغة العربية فقط. لا تستخدم أي لغة أخرى.',
    forbidden: 'ممنوع تماماً استخدام أي لغة غير العربية.',
    userPrefix:'يرجى الرد على هذا التعليق باللغة العربية فقط:',
  },
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
  aiSettings: {
    tone: string
    length: string
    includes: Record<string, boolean>
    closing: string
    excludes: string
  }
}): string {
  const { lang, platform, bizType, storeName, region, mainKeyword, subKeywords, storeDesc, aiSettings } = ctx
  const lc = LANG_CONFIG[lang] || LANG_CONFIG['ko']
  const isKo = lang === 'ko'

  // 톤
  const toneMap: Record<string, string> = {
    friendly: isKo ? '친근하고 따뜻한 어투 (사장님이 직접 쓴 듯한 진정성 있는)' : 'warm, friendly, and genuine — as if the owner wrote it personally',
    formal:   isKo ? '정중하고 격식 있는 예의 바른 어투' : 'polite and professional',
    expert:   isKo ? '전문적이고 신뢰감 있는 업종 전문가 어투' : 'expert and trustworthy professional tone',
  }

  // 길이 (더 길게 조정)
  const lengthMap: Record<string, string> = {
    short:  isKo ? '4~5문장 (120~180자)'   : '4-5 sentences (80-120 words)',
    medium: isKo ? '7~9문장 (220~360자)'   : '7-9 sentences (160-250 words)',
    long:   isKo ? '10~13문장 (360~520자)' : '10-13 sentences (260-380 words)',
  }

  const tone   = toneMap[aiSettings.tone]   || toneMap['friendly']
  const length = lengthMap[aiSettings.length] || lengthMap['medium']

  // SEO 핵심 키워드 배열 (지역+업종 조합 포함)
  const kwArr = [
    region && mainKeyword ? `${region} ${mainKeyword}` : '',
    region && bizType     ? `${region} ${bizType}`     : '',
    mainKeyword,
    ...subKeywords.split(',').map(k => k.trim()).filter(Boolean),
  ].filter(Boolean)

  const lines: string[] = []

  // ① 언어 규칙 — 최우선
  lines.push(`━━━ LANGUAGE RULE (HIGHEST PRIORITY) ━━━`)
  lines.push(lc.rule)
  lines.push(`FORBIDDEN: ${lc.forbidden}`)
  lines.push(``)

  // ② 역할 정의
  lines.push(`You are a professional marketing expert writing ${platform} review replies on behalf of "${storeName || '이 매장'}" owner.`)
  lines.push(``)

  // ③ 매장 정보
  lines.push(`[매장 정보 / Store Information]`)
  if (storeName)    lines.push(`• 매장명: ${storeName}`)
  if (region)       lines.push(`• 지역: ${region}`)
  if (bizType)      lines.push(`• 업종: ${bizType}`)
  if (storeDesc)    lines.push(`• 매장 특징: ${storeDesc}`)
  if (kwArr.length) lines.push(`• SEO 핵심 키워드: ${kwArr.join(' / ')}`)
  lines.push(``)

  // ④ 답변 기준
  lines.push(`[답변 기준]`)
  lines.push(`• 언어: ${lc.rule}`)
  lines.push(`• 톤: ${tone}`)
  lines.push(`• 길이: ${length}`)
  lines.push(``)

  // ⑤ SEO 최적화 (핵심)
  lines.push(`[SEO 최적화 — 필수]`)
  if (kwArr.length) {
    lines.push(`• 아래 키워드를 답변 내에 자연스럽게 2~3회 녹여 넣으세요: ${kwArr.slice(0, 4).join(', ')}`)
  }
  lines.push(`• 매장명 또는 지역+업종을 첫 문단 또는 마지막 문단에 반드시 1회 이상 언급`)
  lines.push(`• 리뷰에서 언급된 메뉴명·서비스명을 구체적으로 호응 (복붙 티 절대 금지)`)
  lines.push(`• 검색엔진이 긍정 신호로 인식하는 자연어 형태로 키워드 삽입`)
  lines.push(``)

  // ⑥ 포함 요소
  lines.push(`[필수 포함 요소]`)
  if (aiSettings.includes['thanks'])      lines.push(`• 방문·리뷰에 대한 진심 어린 감사`)
  if (aiSettings.includes['revisit'])     lines.push(`• 자연스러운 재방문 유도`)
  if (aiSettings.includes['mention'])     lines.push(`• 고객이 언급한 메뉴·서비스·경험에 직접 공감`)
  if (aiSettings.includes['personalize']) lines.push(`• 닉네임 확인 시 "OO님" 으로 시작`)
  if (aiSettings.includes['improve'])     lines.push(`• 부정 언급 시 진정성 있는 사과 + 개선 의지`)
  if (aiSettings.includes['keyword'])     lines.push(`• 매장 핵심 키워드를 문맥에 맞게 자연 삽입`)
  lines.push(`• 따뜻하고 인간적인 감성이 전체에 배어 있어야 함`)
  lines.push(``)

  // ⑦ 절대 금지
  lines.push(`[절대 금지]`)
  lines.push(`• ${lc.forbidden}`)
  lines.push(`• 번역투·기계적 표현`)
  lines.push(`• 동일 표현 반복`)
  lines.push(`• 이모지 2개 초과`)
  if (aiSettings.excludes) lines.push(`• 사용 금지 표현: ${aiSettings.excludes}`)
  lines.push(``)

  // ⑧ 고정 마무리
  if (aiSettings.closing) {
    lines.push(`[고정 마무리 문구]`)
    lines.push(`마지막 문장: "${aiSettings.closing}"`)
    lines.push(``)
  }

  lines.push(`리뷰 원문을 꼼꼼히 읽고, 고객 경험에 직접 공감하는 맞춤형 답변을 작성하세요.`)

  return lines.join('\n')
}

// ── POST 핸들러 ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      review = '',
      platform = '리뷰 플랫폼',
      bizType = '',
      storeName = '',
      region = '',
      mainKeyword = '',
      subKeywords = '',
      storeDesc = '',
      aiSettings = {
        tone: 'friendly',
        length: 'medium',
        includes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: true },
        closing: '',
        excludes: '',
      },
    } = body

    if (!review.trim()) {
      return NextResponse.json({ error: '리뷰 내용이 없습니다' }, { status: 400 })
    }

    const lang = detectLang(review)
    const lc   = LANG_CONFIG[lang] || LANG_CONFIG['ko']

    const systemPrompt = buildSystemPrompt({
      lang, platform, bizType, storeName, region, mainKeyword, subKeywords, storeDesc, aiSettings,
    })

    // 유저 메시지에도 언어 명시
    const userMessage = `${lc.userPrefix}\n\n"${review}"`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // 목업 (언어별 분기)
      const reg  = region || ''
      const kw   = mainKeyword || bizType || ''
      const name = storeName || '저희 매장'

      const mocks: Record<string, string> = {
        ko: `${name}을 찾아주셔서 진심으로 감사드립니다 😊 고객님이 남겨주신 리뷰를 꼼꼼히 읽었습니다. ${reg && kw ? `${reg} ${kw}` : kw}로서 고객님의 만족이 저희에게 가장 큰 보람입니다. 앞으로도 더욱 신선한 재료와 정성 가득한 서비스로 보답하겠습니다. 다음 방문 때도 최고의 경험을 드릴 수 있도록 최선을 다하겠습니다. ${aiSettings.closing || '꼭 다시 찾아주세요!'}`,
        en: `Thank you so much for visiting ${name} and taking the time to share your wonderful experience! 😊 Your kind words truly mean a lot to our entire team. As a proud ${kw || bizType || 'local business'} in ${reg || 'our area'}, we pour our heart into every detail — from the quality of our ingredients to the warmth of our service. We're so glad you noticed! We look forward to welcoming you back and making your next visit even more special. ${aiSettings.closing || 'See you soon!'}`,
        ja: `${name}にご来店いただき、またこのような素敵なレビューをお書きいただき誠にありがとうございます 😊 お客様の温かいお言葉が私どもの大きな励みとなっております。${reg ? reg + 'の' : ''}${kw || bizType || ''}として、いつも心を込めたサービスをご提供できるよう努力しております。またのご来店を心よりお待ちしております。${aiSettings.closing || 'またぜひお越しください！'}`,
        zh: `非常感谢您光临${name}并留下如此珍贵的评价 😊 您的反馈对我们团队来说是最大的鼓励。作为${reg || '本地'}${kw || bizType || ''}的代表，我们每天都在努力为每一位顾客提供最优质的体验。期待您再次光临，我们会继续努力，让每一次用餐都成为美好的回忆。${aiSettings.closing || '期待再次见到您！'}`,
      }

      return NextResponse.json({ reply: mocks[lang] || mocks['ko'], lang, mock: true })
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
        max_tokens: 1000,
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

    return NextResponse.json({ reply, lang })
  } catch (err) {
    console.error('ai-review-reply error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
