import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 50  // Vision + 짧은 출력 (이미지 1장 + 350토큰 = 15~30초 목표)

// 한글 fuzzy 매칭 — OCR 오타 보정 (편집거리 + 부분 포함)
function levenshtein(a: string, b: string): number {
 const m = a.length, n = b.length
 if (m === 0) return n
 if (n === 0) return m
 const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
 for (let i = 0; i <= m; i++) dp[i][0] = i
 for (let j = 0; j <= n; j++) dp[0][j] = j
 for (let i = 1; i <= m; i++) {
 for (let j = 1; j <= n; j++) {
 const cost = a[i - 1] === b[j - 1] ? 0 : 1
 dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
 }
 }
 return dp[m][n]
}

function fuzzyMatchMenu(rawItem: string, menuList: string[]): string {
 if (!rawItem || menuList.length === 0) return rawItem
 const item = rawItem.replace(/\s+/g, '').toLowerCase()
 if (item.length < 2) return rawItem

 // 1) 정확히 포함되는 메뉴 (우선)
 for (const m of menuList) {
 const norm = m.replace(/\s+/g, '').toLowerCase()
 if (norm === item) return m
 }
 // 2) 부분 포함 (메뉴가 OCR 결과를 포함하거나, 그 반대)
 for (const m of menuList) {
 const norm = m.replace(/\s+/g, '').toLowerCase()
 if (norm.includes(item) || item.includes(norm)) return m
 }
 // 3) 편집거리 ≤ max(2, length/3) 이내면 매칭
 let bestMatch = rawItem
 let bestDist = Infinity
 const threshold = Math.max(2, Math.floor(item.length / 3))
 for (const m of menuList) {
 const norm = m.replace(/\s+/g, '').toLowerCase()
 const d = levenshtein(item, norm)
 if (d <= threshold && d < bestDist) {
 bestDist = d
 bestMatch = m
 }
 }
 return bestMatch
}

const TONE_PROMPTS: Record<string, string> = {
 z: 'Z세대 감성으로 작성하세요. "ㅋㅋ", "레전드", "대박", "진짜" 등 Z세대 어휘를 자연스럽게 사용하세요. 가볍고 트렌디한 말투.',
 mom: '맘카페 후기 스타일로 작성하세요. "~해요", "~더라고요", "~있어요" 등 따뜻하고 신뢰감 있는 말투. 가족/아이 언급 가능.',
 honest: '솔직담백하게 장단점을 명확히 씁니다. 과장 없이 있는 그대로. 간결하고 직접적.',
 gourmet: '음식 전문가 · 미식가 관점으로 씁니다. 식재료, 조리법, 플레이팅, 풍미 등 전문 용어 사용. 격조 있는 문어체.',
 friend: '친한 친구에게 카톡하듯 씁니다. 반말 가능. "야", "진짜", "거기" 등 친근한 표현.',
 insta: '인스타그램 감성 캡션처럼 씁니다. 이모지 1~2개 사용. 감각적이고 트렌디한 표현. 해시태그 분위기.',
}

export async function POST(req: NextRequest) {
 // Rate limit: IP당 분당 5회 (Vision/Haiku 유료 API 보호)
 const rl = rateLimitByIp(req, 'qr-review-generate', 5, 60)
 if (!rl.ok) {
 return NextResponse.json(
 { ok: false, error: 'rate_limited', message: `너무 많은 요청. ${rl.resetIn}초 후 다시 시도해주세요.` },
 { status: 429 }
 )
 }

 try {
 const body = await req.json()
 const { action = 'generate' } = body

 // ── OCR: 영수증 분석 ─────────────────────────────────────
 if (action === 'ocr') {
 const { receiptImage, expectedStoreName = '', storeMenu = [] } = body
 const apiKey = process.env.ANTHROPIC_API_KEY

 if (!apiKey || !receiptImage) {
 return NextResponse.json({ receiptInfo: { items: [], matched: false } })
 }

 const [header, base64] = receiptImage.split(',')
 const mediaType = header.includes('png') ? 'image/png' : 'image/jpeg'

 // 매장 등록 메뉴 텍스트 (AI 가 OCR 결과 보정 시 참조)
 const menuList: string[] = Array.isArray(storeMenu)
 ? storeMenu.map((m: any) => String(m?.name || '')).filter((s: string) => s.length > 0)
 : []
 const menuHint = menuList.length > 0
 ? '\n\n사장님이 등록한 매장 메뉴 목록 (이걸 보고 OCR 오타 보정):\n' + menuList.map(n => '- ' + n).join('\n') +
 '\n\n중요: 영수증 글자가 흐릿하거나 일부 안 보여도, 위 메뉴 목록과 비슷한 게 있으면 그 메뉴 이름으로 매칭. 예: OCR 이 "김치찟" 으로 읽혔는데 메뉴에 "김치찜" 이 있으면 "김치찜" 으로 정정.'
 : ''

 const resp = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': apiKey,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: 'claude-haiku-4-5-20251001',
 max_tokens: 400,
 system: '한국 영수증 OCR + 메뉴 매칭 전문가입니다. 한글 메뉴/매장명을 정확히 읽고, 등록된 매장 메뉴 목록이 주어지면 OCR 오타를 매장 메뉴 이름으로 정정합니다. JSON 만 반환하세요.',
 messages: [{
 role: 'user',
 content: [
 { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
 {
 type: 'text',
 text: [
 '이 영수증을 OCR 해 JSON 반환:',
 '{',
 '  "storeName": "영수증 매장명",',
 '  "items": ["주문 메뉴들 — 등록 메뉴와 매칭된 정확한 이름"],',
 '  "items_raw": ["OCR 원본 그대로 (보정 전)"],',
 '  "total": "총합계 금액",',
 '  "date": "방문일",',
 '  "matched": ' + JSON.stringify(expectedStoreName) + ' 와 매장명 일치하면 true,',
 '  "low_confidence": OCR 자체가 흐릿해서 신뢰도 낮으면 true',
 '}',
 menuHint,
 '',
 '규칙:',
 '1) items 는 등록 메뉴와 매칭된 정확한 이름으로. 매칭 안 되면 OCR 원본 사용.',
 '2) 메뉴를 추측해서 만들지 말 것 — OCR 에 없는 메뉴 절대 추가 X.',
 '3) 영수증이 너무 흐릿해서 메뉴 이름 못 읽으면 items 비워두고 low_confidence: true.',
 '4) JSON 외 텍스트 X.',
 ].filter(Boolean).join('\n'),
 },
 ],
 }],
 }),
 signal: AbortSignal.timeout(25000),
 })

 if (!resp.ok) return NextResponse.json({ receiptInfo: { items: [], matched: false } })

 const data = await resp.json()
 const text = data.content?.[0]?.text || '{}'
 const jsonMatch = text.match(/\{[\s\S]*\}/)
 try {
 const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

 // 서버측 fuzzy 매칭 — AI 가 매칭 못 했어도 등록 메뉴와 비슷하면 정정
 const rawItems: string[] = Array.isArray(parsed.items) ? parsed.items.map((s: any) => String(s).trim()).filter(Boolean) : []
 const correctedItems: string[] = rawItems.map((raw: string) => fuzzyMatchMenu(raw, menuList))

 return NextResponse.json({
 receiptInfo: {
 items: correctedItems,
 items_raw: rawItems,
 matched: false,
 low_confidence: !!parsed.low_confidence,
 ...parsed,
 items: correctedItems,  // 최종 보정된 items 가 우선
 },
 })
 } catch {
 return NextResponse.json({ receiptInfo: { items: [], matched: false, low_confidence: true } })
 }
 }

 // ── GENERATE: 리뷰 생성 ──────────────────────────────────
 const {
 images = [],
 storeName = '이 매장',
 storeType = '',
 mainKeyword = '',
 comment = '',
 tone = 'z',
 rating = 5,
 receiptItems = [],
 storeMenu = [],  // 사장님이 등록한 실제 메뉴 [{name, price, signature}]
 } = body

 const apiKey = process.env.ANTHROPIC_API_KEY

 if (!apiKey) {
 const kw = mainKeyword || storeType || storeName
 const item = receiptItems.length > 0 ? receiptItems.slice(0, 2).join(', ') : ''
 const good = rating >= 4
 const demos: Record<string, string> = {
 z: storeName + ' 다녀왔는데 ' + (good ? '진짜 레전드야ㅠㅠ ' : '나름 괜찮았어 ') + (comment || (item ? item + ' 먹었는데 맛있더라' : '분위기 음식 다 좋았어')) + (good ? ' 강추!!' : ' 한번 가봐.'),
 mom: storeName + '에 다녀왔어요~ ' + (comment || (item ? item + '가 정말 맛있더라고요' : '음식도 맛있고 서비스도 친절했어요')) + ' 재방문 의사 있어요!',
 honest: '[' + storeName + '] ' + (comment || (item ? '주문: ' + item : '전반 평가')) + ' | 맛: ' + (good ? '합격' : '보통') + ' | 재방문: ' + (good ? 'O' : '고려중'),
 gourmet: storeName + '을 방문했습니다. ' + (comment || (item ? item + '의 풍미가 인상적이었으며' : '전반적인 완성도가 높으며')) + ' 추천할 만한 곳입니다.',
 friend: '야 ' + storeName + ' 거기 진짜야. ' + (comment || (item ? item + ' 먹었는데 ㄹㅇ맛있어' : '한번 가봐 진짜')) + ' 강추ㅋㅋ',
 insta: ' ' + storeName + ' ' + (comment || (item ? item : '오늘의 발견')) + (good ? ' 완전 취향저격' : ' 나쁘지 않았어요') + ' ',
 }
 return NextResponse.json({
 review: demos[tone] || demos['z'],
 hashtags: ['#' + (mainKeyword || storeName), '#' + (storeType || '맛집'), good ? '#강추' : '#방문후기'],
 })
 }

 // Claude Vision 호출
 const toneGuide = TONE_PROMPTS[tone] || TONE_PROMPTS['z']
 const itemStr = receiptItems.length > 0 ? '실제 주문 메뉴 (영수증 OCR): ' + receiptItems.join(', ') : ''
 const ratingStr = rating + '점 (' + ['', '매우불만', '불만', '보통', '만족', '매우만족'][rating] + ')'

 // 매장 실제 메뉴 — AI 가 없는 메뉴 만드는 것 방지
 const menuLines: string[] = []
 if (Array.isArray(storeMenu) && storeMenu.length > 0) {
 const sigs = storeMenu.filter((m: any) => m?.signature).slice(0, 8)
 const others = storeMenu.filter((m: any) => !m?.signature).slice(0, 12)
 if (sigs.length > 0) {
 menuLines.push('대표 메뉴: ' + sigs.map((m: any) => m.name + (m.price ? ' (' + m.price.toLocaleString() + '원)' : '')).join(', '))
 }
 if (others.length > 0) {
 menuLines.push('기타 메뉴: ' + others.map((m: any) => m.name).join(', '))
 }
 }

 const content: object[] = []

 // 속도 최적화: 이미지 최대 1장만 (receiptItems 가 있으면 텍스트로 충분)
 const maxImages = receiptItems && receiptItems.length > 0 ? 1 : 2
 const imgList = images.slice(0, maxImages)

 if (imgList.length > 0) {
 content.push({ type: 'text', text: '음식·매장 분위기 사진:' })
 for (const img of imgList) {
 if (img && img.includes(',')) {
 const [hdr, b64] = img.split(',')
 content.push({ type: 'image', source: { type: 'base64', media_type: hdr.includes('png') ? 'image/png' : 'image/jpeg', data: b64 } })
 }
 }
 }

 // 영수증 OCR 성공 여부
 const hasReceiptItems = Array.isArray(receiptItems) && receiptItems.length > 0
 const hasMenuRegistered = menuLines.length > 0

 // 메뉴 언급 가능 케이스:
 // - 영수증 OCR 성공: receiptItems 만 사용 (가장 정확)
 // - OCR 실패 + 매장 메뉴 등록: 일반적 표현만 (특정 메뉴 강제 X)
 // - 둘 다 없음: 메뉴 언급 X
 let menuRule = ''
 if (hasReceiptItems) {
 menuRule = '메뉴 언급 시 영수증에 있는 "' + receiptItems.join(', ') + '" 만 사용. 그 외 메뉴 (등록 메뉴 포함) 언급 금지. 영수증에 없는 메뉴 추측 절대 X.'
 } else if (hasMenuRegistered) {
 menuRule = '영수증 OCR 이 안 됐거나 흐릿함 — 특정 메뉴 이름 언급 절대 금지. "음식이 맛있었어요", "메뉴가 정성스러워요" 같은 일반 표현만. 위 매장 메뉴는 참고용이지 언급 X.'
 } else {
 menuRule = '메뉴 이름 언급 X. "음식이 맛있어요" 정도로만 표현.'
 }

 content.push({
 type: 'text',
 text: [
 '매장: ' + storeName + ' (' + (storeType || '음식점') + ')',
 ...menuLines,
 itemStr,
 '별점: ' + ratingStr,
 comment ? '고객 코멘트: ' + comment : '',
 '말투: ' + toneGuide,
 '',
 '[중요 규칙]',
 menuRule,
 '사진에 보이는 음식·분위기·인테리어를 자연스럽게 묘사 (없는 것 추측 X).',
 '3~4문장 짧은 리뷰. 마지막 줄: "해시태그: #태그1 #태그2 #태그3"',
 ].filter(Boolean).join('\n'),
 })

 const resp = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': apiKey,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: 'claude-haiku-4-5-20251001',
 max_tokens: 350,  // 600 → 350 (3~4문장 + 해시태그면 충분)
 system: [
   '당신은 한국 자영업자 매장의 네이버 플레이스 리뷰를 작성하는 한국인 작가입니다.',
   '반드시 모든 출력은 100% 한국어로만 작성하세요.',
   '일본어, 중국어, 영어, 가타카나, 히라가나, 한자 절대 사용 금지.',
   '한국 사람이 자연스럽게 말하는 구어체 한국어로만 작성합니다.',
   '',
   '[가장 중요한 규칙 — 절대 금지 사항]',
   '1) 사용자가 제공한 메뉴 (영수증 OCR + 매장 등록 메뉴) 외에 다른 메뉴 이름을 절대 만들어내지 마세요.',
   '2) 사진에 보이지 않는 음식이나 분위기를 추측해서 쓰지 마세요.',
   '3) 매장이 등록한 실제 메뉴와 영수증 메뉴만 언급. 일반적인 음식 (예: "김치찌개" 매장이 아닌데 "김치찌개" 언급) 절대 X.',
   '4) 만약 메뉴 정보가 부족하면 메뉴 이름 언급 없이 "음식이 맛있어요" 정도로만 표현.',
   '',
   '해시태그도 모두 한글 (#매장명 #메뉴이름 #지역).',
 ].join('\n'),
 messages: [{ role: 'user', content }],
 }),
 signal: AbortSignal.timeout(40000), // 80s → 40s (이미지 1장 + 짧은 출력 = 15~25s)
 })

 if (!resp.ok) {
 const txt = await resp.text().catch(() => '')
 console.error('qr-review-generate Anthropic API non-ok:', resp.status, txt.slice(0, 200))
 return NextResponse.json({ error: 'AI 오류 (' + resp.status + ')', detail: txt.slice(0, 200) }, { status: 500 })
 }

 const result = await resp.json()
 const fullText: string = result.content?.[0]?.text?.trim() || ''

 // 안전장치: 일본어 (히라가나·가타카나) 또는 한자가 섞여 있으면 제거
 // 한글, 영문, 숫자, 기본 구두점, 이모지 등은 보존
 function stripForeign(s: string): string {
 // 히라가나 ぀-ゟ, 가타카나 ゠-ヿ, 한자 一-鿿
 return s.replace(/[぀-ゟ゠-ヿ一-鿿]/g, '')
 .replace(/\s+/g, ' ')
 .trim()
 }

 const hashMatch = fullText.match(/해시태그[:\s]+(#[^\n]+)/)
 const hashtagsRaw = hashMatch ? hashMatch[1].trim().split(/\s+/).filter((t: string) => t.startsWith('#')) : []
 const hashtags = hashtagsRaw.map(stripForeign).filter(t => t.length > 1).slice(0, 5)

 const reviewRaw = fullText.replace(/해시태그[:\s]+#[^\n]*/g, '').replace(/\n{3,}/g, '\n\n').trim()
 const review = stripForeign(reviewRaw)

 return NextResponse.json({ review, hashtags })
 } catch (err) {
 console.error('qr-review-generate v2 error:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}
