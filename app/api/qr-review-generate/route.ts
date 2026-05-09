import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 50  // Vision + 짧은 출력 (이미지 1장 + 350토큰 = 15~30초 목표)

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
 const { receiptImage, expectedStoreName = '' } = body
 const apiKey = process.env.ANTHROPIC_API_KEY

 if (!apiKey || !receiptImage) {
 return NextResponse.json({ receiptInfo: { items: [], matched: false } })
 }

 const [header, base64] = receiptImage.split(',')
 const mediaType = header.includes('png') ? 'image/png' : 'image/jpeg'

 const resp = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': apiKey,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: 'claude-haiku-4-5-20251001',
 max_tokens: 200,  // 400 → 200 (JSON만 반환 — 짧음)
 messages: [{
 role: 'user',
 content: [
 { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
 {
 type: 'text',
 text: '영수증 → JSON: {"storeName":"...","items":["메뉴1","메뉴2"],"total":"...","matched":bool}. 매장명 일치: "' + expectedStoreName + '". JSON만.',
 },
 ],
 }],
 }),
 signal: AbortSignal.timeout(20000), // 30s → 20s (짧은 JSON)
 })

 if (!resp.ok) return NextResponse.json({ receiptInfo: { items: [], matched: false } })

 const data = await resp.json()
 const text = data.content?.[0]?.text || '{}'
 const jsonMatch = text.match(/\{[\s\S]*\}/)
 try {
 const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
 return NextResponse.json({ receiptInfo: { items: [], matched: false, ...parsed } })
 } catch {
 return NextResponse.json({ receiptInfo: { items: [], matched: false } })
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
 const itemStr = receiptItems.length > 0 ? '주문 메뉴: ' + receiptItems.join(', ') : ''
 const ratingStr = rating + '점 (' + ['', '매우불만', '불만', '보통', '만족', '매우만족'][rating] + ')'

 const content: object[] = []

 // 속도 최적화: 이미지 최대 1장만 (receiptItems 가 있으면 텍스트로 충분)
 // — 영수증 메뉴는 receiptItems 로 받음 → 사진 1장만 분위기 파악용
 const maxImages = receiptItems && receiptItems.length > 0 ? 1 : 2
 const imgList = images.slice(0, maxImages)

 if (imgList.length > 0) {
 content.push({ type: 'text', text: '사진 보고 네이버 플레이스 리뷰 작성:' })
 for (const img of imgList) {
 if (img && img.includes(',')) {
 const [hdr, b64] = img.split(',')
 content.push({ type: 'image', source: { type: 'base64', media_type: hdr.includes('png') ? 'image/png' : 'image/jpeg', data: b64 } })
 }
 }
 }

 content.push({
 type: 'text',
 text: [
 '매장: ' + storeName + ' (' + (storeType || '음식점') + ')',
 itemStr,
 '별점: ' + ratingStr,
 comment ? '고객 코멘트: ' + comment : '',
 '말투: ' + toneGuide,
 '',
 '3~4문장 짧은 리뷰 작성. 마지막 줄: "해시태그: #태그1 #태그2 #태그3"',
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

 const hashMatch = fullText.match(/해시태그[:\s]+(#[^\n]+)/)
 const hashtags = hashMatch ? hashMatch[1].trim().split(/\s+/).filter((t: string) => t.startsWith('#')).slice(0, 5) : []
 const review = fullText.replace(/해시태그[:\s]+#[^\n]*/g, '').replace(/\n{3,}/g, '\n\n').trim()

 return NextResponse.json({ review, hashtags })
 } catch (err) {
 console.error('qr-review-generate v2 error:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}
