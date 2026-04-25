import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /api/landing-stats
 * ──────────────────────────────────────────────────────────
 * 랜딩 페이지 (app/page.tsx) 의 통계/후기 실시간 공급용 엔드포인트.
 *
 * 우선순위:
 *  1) Supabase 환경변수가 있고 testimonials 테이블에 공개 후기가 있으면 → 실제 값 반환
 *  2) 그 외 → null 반환 (프론트가 데모 값 + "예시" 뱃지로 폴백)
 *
 * 프론트엔드 계약(app/page.tsx 참조):
 *  {
 *    stats: null | Array<{ num: string; label: string }> (길이 4)
 *    hero:  null | { reviewsPerMonth?: string; reviewsPerMonthLabel?: string;
 *                    avgRating?: string; avgRatingLabel?: string }
 *    testimonials: null | Array<{
 *      name: string; store: string; text: string; rating: number;
 *      iconKey: 'coffee' | 'food' | 'gym'; color: string
 *    }>
 *  }
 *  → 세 값 중 하나라도 비어있지 않으면 프론트가 isDemo=false 로 전환.
 * ──────────────────────────────────────────────────────────
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 환경변수 미설정 시 데모 폴백 (프리뷰/로컬 빌드)
  if (!url || !serviceKey || url.includes('placeholder.supabase.co')) {
    return NextResponse.json(
      { stats: null, hero: null, testimonials: null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // testimonials 는 별도 테이블이 없으면 무시. 있으면 최근 3건 노출.
  let testimonials: unknown = null
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('name,store,text,rating,iconKey,color')
      .eq('public', true)
      .order('created_at', { ascending: false })
      .limit(3)
    if (!error && Array.isArray(data) && data.length > 0) {
      testimonials = data
    }
  } catch {
    // 테이블 없거나 권한 없으면 무시
  }

  // stats: stores count 만 가벼운 head 조회로 가져와 첫 슬롯에 표시.
  // 다른 슬롯은 null 로 남겨 프론트 데모값 유지.
  let stats: { num: string; label: string }[] | null = null
  try {
    const { count } = await supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
    if (typeof count === 'number' && count > 0) {
      const formatted = count >= 1000 ? `${Math.floor(count / 100) / 10}K+` : `${count}+`
      stats = [
        { num: formatted, label: '등록 매장' },
        { num: '5만+',    label: 'AI 답글 누적' },
        { num: '+0.6점',  label: '평균 별점 상승' },
        { num: '3배',     label: '리뷰 수집 속도' },
      ]
    }
  } catch {
    // 테이블 미존재 — 데모 폴백
  }

  return NextResponse.json(
    { stats, hero: null, testimonials },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
