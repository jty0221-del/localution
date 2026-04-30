// app/lib/generate-naver-reply.ts
// ============================================================
// 네이버 리뷰 AI 자동답글 생성 코어 — 크론/서버사이드 재사용용
//   · generateNaverReply(store, review, tone) → reply text
//   · loadStoreInfo(userId) → StoreInfo from DB
// ============================================================
import { createServiceClient } from '@/app/lib/adminAuth'

// ── 타입 ────────────────────────────────────────────────────

export interface StoreInfo {
  storeName: string
  bizType: string
  region: string
  mainKeyword: string
  subKeywords: string
  storeDesc: string
}

export interface ReviewInfo {
  content: string
  rating: number | null
  photos: string[]
}

export type GenerateResult =
  | { ok: true; reply: string; mode: 'vision' | 'text' | 'mock' }
  | { ok: false; error: string }

// ── 내부 유틸 ────────────────────────────────────────────────

function detectLang(text: string): string {
  const t = (text || '').trim()
  if (!t) return 'ko'
  let ko = 0, en = 0
  for (const ch of t) {
    const code = ch.charCodeAt(0)
    if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF)) ko++
    else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) en++
  }
  const total = Math.max(1, ko + en)
  return (ko / total) >= 0.1 ? 'ko' : 'en'
}

function classifyReview(
  text: string,
  rating: number | null,
): 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only' {
  const t = (text || '').trim()
  const r = typeof rating === 'number' ? rating : 0
  if (!t) return r > 0 ? 'empty' : 'photo_only'
  if (t.length < 5) return 'photo_only'
  if (r && r <= 2) return 'negative'
  if (r && r >= 4) return 'positive'
  if (!r && t.length > 10) return 'positive'
  return 'neutral'
}

function toneDescription(tone: string): string {
  const map: Record<string, string> = {
    friendly: '친근하고 따뜻한 사장님 어투. 구어체("~거든요", "~잖아요")를 자연스럽게 섞고, 단골한테 말하듯 작성.',
    expert:   '정중하고 담백한 전문업체 서면 톤. 이모티콘·과장 표현 금지. 짧고 단정한 문장.',
    witty:    '밝고 위트 있는 톤. 살짝 장난스러운 농담을 한두 줄 섞되 무례하지 않게.',
    simple:   '짧고 깔끔한 담백 톤. 4~5문장 이내로 군더더기 없이. 이모지·마크다운 금지.',
    emo:      '잔잔하고 진심 담긴 편지 같은 감성 톤. 과장 없이 차분하고 따뜻하게.',
    mz:       '요즘 20대가 쓰는 자연스러운 톤. "~같아요", "~네요" 같은 부드러운 어미로.',
    formal:   '정중하고 담백한 공식적 서면 톤. 이모티콘 금지. 예의 바르게.',
  }
  return map[tone] || map.friendly
}

function extractRegionFromAddress(address: string | null, storeName: string | null): string {
  const a = (address || '').trim()
  const m1 = a.match(/([가-힣]+시)\s+([가-힣]+구)\s+([가-힣0-9]+동)/)
  if (m1) return `${m1[1]} ${m1[2]} ${m1[3]}`
  const m2 = a.match(/([가-힣]+시)\s+([가-힣0-9]+동)/)
  if (m2) return `${m2[1]} ${m2[2]}`
  const m3 = a.match(/([가-힣]+구)\s+([가-힣0-9]+동)/)
  if (m3) return `${m3[1]} ${m3[2]}`
  const m4 = a.match(/([가-힣]+시)/)
  if (m4) return m4[1]
  const n = (storeName || '').match(/^(\S+?)\s/)
  return n?.[1] || ''
}

function buildSeoKeywords(opts: {
  region: string
  bizType: string
  storeName: string
  mainKeyword: string
  subKeywords: string
}): string[] {
  const { region, bizType, storeName, mainKeyword, subKeywords } = opts
  const list: string[] = []
  if (region && mainKeyword) list.push(`${region} ${mainKeyword}`)
  if (region && bizType && bizType !== mainKeyword) list.push(`${region} ${bizType}`)
  if (mainKeyword) list.push(mainKeyword)
  if (storeName)   list.push(storeName)
  subKeywords
    .split(/[,，、]/)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(k => { if (!list.includes(k)) list.push(k) })
  return Array.from(new Set(list.filter(Boolean)))
}

function buildPrompt(
  store: StoreInfo,
  review: ReviewInfo,
  tone: string,
): { system: string; userText: string; reviewType: string } {
  const reviewType = classifyReview(review.content, review.rating)
  const lang = detectLang(review.content)
  const hasPhotos = review.photos.length > 0
  const kwList = buildSeoKeywords({
    region: store.region,
    bizType: store.bizType,
    storeName: store.storeName,
    mainKeyword: store.mainKeyword,
    subKeywords: store.subKeywords,
  })
  const toneText = toneDescription(tone)
  const isExpert = tone === 'expert' || tone === 'formal' || tone === 'simple'
  const langRule = lang === 'ko'
    ? '반드시 한국어로만 답변하세요. 다른 언어는 단 한 글자도 사용하지 마세요.'
    : 'Reply in the same language as the review.'

  const lines: string[] = []
  lines.push('=== 역할 ===')
  lines.push('당신은 10년차 자영업자 답글 전문가이자 네이버 플레이스 SEO 상위노출 컨설턴트입니다.')
  lines.push('단순한 감사 인사가 아니라, 지역·업종·서비스 키워드를 자연스럽게 녹여 검색 순위에 긍정 시그널을 남기는 답글을 씁니다.')
  lines.push('')
  lines.push('=== 언어 규칙 (최우선) ===')
  lines.push(langRule)
  lines.push('')
  lines.push('[매장 컨텍스트]')
  if (store.storeName) lines.push('- 매장명: ' + store.storeName)
  if (store.region)    lines.push('- 지역: ' + store.region)
  if (store.bizType)   lines.push('- 업종: ' + store.bizType)
  if (store.storeDesc) lines.push('- 매장 소개: ' + store.storeDesc.slice(0, 200))
  if (kwList.length)   lines.push('- SEO 키워드: ' + kwList.slice(0, 4).join(' / '))
  lines.push('')
  lines.push('[답변 기준]')
  lines.push('- 톤: ' + toneText)
  lines.push('- 길이: 5~8문장 (180~300자)')
  lines.push('')

  if (kwList.length && reviewType !== 'negative') {
    lines.push('[SEO 전략]')
    lines.push('- 키워드 풀에서 1~2개만 골라 자연스럽게 녹이세요: ' + kwList.slice(0, 3).join(', '))
    lines.push('- 같은 키워드 반복 금지. 4~6문장 이내로 간결하게.')
    lines.push('- 마지막 한 문장에 재방문 유도 자연스럽게. (예: "또 뵐게요", "다음에도 편하게 들러주세요")')
    lines.push('')
  }

  if (reviewType === 'negative') {
    lines.push('[부정 리뷰 전략]')
    lines.push('- 진심 어린 사과가 먼저입니다. 변명 금지.')
    lines.push('- 불만을 구체적으로 인정하고 개선 의지를 전달하세요.')
    lines.push('- SEO 키워드 자제. 진정성에 집중.')
    lines.push('')
  }

  lines.push('[AI 말투 금지 · 공통]')
  lines.push('- 과장 형용사 금지: 혁신적인, 경이로운, 완벽한, 압도적, 궁극의')
  lines.push('- 마크다운 서식 금지: **, __, ##, 백틱 모두 금지. 평문으로만.')
  lines.push('- 뻔한 도입부 금지: "안녕하세요. 오늘은 ..."')
  lines.push('- 번역투 금지: "~에 있어서", "~하는 것은 중요합니다"')
  if (isExpert) lines.push('- 이모지 절대 금지. 느낌표는 최대 1회.')
  lines.push('')
  lines.push('마크다운 없이 평문으로만 출력. 답글 본문만 출력하고, 제목·해설·서문은 쓰지 마세요.')

  const system = lines.join('\n')

  let userText: string
  if (reviewType === 'empty' || reviewType === 'photo_only') {
    userText = hasPhotos
      ? '[고객이 사진을 남겼습니다. 사진 속 메뉴·분위기·플레이팅을 구체적으로 언급하고 방문 감사 답글을 작성하세요.]'
      : `[고객이 텍스트 없이 별점 ${review.rating ?? 0}점만 남겼습니다. 방문 감사 + 매장 강점 + 재방문 유도 3박자로 답글을 작성하세요.]`
  } else if (reviewType === 'negative') {
    userText = `다음 부정 리뷰에 진심 어린 사과와 개선 의지를 담은 답글을 작성하세요:\n\n"${review.content}"`
  } else {
    userText = `다음 리뷰에 답글을 작성하세요:\n\n"${review.content}"`
    if (hasPhotos) userText += '\n\n[고객이 첨부한 사진이 있습니다. 사진 속 요소를 자연스럽게 언급하세요.]'
  }

  return { system, userText, reviewType }
}

function stripMarkdown(text: string): string {
  return text
    .split('**').join('')
    .split('__').join('')
    .split('##').join('')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── 퍼블릭 API ───────────────────────────────────────────────

export async function loadStoreInfo(userId: string): Promise<StoreInfo> {
  const svc = createServiceClient()
  try {
    const { data } = await svc
      .from('stores')
      .select('name, category, address, main_keyword, sub_keywords, description')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return { storeName: '', bizType: '', region: '', mainKeyword: '', subKeywords: '', storeDesc: '' }

    const region = extractRegionFromAddress(data.address || '', data.name || '')
    const subKws = Array.isArray(data.sub_keywords)
      ? (data.sub_keywords as string[]).join(',')
      : String(data.sub_keywords || '')

    return {
      storeName:   String(data.name           || ''),
      bizType:     String(data.category       || ''),
      region,
      mainKeyword: String(data.main_keyword   || ''),
      subKeywords: subKws,
      storeDesc:   String(data.description    || ''),
    }
  } catch {
    return { storeName: '', bizType: '', region: '', mainKeyword: '', subKeywords: '', storeDesc: '' }
  }
}

export async function generateNaverReply(
  store: StoreInfo,
  review: ReviewInfo,
  tone: string = 'friendly',
): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const name = store.storeName || '저희 매장'
    const prefix = store.region ? `${store.region} ${name}` : name
    return {
      ok: true,
      reply: `${prefix} 찾아 주셔서 감사해요. 다음에도 편하게 들러주세요.`,
      mode: 'mock',
    }
  }

  const { system, userText, reviewType } = buildPrompt(store, review, tone)
  const hasPhotos = review.photos.length > 0
  const isExpert = tone === 'expert' || tone === 'formal' || tone === 'simple'
  const model = 'claude-3-5-haiku-20241022'

  const userContent: Array<{ type: string; text?: string; source?: { type: string; url: string } }> = [
    { type: 'text', text: userText },
  ]
  if (hasPhotos) {
    for (const url of review.photos.slice(0, 3)) {
      if (url.startsWith('https://')) {
        userContent.push({ type: 'image', source: { type: 'url', url } })
      }
    }
  }

  const callClaude = async (
    m: string,
    content: typeof userContent,
  ): Promise<{ ok: boolean; reply: string; error?: string }> => {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: m,
          max_tokens: 800,
          system,
          messages: [{ role: 'user', content }],
        }),
        signal: AbortSignal.timeout(25_000),
      })
      if (!resp.ok) return { ok: false, reply: '', error: `HTTP ${resp.status}` }
      const d = await resp.json()
      const text = (d.content?.[0]?.text || '').trim()
      return { ok: !!text, reply: text, error: text ? undefined : 'Empty response' }
    } catch (e: unknown) {
      return { ok: false, reply: '', error: e instanceof Error ? e.message : String(e) }
    }
  }

  // 1차 시도
  let result = await callClaude(model, userContent)

  // Vision 실패 시 텍스트로 재시도
  if (!result.ok && hasPhotos) {
    result = await callClaude('claude-3-5-haiku-20241022', [{ type: 'text', text: userText }])
    if (result.ok) {
      let reply = result.reply
      if (isExpert) reply = stripMarkdown(reply)
      return { ok: true, reply, mode: 'text' }
    }
  }

  if (!result.ok) return { ok: false, error: result.error || 'Claude API 오류' }

  let reply = result.reply
  if (isExpert) reply = stripMarkdown(reply)

  return { ok: true, reply, mode: hasPhotos ? 'vision' : 'text' }
}
