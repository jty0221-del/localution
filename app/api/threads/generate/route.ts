// app/api/threads/generate/route.ts
// AI로 Threads 포스트 초안 생성 (Claude)
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const PERSONA_DESC: Record<string, string> = {
 friendly: '친근하고 따뜻한 동네 사장님 말투. "~해요", "~거든요" 어투. 이웃에게 말하듯 친밀하게.',
 professional: '신뢰감 있고 전문적인 말투. 정보를 명확하게 전달. "~합니다", "~드립니다" 공식적 어투.',
 emotional: '감성적이고 공감을 불러일으키는 말투. 스토리텔링, 감정 이입. 독자의 감성을 자극하는 글.',
 witty: '유머러스하고 가벼운 말투. 재치 있는 표현, 약간의 위트. 읽으면 피식 웃게 되는 글.',
}

export async function POST(request: NextRequest) {
 const body = await request.json() as {
 topic?: string
 persona?: string
 business_type?: string
 mode?: 'from_review'
 review_text?: string
 review_rating?: number
 }

 const persona = body.persona || 'friendly'
 const personaDesc = PERSONA_DESC[persona] ?? PERSONA_DESC.friendly
 const businessType = body.business_type || '소상공인·자영업자'

 let prompt: string

 if (body.mode === 'from_review' && body.review_text?.trim()) {
 // 리뷰 기반 생성
 const rating = body.review_rating ?? 5
 const stars = '★'.repeat(rating)
 prompt = `너는 ${businessType}를 위한 스레드(Threads) SNS 콘텐츠 전문가다.

아래 실제 고객 리뷰(${stars})를 바탕으로 스레드 포스트를 작성해라.

[고객 리뷰]
${body.review_text.trim()}

[페르소나] ${personaDesc}
[업종] ${businessType}

조건:
1. "고객이 이런 말을 해줬어요" 느낌의 감사·공유 포스트
2. 리뷰 내용을 직접 인용하거나 자연스럽게 녹여내기
3. 500자 이내, 이모지 금지
4. 해시태그 3-5개 (# 없이)
5. 자화자찬 아닌 고객 목소리 전달하는 톤

반드시 JSON으로만 응답:
{"text":"본문 내용","hashtags":["태그1","태그2","태그3"]}`
 } else {
 if (!body.topic?.trim()) {
 return NextResponse.json({ error: '주제를 입력해주세요.' }, { status: 400 })
 }

 prompt = `너는 ${businessType}를 위한 스레드(Threads) SNS 콘텐츠 전문가다.

[페르소나] ${personaDesc}
[업종] ${businessType}
[주제/키워드] ${body.topic.trim()}

다음 조건으로 스레드 포스트를 작성해라:
1. 500자 이내
2. 위 페르소나 말투를 철저히 따를 것
3. 첫 문장이 피드에서 스크롤을 멈추게 만드는 훅 문장이어야 함
4. 자연스럽게 읽히는 문단 구성 (2-4개 단락)
5. 이모지 사용 금지
6. 해시태그는 본문에 포함하지 말고 별도로 3-5개 추천 (# 기호 없이)

반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):
{"text":"본문 내용","hashtags":["태그1","태그2","태그3"]}`
 }

 try {
 const res = await fetch(ANTHROPIC_URL, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': process.env.ANTHROPIC_API_KEY!,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: MODEL,
 max_tokens: 1024,
 messages: [{ role: 'user', content: prompt }],
 }),
 })

 if (!res.ok) {
 const err = await res.text()
 throw new Error(`Anthropic API 오류: ${res.status} ${err.slice(0, 200)}`)
 }

 const data = await res.json() as { content?: { text: string }[] }
 const raw = data.content?.[0]?.text ?? ''

 const match = raw.match(/\{[\s\S]*\}/)
 if (!match) throw new Error('AI 응답 파싱 실패')

 const parsed = JSON.parse(match[0]) as { text: string; hashtags: string[] }
 return NextResponse.json({
 ok: true,
 text: parsed.text ?? '',
 hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
 })
 } catch (e) {
 const msg = e instanceof Error ? e.message : String(e)
 return NextResponse.json({ error: msg }, { status: 500 })
 }
}
