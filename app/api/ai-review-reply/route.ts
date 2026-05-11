// app/api/ai-review-reply/route.ts
// ============================================================
// 30차-19 · AI 답글 생성 (커뮤니케이션 전문가 + 네이버 플레이스 SEO 상위노출)
//
// POST /api/ai-review-reply
//
// 입력 (신규):
// { review_id?: string, // platform_reviews.id → DB 에서 content/photos/rating 로드
// review?: string, // 직접 입력한 리뷰 텍스트 (review_id 미지정 시)
// review_text?: string, // 레거시 호환 (= review)
// photos?: string[], // 리뷰 사진 URL 배열 (Claude Vision 에 전달)
// rating?: number,
// platform?: string, // 'naver_place' 기본
// tone?: string, // 레거시 호환 (= aiSettings.tone)
// store_name?: string, // 레거시 호환
// aiSettings?: { tone, length, closing, excludes, includes }
// customerProfile?: { gender, age }
// }
//
// 자동 로드 (로그인 사용자):
// · stores 테이블: name / category / address / main_keyword / sub_keywords / description
// · platform_reviews 테이블: review_id 로 content / photos / rating 조회
//
// 응답:
// { ok: true, reply, lang, reviewType, mode: 'vision' | 'text' }
//
// 프롬프트 전략:
// · 커뮤니케이션 전문가 + 네이버 플레이스 SEO 상위노출 담당 페르소나
// · 지역+업종/지역+메인키워드/메인키워드/보조키워드 자동 조합
// · 사진이 있으면 Claude Vision 으로 "사진 속 메뉴·분위기·플레이팅" 추론 반영
// · 첫 문단에 "지역+업종" 또는 매장명, 마지막 문단에 "재방문 유도 + 위치·서비스" 자연 노출
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90  // 50s timeout per model × 최대 2 모델 fallback

// ── 언어 감지 ────────────────────────────────────────────
function detectLang(text: string): string {
 const t = (text || '').trim()
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
 rule: '반드시 한국어로만 답변하세요. 영어·일본어 등 다른 언어는 단 한 글자도 사용하지 마세요.',
 forbidden: '영어·일본어·중국어 등 다른 언어 단 한 글자도 금지',
 userPrefix:'다음 리뷰에 한국어로만 답변하세요:',
 },
 en: {
 rule: 'YOU MUST WRITE YOUR ENTIRE RESPONSE IN ENGLISH ONLY.',
 forbidden: 'ABSOLUTELY NO Korean, Japanese, Chinese, or any non-English text.',
 userPrefix:'Reply to this review in ENGLISH ONLY:',
 },
 ja: {
 rule: '必ず日本語のみで返答してください。',
 forbidden: '韓国語・英語など他の言語は絶対禁止。日本語のみ。',
 userPrefix:'以下のレビューに日本語のみで返答してください:',
 },
 zh: {
 rule: '请务必只用中文回复。',
 forbidden: '绝对禁止使用韩语、英语等其他语言。只用中文。',
 userPrefix:'请用中文回复以下评论:',
 },
 ar: {
 rule: 'يجب أن تكتب ردك باللغة العربية فقط.',
 forbidden: 'ممنوع تماماً استخدام أي لغة غير العربية.',
 userPrefix:'يرجى الرد على هذا التعليق باللغة العربية فقط:',
 },
}

function classifyReview(text: string, rating: number | null): 'positive' | 'negative' | 'neutral' | 'empty' | 'photo_only' {
 const t = (text || '').trim()
 const r = typeof rating === 'number' ? rating : 0
 if (!t) return r > 0 ? 'empty' : 'photo_only'
 if (t.length < 5) return 'photo_only'
 if (r && r <= 2) return 'negative'
 if (r && r >= 4) return 'positive'
 if (!r && t.length > 10) return 'positive' // 키워드 리뷰(별점 null) + 본문 있으면 긍정 취급
 return 'neutral'
}

// ── 아티팩트 제거 ────────────────────────────────────────
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
 while (out.indexOf(' ') !== -1) out = out.split(' ').join(' ')
 return out.trim()
}

// ── 톤 정의 ──────────────────────────────────────────────
function toneDescription(tone: string, customPrompt?: string): string {
 const map: Record<string, string> = {
 friendly: '친근하고 따뜻한 사장님 어투. 구어체("~거든요", "~잖아요", "~더라고요")를 자연스럽게 섞고, 사장님이 단골한테 말하듯 작성. 이모지는 전체에서 최대 1개.',
 expert: '정중하고 담백한 전문업체 서면 톤. 이모티콘·과장 표현·마크다운 일절 금지. 느낌표는 최대 1회. 짧고 단정한 문장.',
 witty: '밝고 위트 있는 톤. 살짝 장난스러운 농담을 한두 줄 섞되 무례하지 않게. 이모지는 전체에서 최대 1개.',
 simple: '짧고 깔끔한 담백 톤. 4~5문장 이내로 군더더기 없이 정리. 이모지·마크다운 금지.',
 emo: '잔잔하고 진심 담긴 편지 같은 감성 톤. 과장 없이 차분하고 따뜻하게. 이모지는 전체에서 최대 1개.',
 mz: '요즘 20대가 쓰는 자연스러운 톤. 너무 과한 밈이나 은어는 피하고, "~같아요", "~네요" 같은 부드러운 어미로. 이모지는 최대 1개.',
 formal: '정중하고 담백한 전문업체 서면 톤. 이모티콘 금지. 단정하게.',
 // v1.6y 추가
 apologetic: '진심 어린 사과 + 개선 다짐 톤. 부정 리뷰 (별점 1-2점) 응대용. "죄송합니다", "다시는 이런 일이 없도록", "개선하겠습니다" 같은 표현. 변명 금지, 책임 인정.',
 grateful: '감사 마음 깊이 표현. 호의적인 리뷰 (별점 4-5점) 응대용. "정말 감사드립니다", "큰 힘이 됩니다" 같은 따뜻한 표현. 손님이 다시 오고 싶게.',
 gourmand: '음식 / 맛에 대한 자부심 + 정성 강조. 식당 / 카페용. 메뉴, 식재료, 조리 과정 언급. "직접 손질한", "국내산", "당일 준비한" 같은 신선함 강조.',
 custom: customPrompt && customPrompt.trim().length > 5
 ? '사장님 맞춤 톤 (사장님이 직접 정의): ' + customPrompt.trim()
 : '친근하고 따뜻한 사장님 어투 (맞춤 프롬프트 비어있어 기본값으로 작성).',
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

// ── 지역 추출 (주소/매장명에서) ─────────────────────────
function extractRegionFromAddress(address: string | null, storeName: string | null): string {
 const a = (address || '').trim()
 // 주소에서 "○○시 ○○동" 혹은 "○○구" 단위로 추출
 const m1 = a.match(/([가-힣]+시)\s+([가-힣]+구)\s+([가-힣0-9]+동)/)
 if (m1) return `${m1[1]} ${m1[2]} ${m1[3]}`
 const m2 = a.match(/([가-힣]+시)\s+([가-힣0-9]+동)/)
 if (m2) return `${m2[1]} ${m2[2]}`
 const m3 = a.match(/([가-힣]+구)\s+([가-힣0-9]+동)/)
 if (m3) return `${m3[1]} ${m3[2]}`
 const m4 = a.match(/([가-힣]+시)/)
 if (m4) return m4[1]
 // 매장명에서 지역명 추출 fallback
 const n = (storeName || '').match(/^(\S+?)\s/)
 return n?.[1] || ''
}

// ── SEO 키워드 자동 조합 ─────────────────────────────────
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
 if (storeName) list.push(storeName)
 subKeywords
 .split(/[,，、]/)
 .map(s => s.trim())
 .filter(Boolean)
 .forEach(k => { if (!list.includes(k)) list.push(k) })
 // 중복 제거
 return Array.from(new Set(list.filter(Boolean)))
}

// ── System Prompt 빌더 ──────────────────────────────────
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
 hasPhotos: boolean
 aiSettings: {
 tone: string
 length: string
 includes: Record<string, boolean>
 closing: string
 excludes: string
 }
 customerProfile: { gender: string; age: string }
 customPrompt?: string // v1.6y: custom 톤 사장님 맞춤 프롬프트
}): string {
 const { lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
 storeDesc, storeStrengths, ownerMindset, reviewType, rating, hasPhotos, aiSettings, customerProfile, customPrompt } = ctx
 const lc = LANG_CONFIG[lang] || LANG_CONFIG['ko']
 const isExpert = aiSettings.tone === 'expert' || aiSettings.tone === 'formal' || aiSettings.tone === 'simple'

 const lengthMap: Record<string, string> = {
 short: '4~5문장 (120~180자)',
 medium: '7~9문장 (220~360자)',
 long: '10~13문장 (360~520자)',
 }
 const length = lengthMap[aiSettings.length] || lengthMap['medium']
 const toneText = toneDescription(aiSettings.tone, customPrompt)
 const kwList = buildSeoKeywords({ region, bizType, storeName, mainKeyword, subKeywords })

 const lines: string[] = []

 // ── 0) 역할 정의 (최상위) ──
 lines.push('=== 역할 ===')
 lines.push('당신은 10년차 베테랑 자영업자 답글 전문가이자 네이버 플레이스 SEO 상위노출 담당 컨설턴트입니다.')
 lines.push('단순한 "감사합니다"가 아니라, 리뷰 한 줄마다 지역·업종·서비스 키워드를 자연스럽게 녹여')
 lines.push('네이버 플레이스 검색 순위(상위노출)와 키워드 리뷰 시스템에 긍정 시그널을 남기는 답글을 씁니다.')
 lines.push('')

 // ── 1) 언어 규칙 ──
 lines.push('=== LANGUAGE RULE (HIGHEST PRIORITY) ===')
 lines.push(lc.rule)
 lines.push('FORBIDDEN: ' + lc.forbidden)
 lines.push('')

 // ── 2) 매장 컨텍스트 ──
 lines.push('[매장 컨텍스트]')
 if (storeName) lines.push('- 매장명: ' + storeName)
 if (region) lines.push('- 지역: ' + region)
 if (bizType) lines.push('- 업종: ' + bizType)
 if (storeDesc) lines.push('- 매장 소개: ' + storeDesc.slice(0, 400))
 if (storeStrengths) lines.push('- 매장 강점: ' + storeStrengths)
 if (ownerMindset) lines.push('- 사장 마인드/철학: ' + ownerMindset)
 if (kwList.length) lines.push('- SEO 핵심 키워드 풀: ' + kwList.slice(0, 6).join(' / '))
 lines.push('- 플랫폼: ' + platform)
 lines.push('')

 // ── 3) 고객 프로필 ──
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

 // ── 4) 상황별 답글 전략 ──
 lines.push('[이 리뷰의 상황 및 답글 전략]')
 if (reviewType === 'empty' || reviewType === 'photo_only') {
 if (hasPhotos) {
 lines.push('- 고객은 텍스트 없이 ' + (rating > 0 ? '별점 ' + rating + '점 + ' : '') + '사진을 남겼습니다.')
 lines.push('- 첨부된 사진을 분석해서 사진에 담긴 메뉴·분위기·플레이팅·인테리어를 구체적으로 읽어내고,')
 lines.push(' "사진에서 보이는 ○○" 식으로 자연스럽게 답글에 녹여내세요.')
 lines.push('- "별점 감사합니다" 같은 뻔한 문구는 금지. 사진에서 읽어낸 구체 요소를 먼저 언급하세요.')
 } else {
 lines.push('- 고객은 텍스트 없이 ' + (rating > 0 ? '별점 ' + rating + '점' : '사진만') + ' 남겼습니다.')
 lines.push('- 방문 감사 + 매장 강점 + 재방문 유도 3박자로 구성하세요.')
 }
 } else if (reviewType === 'negative') {
 lines.push('- 별점 ' + rating + '점의 부정 리뷰입니다.')
 lines.push('- 변명 금지. 진심 어린 사과가 먼저입니다.')
 lines.push('- 불만을 구체적으로 인정하고 개선 의지를 전달하세요.')
 lines.push('- SEO 키워드는 자제하고, 진정성에 집중.')
 } else if (reviewType === 'positive') {
 lines.push('- 긍정 리뷰입니다' + (rating ? ' (별점 ' + rating + '점)' : ' (키워드 리뷰)') + '.')
 lines.push('- 리뷰에서 언급된 구체적 키워드·메뉴·서비스에 직접 반응하세요.')
 if (hasPhotos) {
 lines.push('- 첨부 사진이 있으니 사진 속 메뉴/플레이팅/분위기를 구체적으로 읽고, 리뷰 글과 교차해서 반응하세요.')
 }
 lines.push('- 고객이 언급한 포인트를 다시 우리 매장 SEO 키워드와 자연스럽게 연결하세요.')
 } else {
 lines.push('- 중립 리뷰입니다. 과하지 않게, 균형 잡힌 답변을 작성하세요.')
 }
 lines.push('')

 // ── 5) 답변 기준 ──
 lines.push('[답변 기준]')
 lines.push('- 톤: ' + toneText)
 lines.push('- 길이: ' + length)
 lines.push('')

 // ── 6) SEO 상위노출 전략 (30차-21: 키워드 과다·미사여구 방지) ──
 if (kwList.length && reviewType !== 'negative') {
 lines.push('[네이버 플레이스 SEO 상위노출 전략 — 절제가 핵심]')
 lines.push('- 아래 키워드 풀에서 딱 1~2개만 골라서 답글 전체에 자연스럽게 녹이세요: ' + kwList.slice(0, 4).join(', '))
 lines.push('- "매장명" 또는 "지역+업종" 조합은 답글 전체에서 1회만 언급. 절대 반복하지 마세요.')
 lines.push('- 같은 키워드가 2번 이상 등장하면 안 됩니다. 검색 스팸처럼 보여 역효과.')
 lines.push('- 답글 길이는 실제 사장님이 쓰는 수준으로 짧고 간결하게. 4~6문장 이내 권장.')
 lines.push('- 인사말은 짧게 1줄. "안녕하세요, ○○입니다" 수준으로. 과한 환대 금지.')
 lines.push('- 미사여구 최소화: "정말 너무", "완전 진짜", "최고의" 같은 겹수식어 금지.')
 lines.push('- 키워드를 억지로 끼워 넣지 말 것. 문맥상 어색하면 차라리 빼세요.')
 lines.push('- 마지막 한 문장으로 재방문 유도 자연스럽게. (예: "또 뵐게요" "다음에도 편하게 들러주세요")')
 lines.push('')
 }

 // ── 7) 공통 AI 말투 금지 ──
 lines.push('[AI 말투 금지 · 모든 톤 공통]')
 lines.push('- 과장 형용사 금지: 혁신적인, 경이로운, 단연코, 필수적, 주목할 만한, 완벽한, 최고의, 압도적, 궁극의')
 lines.push('- 영혼 없는 마무리 금지: 결론적으로, 요약하자면, 마지막으로, 이처럼, 이상으로, 정리하자면')
 lines.push('- 번역투 금지: "~에 있어서", "~하는 것은 중요합니다", "~을 제공합니다", "당신은"')
 lines.push('- 딱딱한 다나까 반복 금지. 구어체 어미를 자연스럽게 섞을 것')
 lines.push('- 뻔한 도입부 금지: "안녕하세요. 오늘은 ..."')
 lines.push('- 마크다운 서식 금지: 별표 · 밑줄 · 우물정 · 백틱 모두 금지. 평문으로만')
 lines.push('- 키워드 기계적 볼드·나열 금지')
 lines.push('- 규칙적 이모지 패턴 금지. 문장마다 이모지를 박지 말 것')
 lines.push('')

 if (isExpert) {
 lines.push('[전문업체/심플 톤 · 추가 규칙]')
 lines.push('- 이모티콘 절대 금지. 단 한 개도 쓰지 마세요')
 lines.push('- 느낌표는 전체 답글에서 최대 1회')
 lines.push('- 짧고 단정한 문장. 정중한 서면 톤')
 lines.push('')
 }

 lines.push('[절대 금지]')
 lines.push('- ' + lc.forbidden)
 lines.push('- 동일 표현 반복')
 if (aiSettings.excludes) lines.push('- 사용 금지 표현: ' + aiSettings.excludes)
 lines.push('')

 if (aiSettings.closing) {
 lines.push('[고정 마무리]')
 lines.push('마지막 문장은 반드시: "' + aiSettings.closing + '"')
 lines.push('')
 }

 lines.push('마크다운 없이 평문으로만 출력하세요. 답글 본문만 출력하고, 서문·해설·제목은 쓰지 마세요.')
 return lines.join('\n')
}

// ── 사진 URL 필터 (https 만, 최대 N 개) ──
function sanitizePhotos(photos: unknown, limit: number = 4): string[] {
 if (!Array.isArray(photos)) return []
 return (photos as unknown[])
 .filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u))
 .slice(0, limit)
}

export async function POST(req: NextRequest) {
 try {
 // 인증 + 레이트 리밋 — 분당 10회/사용자 (비로그인은 IP)
 // 아래 매장/리뷰 자동 로드 단계에서 동일한 auth 결과를 재사용한다.
 const auth = await requireUser()
 const limitId = auth.ok ? auth.userId : `ip:${getClientIp(req)}`
 const rl = await rateLimit({ bucket: 'ai-review-reply', id: limitId, limit: 10, windowSec: 60 })
 if (!rl.ok) {
 return NextResponse.json(
 { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
 { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
 )
 }

 const body = await req.json().catch(() => ({}))

 // 1) 입력 정규화 (구·신 파라미터 동시 지원)
 const reviewId: string | null = body?.review_id ? String(body.review_id) : null
 let reviewText: string = String(body?.review ?? body?.review_text ?? '').trim()
 let rating: number = Number(body?.rating ?? 0)
 let photos: string[] = sanitizePhotos(body?.photos)
 const platform: string = String(body?.platform ?? 'naver_place')
 const aiSettingsIn = body?.aiSettings ?? {}
 const tone: string = String(body?.tone ?? aiSettingsIn?.tone ?? 'friendly')
 const aiSettings = {
 tone,
 length: String(aiSettingsIn?.length ?? 'medium'),
 closing: String(aiSettingsIn?.closing ?? ''),
 excludes: String(aiSettingsIn?.excludes ?? ''),
 includes: aiSettingsIn?.includes ?? {
 thanks: true, revisit: true, mention: true, personalize: false,
 improve: true, keyword: true, strengths: true, mindset: false,
 },
 }
 const customerProfile = {
 gender: String(body?.customerProfile?.gender ?? 'none'),
 age: String(body?.customerProfile?.age ?? ''),
 }
 // v1.6y: 사장님 맞춤 프롬프트 (custom 톤일 때만 의미 있음)
 const customPrompt: string = String(body?.customPrompt ?? '').trim().slice(0, 500)

 // 2) 로그인 사용자의 매장/리뷰 자동 로드 (auth 는 위에서 재사용)
 let storeName: string = String(body?.storeName ?? body?.store_name ?? '')
 let region: string = String(body?.region ?? '')
 let bizType: string = String(body?.bizType ?? body?.biz_type ?? '')
 let mainKeyword: string = String(body?.mainKeyword ?? body?.main_keyword ?? '')
 let subKeywords: string = String(body?.subKeywords ?? body?.sub_keywords ?? '')
 let storeDesc: string = String(body?.storeDesc ?? body?.store_desc ?? '')
 let storeStrengths: string = String(body?.storeStrengths ?? body?.store_strengths ?? '')
 let ownerMindset: string = String(body?.ownerMindset ?? body?.owner_mindset ?? '')
 let addressForRegion = ''

 if (auth.ok) {
 const svc = createServiceClient()

 // 2-a) stores 자동 로드
 try {
 const fullSel = 'name, category, address, main_keyword, sub_keywords, description'
 const liteSel = 'name, category, address, main_keyword, sub_keywords'
 let { data, error } = await svc
 .from('stores')
 .select(fullSel)
 .eq('user_id', auth.userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 if (error && /description/i.test(error.message || '')) {
 const retry = await svc
 .from('stores')
 .select(liteSel)
 .eq('user_id', auth.userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 data = retry.data as any
 error = retry.error
 }
 if (!error && Array.isArray(data) && data.length > 0) {
 const s: any = data[0]
 if (!storeName && s.name) storeName = String(s.name)
 if (!bizType && s.category) bizType = String(s.category)
 if (!mainKeyword && s.main_keyword) mainKeyword = String(s.main_keyword)
 if (!subKeywords && s.sub_keywords) subKeywords = String(Array.isArray(s.sub_keywords) ? s.sub_keywords.join(',') : s.sub_keywords)
 if (!storeDesc && s.description) storeDesc = String(s.description)
 if (s.address) addressForRegion = String(s.address)
 }
 } catch (_) { /* graceful degrade */ }

 // 2-b) review_id 자동 로드
 if (reviewId) {
 try {
 const { data } = await svc
 .from('platform_reviews')
 .select('content, rating, photos, platform')
 .eq('id', reviewId)
 .eq('user_id', auth.userId)
 .maybeSingle()
 if (data) {
 if (!reviewText) reviewText = String(data.content ?? '').trim()
 if (!rating && typeof data.rating === 'number') rating = Number(data.rating)
 if (photos.length === 0 && Array.isArray(data.photos)) {
 photos = sanitizePhotos(data.photos)
 }
 }
 } catch (_) { /* graceful degrade */ }
 }
 }

 if (!region) {
 region = extractRegionFromAddress(addressForRegion, storeName)
 }

 // 3) 분류 및 프롬프트 구성
 const reviewType = classifyReview(reviewText, rating || null)
 const lang = detectLang(reviewText)
 const lc = LANG_CONFIG[lang] || LANG_CONFIG['ko']
 const isExpert = tone === 'expert' || tone === 'formal' || tone === 'simple'
 const hasPhotos = photos.length > 0

 const systemPrompt = buildSystemPrompt({
 lang, platform, bizType, storeName, region, mainKeyword, subKeywords,
 storeDesc, storeStrengths, ownerMindset, reviewType,
 rating: typeof rating === 'number' ? rating : 0,
 hasPhotos,
 aiSettings,
 customerProfile,
 customPrompt,
 })

 // 4) 사용자 메시지 (텍스트 + 사진)
 let textPart: string
 if (reviewType === 'empty') {
 textPart = lc.userPrefix + '\n\n[이 고객은 텍스트 리뷰 없이 별점 ' + (rating || 0) + '점만 남겼습니다. 매장 정보와 강점을 활용해서 담백한 감사 답글을 작성해 주세요.]'
 } else if (reviewType === 'photo_only') {
 textPart = lc.userPrefix + '\n\n[이 고객은 사진만 올리고 텍스트를 남기지 않았습니다. 첨부된 사진을 분석해서 사진에서 읽히는 구체 요소(메뉴·플레이팅·분위기·인테리어)를 먼저 언급하고, 매장 강점을 자연스럽게 연결해 주세요.]'
 } else {
 textPart = lc.userPrefix + '\n\n"' + reviewText + '"'
 if (hasPhotos) {
 textPart += '\n\n[참고: 고객이 첨부한 사진이 함께 전달됩니다. 사진 속 메뉴·분위기·플레이팅을 리뷰 글과 교차해 구체적으로 언급해 주세요.]'
 }
 }

 const userContent: any[] = [{ type: 'text', text: textPart }]
 if (hasPhotos) {
 for (const url of photos) {
 userContent.push({ type: 'image', source: { type: 'url', url } })
 }
 }

 // 5) API 키 없으면 목업
 const apiKey = process.env.ANTHROPIC_API_KEY
 if (!apiKey) {
 const name = storeName || '저희 매장'
 const reg = region || ''
 const prefix = (reg ? reg + ' ' : '') + name
 const mocks: Record<string, string> = {
 positive: `${prefix} 찾아 주셔서 감사해요. 리뷰 읽으면서 저희도 기분 좋아졌거든요. 다음에도 같은 정성으로 준비해 둘게요.`,
 negative: `불편하셨던 부분 정말 죄송해요. 말씀해 주신 내용 꼼꼼히 보고 바로잡을게요. 다시 한 번 기회 주시면 더 나아진 모습으로 맞이할게요.`,
 neutral: `리뷰 남겨 주셔서 감사해요. 부족했던 부분 다듬어서 다음엔 더 좋은 경험 드릴게요.`,
 empty: `${prefix} 방문해 주셔서 감사해요. 다음에 오시면 더 좋은 시간 드릴게요.`,
 photo_only: `${prefix} 사진까지 남겨 주셔서 감사해요. 다음 방문 때도 같은 느낌 드리려고 준비해 둘게요.`,
 }
 const reply = mocks[reviewType] || mocks.positive
 return NextResponse.json({ ok: true, reply, lang, reviewType, mode: 'mock' })
 }

 // 6) 모델 후보 — 최신 우선 (동적 조회 제거: /v1/models 6초 + 모델 404 fallback 누적으로 timeout 발생)
 //    Haiku 4.5 가 가장 빠르고 답글 생성에 충분
 const MODEL_CANDIDATES = [
 'claude-haiku-4-5-20251001',
 'claude-3-5-haiku-20241022',
 'claude-3-haiku-20240307',
 ]

 // Claude API 호출 헬퍼
 const callClaude = async (
 m: string,
 content: typeof userContent,
 ): Promise<{ status: number; ok: boolean; text: string }> => {
 const r = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': apiKey,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: m, max_tokens: 600,  // 1200 → 600 (네이버 답글 평균 200~300자면 충분)
 system: systemPrompt,
 messages: [{ role: 'user', content }],
 }),
 signal: AbortSignal.timeout(40000),  // 30s → 40s (긴 답글도 안정적)
 })
 const text = await r.text()
 return { status: r.status, ok: r.ok, text }
 }

 // 모델 순차 시도 (404 = 해당 모델 미지원 → 다음 모델로)
 let usedModel = MODEL_CANDIDATES[0]
 let respStatus = 0
 let respText = ''
 let respOk = false

 for (const candidate of MODEL_CANDIDATES) {
 const result = await callClaude(candidate, userContent)
 usedModel = candidate
 respStatus = result.status
 respText = result.text
 respOk = result.ok
 if (result.status !== 404) break // 404 아니면 (성공이든 다른 오류든) 중단
 }

 if (!respOk) {
 console.error('[ai-review-reply] Claude error:', respStatus, respText.slice(0, 400))
 let claudeErrMsg = `HTTP ${respStatus}`
 try {
 const errJson = JSON.parse(respText)
 const msg = errJson?.error?.message || errJson?.message || ''
 if (msg) claudeErrMsg = `HTTP ${respStatus}: ${String(msg).slice(0, 100)}`
 } catch { /* ignore */ }
 // 사진 있을 때 → 텍스트만으로 재시도
 if (hasPhotos) {
 for (const candidate of MODEL_CANDIDATES) {
 const retry = await callClaude(candidate, [{ type: 'text', text: textPart }])
 if (retry.status === 404) continue
 if (retry.ok) {
 const d2 = JSON.parse(retry.text)
 let reply2 = d2.content?.[0]?.text?.trim() || '답변 생성 실패'
 if (isExpert) reply2 = stripArtifacts(reply2, true)
 return NextResponse.json({ ok: true, reply: reply2, lang, reviewType, mode: 'text-fallback', meta: { model: candidate } })
 }
 break
 }
 }
 return NextResponse.json({ ok: false, error: claudeErrMsg }, { status: 500 })
 }

 const data = JSON.parse(respText)
 let reply = data.content?.[0]?.text?.trim() || '답변 생성 실패'
 if (isExpert) reply = stripArtifacts(reply, true)

 return NextResponse.json({
 ok: true,
 reply,
 lang,
 reviewType,
 mode: hasPhotos ? 'vision' : 'text',
 meta: { model: usedModel, photos: photos.length, region, storeName, mainKeyword },
 })
 } catch (err: any) {
 console.error('[ai-review-reply] exception:', err?.message || err)
 return NextResponse.json({ ok: false, error: '서버 오류가 발생했습니다' }, { status: 500 })
 }
}
