import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/userAuth';
import { rateLimit, getClientIp } from '@/app/lib/rate-limit';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
 try {
 // 인증 + 레이트 리밋 (분당 10회/사용자, 비로그인은 IP 기반)
 const auth = await requireUser();
 const id = auth.ok ? auth.userId : `ip:${getClientIp(req)}`;
 const rl = await rateLimit({ bucket: 'ai', id, limit: 10, windowSec: 60 });
 if (!rl.ok) {
 return NextResponse.json(
 { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
 { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
 );
 }

 const body = await req.json();

 if (!process.env.ANTHROPIC_API_KEY) {
 return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 });
 }

 const response = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': process.env.ANTHROPIC_API_KEY,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify(body),
 signal: AbortSignal.timeout(45000), // 45초 timeout (hang 방지)
 });

 if (!response.ok) {
 const error = await response.text();
 return NextResponse.json({ error }, { status: response.status });
 }

 const data = await response.json();
 return NextResponse.json(data);
 } catch (e: unknown) {
 const msg = e instanceof Error ? e.message : 'AI 요청 처리 중 오류'
 return NextResponse.json({ error: msg }, { status: 500 });
 }
}
