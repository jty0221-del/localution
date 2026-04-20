// app/api/updates/route.ts
// ============================================================
// 앱 업데이트 내역 — 공개 GET
//   · 비로그인 방문자도 접근 가능 (/updates 페이지용)
//   · active = true 만, released_at DESC 정렬
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 60 // 1분 캐시 (public 페이지용)

export async function GET() {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('app_updates')
    .select('id,title,summary,highlight,category,released_at,cover_url,link_url,sort_order')
    .eq('active', true)
    .order('released_at', { ascending: false })
    .order('sort_order', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updates: data ?? [] })
}
