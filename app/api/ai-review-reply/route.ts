import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── 언어 감지 ─────────────────────────────────────────────
function detectLang(text: string): string {
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'ko'
  if (/[\u3040-\u30FF\u31F0-\u31FF]/.test(text)) return 'ja'
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) return 'zh'
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  if (/[a-zA-Z]{3,}/.test(text)) return 'en'
  return 'ko'
}

const LANG_INSTRUCTIONS: Record<string, string> = {
  ko: '한국어로 답변하세요. 자연스럽고 진정성 있는 한국어 구어체를 사용하세요.',
  en: 'Respond in English. Use natural, warm, conversational English.',
  ja: '日本語で返答してください。自然で親しみやすい日本語を使ってください。',
  zh: '请用中文回复。使用自然、友好的中文。',
  ar: 'الرجاء الرد باللغة العربية. استخدم أسلوباً طبيعياً وودوداً.',
}

// ── 시스템 프롬프트 빌더 ─────────────────────────────────
function buildSystemPrompt(ctx: {
  lang: string
  platform: string
  bizType: string
  storeName: string
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
  const { lang, platform, bizType, storeName, mainKeyword, subKeywords, storeDesc, aiSettings } = ctx

  const toneMap: Record<string, string> = {
    friendly: '친근하고 따뜻한 어투로, 마치 사장님이 직접 쓴 듯한 진정성 있는',
    formal:   '정중하고 예의 바른 어투로, 격식 있고 전문적인',
    expert:   '전문적이고 신뢰감 있는 어투로, 업종 전문가처럼 느껴지는',
  }
  const lengthMap: Record<string, string> = {
    short:  '3~4문장 (80~120자)',
    medium: '5~7문장 (150~250자)',
    long:   '8~10문장 (280~400자)',
  }
  const tone   = toneMap[aiSettings.tone]   || toneMap['friendly']
  const length = lengthMap[aiSettings.length] || lengthMap['medium']
  const langInst = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS['ko']

  const kw = [mainKeyword, ...subKeywords.split(',').map(k => k.trim())].filter(Boolean)

  const lines: string[] = []

  lines.push(`당신은 ${storeName || '우리 매장'}의 사장님을 대신해 ${platform} 리뷰에 답변하는 전문 마케터입니다.`)
  lines.push(``)
  lines.push(`[매장 정보]`)
  lines.push(`- 업종: ${bizType || '소상공인 매장'}`)
  lines.push(`- 매장명: ${storeName || ''}`)
  if (storeDesc) lines.push(`- 매장 특징: ${storeDesc}`)
  if (kw.length) lines.push(`- 핵심 키워드: ${kw.join(', ')}`)
  lines.push(``)
  lines.push(`[답변 지침]`)
  lines.push(`- 언어: ${langInst}`)
  lines.push(`- 톤: ${tone} 문체`)
  lines.push(`- 길이: ${length} 분량으로 작성`)
  lines.push(``)
  lines.push(`[SEO 최적화 규칙]`)
  lines.push(`- 핵심 키워드(${kw.slice(0,3).join(', ') || mainKeyword || '매장명'})를 답변 내에 자연스럽게 2~3회 포함`)
  lines.push(`- 매장명 또는 업종명을 첫 단락 또는 마지막 단락에 한 번 언급`)
  lines.push(`- 검색엔진이 긍정적으로 인식하는 자연어 형태로 삽입 (억지스럽지 않게)`)
  lines.push(``)
  lines.push(`[필수 포함 요소]`)
  if (aiSettings.includes['thanks'])     lines.push(`- 방문·이용에 대한 진심 어린 감사 인사`)
  if (aiSettings.includes['revisit'])    lines.push(`- 자연스러운 재방문 유도 문구`)
  if (aiSettings.includes['mention'])    lines.push(`- 고객이 리뷰에서 언급한 메뉴·서비스·경험을 구체적으로 호응`)
  if (aiSettings.includes['personalize']) lines.push(`- 고객 닉네임이 있으면 "OO님," 으로 시작`)
  if (aiSettings.includes['improve'])    lines.push(`- 부정적 언급이 있다면 진정성 있는 사과와 개선 의지 표현`)
  if (aiSettings.includes['keyword'])    lines.push(`- 매장 핵심 키워드를 문맥에 맞게 자연 삽입`)
  lines.push(`- 답변 전체가 따뜻하고 인간적인 감성이 느껴져야 함`)
  lines.push(`- 리뷰 내용을 읽었음을 티 내는 맞춤형 답변 (복붙티 금지)`)
  lines.push(``)
  lines.push(`[절대 금지]`)
  lines.push(`- 번역투·기계적 표현 금지`)
  lines.push(`- 동일 표현 반복 금지`)
  lines.push(`- 과도한 이모지 (1~2개 이하)`)
  if (aiSettings.excludes) lines.push(`- 사용 금지 표현: ${aiSettings.excludes}`)
  lines.push(`- 사실과 다른 내용 기술 금지`)
  if (aiSettings.closing) {
    lines.push(``)
    lines.push(`[고정 마무리]`)
    lines.push(`답변 마지막 문장: "${aiSettings.closing}"`)
  }
  lines.push(``)
  lines.push(`리뷰 원문을 꼼꼼히 읽고, 고객이 경험한 내용에 직접 공감하는 맞춤형 답변을 작성하세요.`)

  return lines.join('\n')
}

// ── API 핸들러 ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      review = '',
      platform = '리뷰 플랫폼',
      bizType = '',
      storeName = '',
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
    const systemPrompt = buildSystemPrompt({
      lang, platform, bizType, storeName, mainKeyword, subKeywords, storeDesc, aiSettings,
    })

    const userMessage = lang === 'ko'
      ? `다음 고객 리뷰에 답변해주세요:\n\n"${review}"`
      : `Please write a reply to this customer review:\n\n"${review}"`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // API 키 없을 때 목업 응답
      const mockKo = `${storeName ? storeName + '을 방문해 주셔서' : '저희 매장을 찾아주셔서'} 진심으로 감사드립니다 😊 고객님께서 남겨주신 소중한 리뷰를 꼼꼼히 읽었습니다. ${mainKeyword || bizType ? `저희 ${mainKeyword || bizType}에 만족하셨다니 정말 기쁩니다.` : ''} 앞으로도 고객님께 더욱 특별한 경험을 드릴 수 있도록 끊임없이 노력하겠습니다. 매번 정성껏 준비하는 저희의 마음이 고객님께 잘 전달되었으면 합니다. 다음에 방문하실 때는 더욱 만족스러운 시간이 되실 수 있도록 최선을 다하겠습니다. ${aiSettings.closing || '다음에도 꼭 찾아주세요!'}`
      const mockEn = `Thank you so much for visiting ${storeName || 'our store'} and for sharing your experience! 😊 We truly appreciate you taking the time to write such a thoughtful review. It means so much to us to know that you had a great experience with our ${mainKeyword || bizType || 'service'}. We strive every day to provide the best possible experience for each and every customer. Your feedback motivates our entire team to keep doing what we love. We hope to see you again very soon! ${aiSettings.closing || ''}`
      return NextResponse.json({ reply: lang === 'ko' ? mockKo : mockEn, lang, mock: true })
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
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'AI 서버 오류' }, { status: 500 })
    }

    const data = await resp.json()
    const reply = data.content?.[0]?.text?.trim() || '답변 생성 실패'

    return NextResponse.json({ reply, lang })
  } catch (err) {
    console.error('ai-review-reply error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
