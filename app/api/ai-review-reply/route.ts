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

// 전문업체(expert)/심플(simple) 톤에서 이모지·마크다운 제거
function stripArtifacts(text: string, dropEmoji: boolean): string {
  let out = text
  out = out.split('**').join('')
  out = out.split('__').join('')
  out = out.split('##').join('')
  if (dropEmoji) {
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
    out = cleaned
  }
  while (out.indexOf('  ') !== -1) out = out.split('  ').join(' ')
  return out.trim()
}

// 6종 톤 정의
function toneDescription(tone: string): string {
  const map: Record<string, string> = {
    friendly: '친근하고 따뜻한 사장님 어투. 구어체("~거든요", "~잖아요", "~더라고요")를 자연스럽게 섞고, 사장님이 단골한테 말하듯 작성. 이모지는 전체에서 최대 1개.',
    expert:   '정중하고 담백한 전문업체 서면 톤. 이모티콘·과장 표현·마크다운 일절 금지. 느낌표는 최대 1회. 짧고 단정한 문장.',
    witty:    '밝고 위트 있는 톤. 살짝 장난스러운 농담을 한두 줄 섞되 무례하지 않게. 이모지는 전체에서 최대 1개.',
    simple:   '짧고 깔끔한 담백 톤. 4~5문장 이내로 군더더기 없이 정리. 이모지·마크다운 금지.',
    emo:      '잔잔하고 진심 담긴 편지 같은 감성 톤. 과장 없이 차분하고 따뜻하게. 이모지는 전체에서 최대 1개.',
    mz:       '요즘 20대가 쓰는 자연스러운 톤. 너무 과한 밈이나 은어는 피하고, "~같아요", "~네요" 같은 부드러운 어미로. 이모지는 최대 1개.',
    formal:   '정중하고 담백한 전문업체 서면 톤. 이모티콘 금지. 단정하게.',
  }
  return map[tone] || map.friendly
}

function genderLabel(g: string): string {
  if (g === 'male') return '남성 고객'
  if (g === 'female') return '여성 고객'
  return ''
}

function ageLabel(a: string): string {
  const map: Record<string, string> = {
    teen: '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', '60s': '60대 이상',
  }
  return map[a] || ''
}

function ageToneHint(a: string): string {
  const map: Record<string, string> = {
    teen: '10대 고객. 너무 어른스럽지 않게, 밝고 경쾌한 톤. 과한 존댓말은 피하고 부드럽게',
    '20s': '20대 고객. 자연스러운 구어체, 트렌디하되 과하지 않게',
    '30s': '30대 고객. 정중하면서도 친근한 균형 잡힌 톤',
    '40s': '40대 고객. 안정감 있고 따뜻한 톤. 너무 가볍지 않게',
    '50s': '50대 고객. 정중하고 따뜻한 톤. 예의를 갖춰서',
    '60s': '60대 이상 고객. 정중하고 차분한 톤. 존중하는 어투로, 어려운 단어는 피할 것',
  }
  return map[a] || ''
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
  customerProfile: { gender: string; age: string }
}): string {
  const { lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
          storeDesc, storeStrengths, ownerMindset, reviewType, rating, aiSettings, customerProfile } = ctx
  const lc = LANG_CONFIG[lang] || LANG_CONFIG['ko']
  const isExpert = aiSettings.tone === 'expert' || aiSettings.tone === 'formal' || aiSettings.tone === 'simple'

  const lengthMap: Record<string, string> = {
    short:  '4~5문장 (120~180자)',
    medium: '7~9문장 (220~360자)',
    long:   '10~13문장 (360~520자)',
  }
  const length = lengthMap[aiSettings.length] || lengthMap['medium']
  const toneText = toneDescription(aiSettings.tone)

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

  // 고객 프로필
  const g = genderLabel(customerProfile.gender)
  const a = ageLabel(customerProfile.age)
  if (g || a) {
    lines.push('[고객 프로필]')
    if (g) lines.push('- 성별: ' + g)
    if (a) lines.push('- 연령대: ' + a)
    const hint = ageToneHint(customerProfile.age)
    if (hint) lines.push('- 말투 가이드: ' + hint)
    lines.push('- 단, 답글 본문에 성별이나 나이를 직접 언급하지는 마세요. 말투에만 반영하세요.')
    lines.push('')
  }

  lines.push('[이 리뷰의 상황 및 답글 전략]')
  if (reviewType === 'empty' || reviewType === 'photo_only') {
    lines.push('- 고객은 텍스트 없이 ' + (rating > 0 ? '별점 ' + rating + '점' : '사진만') + ' 남겼습니다.')
    lines.push('- 방문 감사와 매장 강점을 자연스럽게 녹여 작성하세요.')
  } else if (reviewType === 'negative') {
    lines.push('- 별점 ' + rating + '점의 부정 리뷰입니다.')
    lines.push('- 변명 금지. 진심 어린 사과가 먼저입니다.')
    lines.push('- 불만을 구체적으로 인정하고 개선 의지를 전달하세요.')
  } else if (reviewType === 'positive') {
    lines.push('- 별점 ' + rating + '점의 긍정 리뷰입니다.')
    lines.push('- 리뷰에서 언급된 구체적 내용에 직접 반응하세요.')
  } else {
    lines.push('- 별점 ' + rating + '점 리뷰입니다. 균형 잡힌 답변을 작성하세요.')
  }
  lines.push('')

  lines.push('[답변 기준]')
  lines.push('- 톤: ' + toneText)
  lines.push('- 길이: ' + length)
  lines.push('')

  if (kwArr.length) {
    lines.push('[SEO 최적화]')
    lines.push('- 아래 키워드를 자연스럽게 2~3회 녹여 넣으세요: ' + kwArr.slice(0, 4).join(', '))
    lines.push('- 매장명 또는 지역+업종을 첫 문단이나 마지막 문단에 1회 이상 언급')
    lines.push('')
  }

  // 공통 AI 말투 금지
  lines.push('[AI 말투 금지 · 모든 톤 공통]')
  lines.push('- 다음 과장 형용사 금지: 혁신적인, 경이로운, 단연코, 필수적, 주목할 만한, 완벽한, 최고의, 압도적, 궁극의')
  lines.push('- 영혼 없는 마무리 금지: 결론적으로, 요약하자면, 마지막으로, 이처럼, 이상으로, 정리하자면')
  lines.push('- 번역투 금지: "~에 있어서", "~하는 것은 중요합니다", "~을 제공합니다", "당신은"')
  lines.push('- 딱딱한 다나까 반복 금지. 구어체 어미를 자연스럽게 섞을 것')
  lines.push('- 뻔한 도입부 금지: "안녕하세요. 오늘은 ..."')
  lines.push('- 마크다운 서식 금지: 별표 두 개, 별표 하나, 밑줄 두 개, 우물정 두 개, 백틱 모두 금지. 평문으로만')
  lines.push('- 키워드 기계적 볼드 금지')
  lines.push('- 규칙적 이모지 패턴 금지. 문장마다 이모지를 박지 말 것')
  lines.push('')

  if (isExpert) {
    lines.push('[전문업체/심플 톤 · 추가 규칙]')
    lines.push('- 이모티콘 절대 금지. 단 한 개도 쓰지 마세요')
    lines.push('- 느낌표는 전체 답글에서 최대 1회')
    lines.push('- 마크다운 절대 금지. 평문으로만')
    lines.push('- 짧고 단정한 문장. 정중한 서면 톤')
    lines.push('')
  }

  lines.push('[절대 금지]')
  lines.push('- ' + lc.forbidden)
  lines.push('- 동일 표현 반복')
  lines.push('- 마크다운 볼드/이탤릭')
  if (aiSettings.excludes) lines.push('- 사용 금지 표현: ' + aiSettings.excludes)
  lines.push('')

  if (aiSettings.closing) {
    lines.push('[고정 마무리]')
    lines.push('마지막 문장은 반드시: "' + aiSettings.closing + '"')
    lines.push('')
  }

  lines.push('리뷰 상황에 맞게 매장 강점과 사장 마인드를 담아 작성하세요. 마크다운 없이 평문으로만 출력하세요.')
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
      customerProfile = { gender: 'none', age: '' },
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
    const isExpert = aiSettings.tone === 'expert' || aiSettings.tone === 'formal' || aiSettings.tone === 'simple'

    const systemPrompt = buildSystemPrompt({
      lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
      storeDesc, storeStrengths, ownerMindset, reviewType, rating, aiSettings,
      customerProfile,
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
      const name = storeName || '저희 매장'
      const reg  = region || ''
      const tone = aiSettings.tone

      const mocks: Record<string, Record<string, string>> = {
        friendly: {
          empty: '방문해 주셔서 감사해요. 별점 남겨 주신 것만으로도 힘이 나더라고요. ' + (reg ? reg + ' ' : '') + name + ' 운영하면서 하나하나 신경 쓰고 있거든요. 다음에 오시면 더 좋은 시간 드릴게요.',
          negative: '불편하셨던 부분 정말 죄송해요. 말씀해 주신 내용 꼼꼼히 보고 바로잡을게요. 다시 한 번 기회 주시면 더 나아진 모습으로 맞이할게요.',
          positive: '이렇게 따뜻하게 써 주셔서 정말 감사해요. 말씀하신 부분 읽으면서 저희도 기분 좋아졌거든요. 다음에도 같은 정성으로 준비해 둘게요.',
          neutral: '리뷰 남겨 주셔서 감사해요. 부족했던 부분 더 다듬어서 다음엔 더 좋은 경험 드릴게요.',
        },
        expert: {
          empty: '방문해 주셔서 감사합니다. ' + (reg ? reg + ' ' : '') + name + '은 매장 운영에 최선을 다하고 있습니다. 다음 방문 시에도 만족스러운 경험을 드릴 수 있도록 준비하겠습니다.',
          negative: '불편을 드려 죄송합니다. 남겨 주신 의견을 진지하게 받아들이고 개선에 반영하겠습니다. 다시 방문해 주시면 더 나은 모습으로 맞이하겠습니다.',
          positive: '소중한 리뷰 감사드립니다. 언급해 주신 부분은 저희가 지속적으로 신경 쓰는 영역입니다. 앞으로도 일관된 품질로 준비하겠습니다.',
          neutral: '리뷰 남겨 주셔서 감사합니다. 말씀하신 부분은 내부적으로 검토하여 개선하겠습니다.',
        },
        witty: {
          empty: '별점 감사합니다. 저희가 준비한 정성이 조금이라도 전해졌다면 그걸로 충분하거든요. 다음에 오시면 메뉴판 숨겨둔 비밀 하나 살짝 알려드릴게요.',
          negative: '이번엔 저희가 많이 부족했네요. 솔직하게 말씀해 주신 게 제일 감사해요. 다음엔 꼭 달라진 모습으로 만나뵐게요.',
          positive: '리뷰 읽으면서 주방에서 다 같이 웃었거든요. 다음에 오시면 살짝 더 신경 써서 준비해 둘게요. 또 뵙고 싶어요.',
          neutral: '리뷰 감사해요. 아쉬운 부분 하나씩 다듬어 나가는 중이거든요. 다음엔 더 마음에 드시면 좋겠어요.',
        },
        simple: {
          empty: '방문과 별점 감사합니다. 다음에도 좋은 시간 드릴 수 있도록 준비하겠습니다.',
          negative: '불편을 드려 죄송합니다. 말씀해 주신 부분 개선하겠습니다. 다시 찾아주시면 감사하겠습니다.',
          positive: '좋은 리뷰 감사합니다. 다음에도 같은 정성으로 준비하겠습니다.',
          neutral: '리뷰 감사합니다. 부족한 부분 다듬어 나가겠습니다.',
        },
        emo: {
          empty: '저희 가게 찾아 주셔서 고마워요. 말 없이 남기신 별 하나하나가 저희에겐 오래 기억되거든요. 다음 걸음도 따뜻하게 맞이할게요.',
          negative: '마음 불편하게 해드려 정말 죄송해요. 꾸며내지 않고 말씀해 주셔서 오히려 감사한 마음이에요. 다시 기회 주시면 꼭 달라진 모습으로 뵐게요.',
          positive: '이렇게 정성스러운 리뷰, 오래 간직할게요. 글 하나하나 읽으면서 저희도 괜히 뭉클해졌거든요. 다음 걸음도 기다릴게요.',
          neutral: '리뷰 남겨 주셔서 고마워요. 부족했던 부분, 조용히 하나씩 채워 나갈게요.',
        },
        mz: {
          empty: '방문해 주셔서 감사해요. 별점 남겨 주신 것만으로도 진짜 힘 나거든요. 다음에 오시면 더 신경 써서 준비해 둘게요.',
          negative: '이번엔 저희가 많이 부족했네요. 솔직한 후기 정말 감사해요. 말씀해 주신 부분 바로 손볼게요. 다음엔 꼭 더 나은 모습으로 뵙고 싶어요.',
          positive: '리뷰 읽다가 혼자 괜히 미소 지었어요. 이런 말 해주셔서 진짜 감사해요. 다음에도 같은 느낌 드릴 수 있게 준비해 둘게요.',
          neutral: '리뷰 감사해요. 아쉬운 부분 하나씩 다듬어 보고 있어요. 다음엔 더 좋아진 모습으로 뵐게요.',
        },
      }
      mocks.formal = mocks.expert

      const set = mocks[tone] || mocks.friendly
      const typeKey = reviewType === 'photo_only' ? 'empty' : reviewType
      let reply = set[typeKey] || set['positive']
      if (isExpert) reply = stripArtifacts(reply, true)
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
    if (isExpert) reply = stripArtifacts(reply, true)

    return NextResponse.json({ reply, lang, reviewType })
  } catch (err) {
    console.error('ai-review-reply error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
