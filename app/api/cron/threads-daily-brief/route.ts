// app/api/cron/threads-daily-brief/route.ts
// 매일 오전 8시 (KST) 실행
// 오늘의 마케팅 트렌드 브리프를 AI로 생성 → Threads 자동 예약 발행
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const OWNER_EMAIL = 'jty0221@gmail.com'

async function getOwnerInfo(svc: ReturnType<typeof createServiceClient>) {
 const { data } = await svc
 .from('stores')
 .select('user_id, store_name, industry')
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 return {
 userId: data?.user_id || OWNER_EMAIL,
 storeName: data?.store_name || '우리 가게',
 industry: data?.industry || '소상공인',
 }
}

async function isThreadsConnected(svc: ReturnType<typeof createServiceClient>): Promise<boolean> {
 const { data } = await svc
 .from('platform_credentials')
 .select('id')
 .eq('platform', 'threads')
 .limit(1)
 .maybeSingle()
 return !!data
}

function todayKST(): string {
 return new Date().toLocaleDateString('ko-KR', {
 timeZone: 'Asia/Seoul',
 year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
 })
}

function currentSeason(): string {
 const month = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getMonth() + 1
 if (month >= 3 && month <= 5) return '봄'
 if (month >= 6 && month <= 8) return '여름'
 if (month >= 9 && month <= 11) return '가을'
 return '겨울'
}

async function generateBrief(industry: string): Promise<{ text: string; hashtags: string[] }> {
 const today = todayKST()
 const season = currentSeason()

 const prompt = `너는 ${industry} 자영업자를 위한 마케팅 콘텐츠 전문가다.

오늘(${today}, ${season})을 활용해서 Threads에 올릴 마케팅 브리프를 작성해라.

조건:
1. 오늘 날짜·계절·요일 중 하나를 자연스럽게 활용
2. ${industry} 업종 사장님에게 실질적인 마케팅 인사이트나 팁 제공
3. 500자 이내
4. 친근하고 전문적인 말투 ("~해요", "~거든요")
5. 첫 문장이 훅이 되게
6. 이모지 사용 금지
7. 해시태그 3-5개 (# 없이, 별도로)
8. 절대로 광고 느낌이 나지 않게, 진짜 팁을 주는 느낌으로

반드시 JSON으로만 응답:
{"text":"본문","hashtags":["태그1","태그2","태그3"]}`

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

 if (!res.ok) throw new Error(`Claude API 오류: ${res.status}`)
 const data = await res.json() as { content?: { text: string }[] }
 const raw = data.content?.[0]?.text ?? ''
 const match = raw.match(/\{[\s\S]*\}/)
 if (!match) throw new Error('AI 응답 파싱 실패')
 return JSON.parse(match[0]) as { text: string; hashtags: string[] }
}

export async function GET(request: Request) {
 const authHeader = request.headers.get('authorization')
 if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 try {
 const svc = createServiceClient()
 const { userId, industry } = await getOwnerInfo(svc)

 const connected = await isThreadsConnected(svc)
 if (!connected) {
 return NextResponse.json({ ok: false, reason: 'threads_not_connected' })
 }

 const { text, hashtags } = await generateBrief(industry)

 const { data: post, error } = await svc
 .from('threads_posts')
 .insert({
 user_id: userId,
 text_content: text,
 hashtags,
 media_type: 'TEXT',
 status: 'publishing',
 source: 'daily_brief',
 })
 .select('id')
 .single()

 if (error || !post) throw new Error(error?.message || 'DB 저장 실패')

 await enqueuePlatformJob({
 platform: 'threads',
 action: 'threads_publish',
 userId,
 storeId: userId,
 payload: { post_id: post.id },
 }, { priority: 2 })

 console.log('[threads-daily-brief] 발행 완료:', post.id)
 return NextResponse.json({ ok: true, post_id: post.id })
 } catch (e) {
 const msg = e instanceof Error ? e.message : String(e)
 console.error('[threads-daily-brief] 오류:', msg)
 return NextResponse.json({ error: msg }, { status: 500 })
 }
}
