// app/api/marketing/blog-post-suggest/route.ts
// ============================================================
// 블로그 글 작성 — 초안·메모 + 마무리 메시지 자동 생성 (가벼운 AI 호출)
// POST /api/marketing/blog-post-suggest
// body: { industry, track, coreTarget, keywords, detailKeywords, persona }
// response: { ok, draft, closingMessage }
// · 4·5·6번 입력값으로 7·8번에 들어갈 초안을 가볍게 생성
// · Claude Haiku 사용 (빠르고 저렴)
// · 사용자가 그대로 사용하거나 수정 가능
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
 try {
 const auth = await requireUser()
 const limitId = auth.ok ? auth.userId : `ip:${getClientIp(req)}`
 const rl = await rateLimit({ bucket: 'blog-post-suggest', id: limitId, limit: 30, windowSec: 60 })
 if (!rl.ok) {
 return NextResponse.json(
 { ok: false, error: '잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
 { status: 429 },
 )
 }

 if (!process.env.ANTHROPIC_API_KEY) {
 return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 })
 }

 const body = await req.json()
 const {
 industry = '',
 track = 'A',
 coreTarget = '',
 keywords = [] as string[],
 detailKeywords = [] as string[],
 persona = { name: '', tone: 'friendly' },
 } = body || {}

 if (!industry.trim() && !keywords.length && !coreTarget.trim()) {
 return NextResponse.json({ ok: false, error: '업종 / 핵심 타겟 / 키워드 중 하나는 필요해요' }, { status: 400 })
 }

 const trackName: Record<string, string> = {
 A: '순위용 (정보·리스트형)',
 B: '신뢰용 (사례·스토리형)',
 C: '관심사형 (공감·생활형)',
 D: '맛집 후기 (블로거 1인칭)',
 E: '체험단·협찬 (광고 표기 의무)',
 F: '이벤트·프로모션 (직접 전환)',
 }

 const systemPrompt = `당신은 네이버 블로그 마케팅 전문가입니다. 사장님이 입력한 정보로 블로그 글의 "초안·메모" 와 "마무리 메시지" 두 가지를 가볍게 제안합니다.

[목적]
- 본문은 별도 단계에서 풀버전으로 생성됨
- 여기서는 사장님이 본문에 어떤 내용을 담을지 영감을 주는 짧은 초안 메모 + 마무리 한 단락
- 너무 길지 않게, 핵심만

[출력 형식 — 반드시 JSON]
{
 "draft": "초안·메모 본문 (300~500자, 줄바꿈 포함)",
 "closingMessage": "마무리 메시지 (100~200자, 행동 유도 글 톤)"
}

[draft 작성 규칙]
- 강조하고 싶은 차별점 2~3개 제시
- 본문에 담을 만한 사례/포인트 제안
- 사장님이 자유롭게 수정할 수 있는 메모 형태 (완성된 글 X)
- 줄바꿈 활용 (· 점 또는 줄바꿈)

[closingMessage 작성 규칙]
- 100~200자
- 글을 읽은 독자가 자연스럽게 다음 행동하고 싶어지는 톤
- 전화번호·링크 같은 정보 나열 금지
- 부담 없는 표현 ("부담 없이", "편하게", "가볍게")
- 광고 톤 X, 진정성 있게

JSON만 출력. 마크다운 코드블록 X. 다른 설명 X.`

 const userPrompt = `[업종/주제] ${industry || '(미지정)'}
[글 유형] ${trackName[track] || track}
[핵심 타겟] ${coreTarget || '(미지정)'}
[검색 의도 키워드] ${keywords.join(', ') || '(없음)'}
[세부 키워드] ${detailKeywords.join(', ') || '(없음)'}
[페르소나] ${persona.name || '담당자'} (말투: ${persona.tone})

위 정보로 draft 와 closingMessage 두 가지를 JSON으로 제안해주세요.`

 const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': process.env.ANTHROPIC_API_KEY,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({
 model: 'claude-haiku-4-5-20251001',
 max_tokens: 1500,
 system: systemPrompt,
 messages: [{ role: 'user', content: userPrompt }],
 }),
 signal: AbortSignal.timeout(20000),
 })

 if (!apiRes.ok) {
 const txt = await apiRes.text().catch(() => '')
 return NextResponse.json({ ok: false, error: 'AI 호출 실패: ' + txt.slice(0, 200) }, { status: 502 })
 }

 const data = await apiRes.json()
 let text = data?.content?.[0]?.text || ''
 if (!text) return NextResponse.json({ ok: false, error: '빈 응답' }, { status: 502 })

 // JSON 추출 (코드블록 감싸있을 수도)
 text = text.trim()
 if (text.startsWith('```')) {
 text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
 }
 const objStart = text.indexOf('{')
 const objEnd = text.lastIndexOf('}')
 if (objStart >= 0 && objEnd > objStart) {
 text = text.slice(objStart, objEnd + 1)
 }

 let parsed: any
 try { parsed = JSON.parse(text) }
 catch { return NextResponse.json({ ok: false, error: 'JSON 파싱 실패', raw: text.slice(0, 300) }, { status: 502 }) }

 return NextResponse.json({
 ok: true,
 draft: String(parsed.draft || '').slice(0, 1000),
 closingMessage: String(parsed.closingMessage || '').slice(0, 500),
 })
 } catch (e: any) {
 if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
 return NextResponse.json({ ok: false, error: 'AI 응답 시간 초과' }, { status: 504 })
 }
 return NextResponse.json({ ok: false, error: e?.message || '알 수 없는 오류' }, { status: 500 })
 }
}
