import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function detectLang(text: string): string {
  const t = text.trim()
  if (!t) return 'ko'
  let ko = 0, ja = 0, zh = 0, ar = 0, en = 0
  for (const ch of t) {
    const code = ch.charCodeAt(0)
    if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) ko++
    else if ((code >= 0x3040 && code <= 0x30FF) || (code >= 0x31F0 && code <= 0x31FF)) ja++
    else if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) zh++
    else if (code >= 0x0600 && code <= 0x06FF) ar++
    else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) en++
  }
  const total = Math.max(1, ko + ja + zh + ar + en)
  const scores: Record<string, number> = {
    ko: ko / total, ja: ja / total, zh: zh / total, ar: ar / total, en: en / total,
  }
  const dominant = Object.entries(scores).filter(([, v]) => v > 0.08).sort(([, a], [, b]) => b - a)[0]
  return dominant ? dominant[0] : 'ko'
}

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

function classifyReview(text: string, rating: number): 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only' {
  const t = text.trim()
  if (!t) return rating > 0 ? 'empty' : 'photo_only'
  if (t.length < 5) return 'photo_only'
  if (rating <= 2) return 'negative'
  if (rating >= 4) return 'positive'
  return 'neutral'
}

// 전문업체(expert) 톤일 때 출력에서 이모지·마크다운을 제거하는 후처리
function stripExpertArtifacts(text: string): string {
  let out = text
  // 굵은 글씨, 기울임 마크다운 제거
  out = out.split('**').join('')
  out = out.split('__').join('')
  out = out.split('##').join('')
  out = out.split('`').join('')
  // 이모지 대략 제거 (문자 코드 범위)
  let cleaned = ''
  for (const ch of out) {
    const code = ch.codePointAt(0) || 0
    const isEmoji =
      (code >= 0x1F300 && code <= 0x1FAFF) ||
      (code >= 0x2600 && code <= 0x27BF) ||
      (code >= 0x1F000 && code <= 0x1F2FF) ||
      code === 0xFE0F
    if (!isEmoji) cleaned += ch
  }
  // 연속 공백 정리
  while (cleaned.indexOf('  ') !== -1) cleaned = cleaned.split('  ').join(' ')
  return cleaned.trim()
}

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
  const isExpert = aiSettings.tone === 'expert' || aiSettings.tone === 'formal'

  const toneMap: Record<string, string> = {
    friendly: isKo ? '친근하고 따뜻한 어투. 사장님이 직접 단골손님한테 말하듯 구어체를 섞어 쓰는 느낌' : 'warm, friendly, and genuine',
    formal:   isKo ? '정중하고 담백한 전문업체 어투. 과장 표현과 이모티콘을 일절 쓰지 않음' : 'polite and professional, no emoji',
    expert:   isKo ? '전문업체가 쓰는 정중하고 담백한 어투. 이모티콘·과장 표현·마크다운 없이 짧고 단정한 문장으로 작성' : 'expert and trustworthy, no emoji, no markdown',
  }

  const lengthMap: Record<string, string> = {
    short:  isKo ? '4~5문장 (120~180자)'   : '4-5 sentences',
    medium: isKo ? '7~9문장 (220~360자)'   : '7-9 sentences',
    long:   isKo ? '10~13문장 (360~520자)' : '10-13 sentences',
  }

  const tone   = toneMap[aiSettings.tone]   || toneMap['friendly']
  const length = lengthMap[aiSettings.length] || lengthMap['medium']

  const kwArr = [
    region && mainKeyword ? region + ' ' + mainKeyword : '',
    region && bizType     ? region + ' ' + bizType     : '',
    mainKeyword,
    ...subKeywords.split(',').map(k => k.trim()).filter(Boolean),
  ].filter(Boolean)

  const lines: string[] = []

  lines.push('=== LANGUAGE RULE (HIGHEST PRIORITY) ===')
  lines.push(lc.rule)
  lines.push('FORBIDDEN: ' + lc.forbidden)
  lines.push('')

  lines.push('You are writing a ' + platform + ' review reply on behalf of the owner of "' + (storeName || '이 매장') + '".')
  lines.push('')

  lines.push('[매장 정보]')
  if (storeName)       lines.push('- 매장명: ' + storeName)
  if (region)          lines.push('- 지역: ' + region)
  if (bizType)         lines.push('- 업종: ' + bizType)
  if (storeDesc)       lines.push('- 매장 소개: ' + storeDesc)
  if (storeStrengths)  lines.push('- 매장 강점: ' + storeStrengths)
  if (ownerMindset)    lines.push('- 사장 마인드/철학: ' + ownerMindset)
  if (kwArr.length)    lines.push('- SEO 핵심 키워드: ' + kwArr.join(' / '))
  lines.push('')

  lines.push('[이 리뷰의 상황 및 답글 전략]')
  if (reviewType === 'empty' || reviewType === 'photo_only') {
    lines.push('- 고객은 텍스트 없이 ' + (rating > 0 ? '별점 ' + rating + '점' : '사진만') + ' 남겼습니다.')
    lines.push('- 방문에 대한 감사와 매장의 강점을 자연스럽게 녹여 작성하세요.')
    lines.push('- 다음 방문 시 기대할 수 있는 경험을 간단히 언급해 주세요.')
  } else if (reviewType === 'negative') {
    lines.push('- 별점 ' + rating + '점의 부정적 리뷰입니다.')
    lines.push('- 변명은 금지. 진심 어린 사과가 먼저입니다.')
    lines.push('- 불만을 구체적으로 인정하고 개선 의지를 전달하세요.')
    lines.push('- 마지막에 재방문 기회를 정중하게 요청하세요 (강요 금지).')
  } else if (reviewType === 'positive') {
    lines.push('- 별점 ' + rating + '점의 긍정 리뷰입니다.')
    lines.push('- 리뷰에서 언급된 구체적인 내용에 직접 반응하세요.')
    lines.push('- 매장 강점을 자연스럽게 녹여 브랜드 신뢰를 높이세요.')
  } else {
    lines.push('- 별점 ' + rating + '점 리뷰입니다. 균형 잡힌 답변을 작성하세요.')
  }
  lines.push('')

  lines.push('[답변 기준]')
  lines.push('- 톤: ' + tone)
  lines.push('- 길이: ' + length)
  lines.push('')

  if (kwArr.length) {
    lines.push('[SEO 최적화]')
    lines.push('- 아래 키워드를 자연스럽게 2~3회 녹여 넣으세요: ' + kwArr.slice(0, 4).join(', '))
    lines.push('- 매장명 또는 지역+업종을 첫 문단이나 마지막 문단에 1회 이상 언급')
    lines.push('- 억지로 박아 넣지 말고 문맥에 맞게 자연스럽게')
    lines.push('')
  }

  const includeItems: string[] = []
  if (aiSettings.includes['thanks'])      includeItems.push('방문과 리뷰에 대한 감사 (과장 없이)')
  if (aiSettings.includes['revisit'])     includeItems.push('자연스러운 재방문 유도')
  if (aiSettings.includes['mention'])     includeItems.push('고객이 언급한 메뉴·서비스·경험에 직접 공감')
  if (aiSettings.includes['personalize']) includeItems.push('닉네임 확인 시 "OO님"으로 시작')
  if (aiSettings.includes['improve'])     includeItems.push('부정 언급 시 진정성 있는 사과와 개선 의지')
  if (aiSettings.includes['keyword'])     includeItems.push('매장 핵심 키워드를 문맥에 맞게 자연 삽입')
  if (aiSettings.includes['strengths'])   includeItems.push('매장의 강점을 자연스럽게 어필')
  if (aiSettings.includes['mindset'])     includeItems.push('사장의 마인드가 답변 전체에 배어 있어야 함')

  if (includeItems.length) {
    lines.push('[필수 포함 요소]')
    includeItems.forEach(item => lines.push('- ' + item))
    lines.push('')
  }

  // ── 공통 · AI 말투 금지 규칙 (모든 톤 공통) ──
  lines.push('[AI 말투 금지 · 모든 답글 공통]')
  lines.push('- 다음 과장된 형용사·부사 사용 금지: 혁신적인, 경이로운, 단연코, 필수적, 주목할 만한, 완벽한, 최고의, 압도적, 궁극의')
  lines.push('- 영혼 없는 마무리 문구 금지: 결론적으로, 요약하자면, 마지막으로, 이처럼, 이상으로, 정리하자면')
  lines.push('- 번역투 금지: "~에 있어서", "~하는 것은 중요합니다", "~을 제공합니다", "당신은"')
  lines.push('- 딱딱한 다나까만 반복 금지. "~거든요", "~잖아요", "~더라고요", "~인 것 같아요" 같은 구어체를 섞어서 자연스럽게')
  lines.push('- 뻔한 도입 금지: "안녕하세요. 오늘은 ...에 대해 알아보겠습니다" 같은 블로그 AI 서두')
  lines.push('- 마크다운 서식 금지: 별 두 개, 별 하나, 밑줄 두 개, 우물정 두 개, 백틱 모두 절대 사용 금지. 일반 문장으로만')
  lines.push('- 키워드 기계적 볼드 금지. 모든 키워드에 강조를 걸지 말 것')
  lines.push('- 규칙적 이모지 패턴 금지. 문장 끝마다 이모지를 박지 말 것')
  lines.push('')

  if (isExpert) {
    lines.push('[전문업체 톤 · 추가 규칙]')
    lines.push('- 이모티콘, 이모지 절대 사용 금지. 단 한 개도 쓰지 마세요')
    lines.push('- 느낌표는 답글 전체에서 최대 1회까지만 사용')
    lines.push('- 마크다운(**, *, __, ##) 절대 금지. 일반 평문으로만 작성')
    lines.push('- 과한 감탄사나 "와~", "진짜", "완전" 같은 구어체 강조 금지')
    lines.push('- 문장은 짧고 단정하게. 정중한 전문가 서면 톤을 유지')
    lines.push('- 고정 마무리 문구 없으면 "감사합니다." 같은 담백한 한 문장으로 끝내도 됨')
    lines.push('')
  } else {
    lines.push('[따뜻한 사장님 톤 · 추가 규칙]')
    lines.push('- 이모지는 전체 답글에서 최대 1개까지만. 모든 문장 끝에 박지 말 것')
    lines.push('- 사장님이 직접 쓰듯 구어체 어미를 자연스럽게 섞어 쓰기')
    lines.push('')
  }

  lines.push('[절대 금지]')
  lines.push('- ' + lc.forbidden)
  lines.push('- 동일 표현 반복')
  lines.push('- 마크다운 볼드 및 이탤릭')
  if (aiSettings.excludes) lines.push('- 사용 금지 표현: ' + aiSettings.excludes)
  lines.push('')

  if (aiSettings.closing) {
    lines.push('[고정 마무리 문구]')
    lines.push('마지막 문장은 반드시: "' + aiSettings.closing + '"')
    lines.push('')
  }

  lines.push('리뷰 상황에 맞게 매장의 강점과 사장 마인드를 담아 작성하세요. 마크다운 없이 일반 평문만 출력하세요.')
  return lines.join('\n')
}

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

    const reviewText = (review || '').trim()
    const reviewType = classifyReview(reviewText, rating)
    const lang = detectLang(reviewText)
    const lc   = LANG_CONFIG[lang] || LANG_CONFIG['ko']
    const isExpert = aiSettings.tone === 'expert' || aiSettings.tone === 'formal'

    const systemPrompt = buildSystemPrompt({
      lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
      storeDesc, storeStrengths, ownerMindset, reviewType, rating, aiSettings,
    })

    let userMessage: string
    if (reviewType === 'empty') {
      userMessage = lc.userPrefix + '\n\n[이 고객은 텍스트 리뷰 없이 별점 ' + rating + '점만 남겼습니다. 매장 정보와 강점을 활용해서 담백한 감사 답글을 작성해 주세요.]'
    } else if (reviewType === 'photo_only') {
      userMessage = lc.userPrefix + '\n\n[이 고객은 사진만 올리고 텍스트를 남기지 않았습니다. 매장 강점과 사장 마인드를 담아 자연스러운 감사 답글을 작성해 주세요.]'
    } else {
      userMessage = lc.userPrefix + '\n\n"' + reviewText + '"'
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // 목업 응답
      const name = storeName || '저희 매장'
      const reg  = region || ''
      const mocksFriendly: Record<string, string> = {
        empty: '방문해 주셔서 감사해요. 별점 남겨 주신 것만으로도 힘이 되거든요. ' + (reg ? reg + '에서 ' : '') + name + ' 운영하면서 하나하나 신경 쓰고 있어요. 다음에 오실 때는 더 좋은 시간 드릴 수 있게 준비할게요.',
        negative: '불편하셨던 부분 정말 죄송해요. 말씀해 주신 내용 꼼꼼히 확인하고 바로잡겠습니다. 다시 한 번 기회를 주시면 더 나아진 모습으로 맞이하겠습니다.',
        positive: '이렇게 따뜻하게 써 주셔서 정말 감사해요. 말씀하신 부분 읽으면서 저희도 기분 좋아졌거든요. 다음에도 같은 정성으로 준비해 둘게요.',
        neutral: '리뷰 남겨 주셔서 감사합니다. 말씀해 주신 부분 참고해서 더 좋게 만들어 나갈게요. 다음에 또 뵙길 바랍니다.',
      }
      const mocksExpert: Record<string, string> = {
        empty: '방문해 주셔서 감사합니다. ' + (reg ? reg + ' ' : '') + name + '은 매장 운영에 최선을 다하고 있습니다. 다음 방문 시에도 만족스러운 경험을 드릴 수 있도록 준비하겠습니다.',
        negative: '불편을 드려 죄송합니다. 남겨 주신 의견을 진지하게 받아들이고 개선에 반영하겠습니다. 다시 방문해 주시면 더 나은 모습으로 맞이하겠습니다.',
        positive: '소중한 리뷰 감사드립니다. 언급해 주신 부분은 저희가 지속적으로 신경 쓰는 영역입니다. 앞으로도 일관된 품질로 준비하겠습니다.',
        neutral: '리뷰 남겨 주셔서 감사합니다. 말씀하신 부분은 내부적으로 검토하여 개선해 나가겠습니다.',
      }
      const set = isExpert ? mocksExpert : mocksFriendly
      const typeKey = reviewType === 'photo_only' ? 'empty' : reviewType
      let reply = set[typeKey] || set['positive']
      if (isExpert) reply = stripExpertArtifacts(reply)
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
    let reply = data.content?.[0]?.text?.trim() || '답변 생성 실패'
    if (isExpert) reply = stripExpertArtifacts(reply)

    return NextResponse.json({ reply, lang, reviewType })
  } catch (err) {
    console.error('ai-review-reply error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
