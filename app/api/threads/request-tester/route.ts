// app/api/threads/request-tester/route.ts
// Threads 테스터 등록 신청 — 어떤 업체든 신청 가능
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function ensureTable(svc: ReturnType<typeof createServiceClient>) {
 const { error } = await svc.from('threads_tester_requests').select('id').limit(1)
 if (!error) return

 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
 const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
 const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1]
 if (!projectRef) return

 const sql = `
 CREATE TABLE IF NOT EXISTS public.threads_tester_requests (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 user_id TEXT NOT NULL,
 instagram_id TEXT NOT NULL,
 store_name TEXT,
 contact TEXT,
 status TEXT NOT NULL DEFAULT 'pending'
 CHECK (status IN ('pending','processing','done','rejected')),
 memo TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 ALTER TABLE public.threads_tester_requests ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
 CREATE POLICY "service_full_tester_req" ON public.threads_tester_requests
 FOR ALL TO service_role USING (true) WITH CHECK (true);
 EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 `
 await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
 body: JSON.stringify({ query: sql }),
 }).catch(() => {})
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json() as {
 instagram_id?: string
 store_name?: string
 contact?: string
 }

 const instagramId = body.instagram_id?.trim().replace(/^@/, '')
 if (!instagramId) {
 return NextResponse.json({ ok: false, error: 'Instagram 아이디를 입력해주세요.' }, { status: 400 })
 }

 const svc = createServiceClient()
 await ensureTable(svc)

 // 이미 신청한 경우 중복 방지
 const { data: existing } = await svc
 .from('threads_tester_requests')
 .select('id, status')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (existing && existing.status !== 'rejected') {
 return NextResponse.json({
 ok: true,
 already: true,
 status: existing.status,
 message: existing.status === 'done'
 ? '이미 테스터 등록이 완료된 계정입니다.'
 : '이미 신청이 접수되어 처리 중입니다.',
 })
 }

 const { error } = await svc.from('threads_tester_requests').insert({
 user_id: auth.userId,
 instagram_id: instagramId,
 store_name: body.store_name?.trim() || null,
 contact: body.contact?.trim() || null,
 })

 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

 return NextResponse.json({ ok: true, already: false })
}

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 await ensureTable(svc)

 const { data } = await svc
 .from('threads_tester_requests')
 .select('id, status, instagram_id, created_at')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 return NextResponse.json({ ok: true, request: data ?? null })
}
