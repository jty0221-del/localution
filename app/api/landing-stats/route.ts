import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /api/landing-stats
 * ──────────────────────────────────────────────────────────
 * 랜딩 페이지 (app/page.tsx) 의 통계/후기 실시간 공급용 엔드포인트.
 *
 * 현재는 null 반환 → 프론트엔드가 데모 값 + "예시" 뱃지로 표시.
 * 실제 데이터 소스 연결 후 null 대신 값 반환하면 프론트가 자동 교체.
 *
 * 예상 연결 소스:
 * - stats[0] '등록 매장' : Supabase stores 테이블 count
 * - stats[1] 'AI 답글 생성' : Supabase ai_replies 테이블 count 또는 이벤트 로그
 * - stats[2] '평균 별점 향상' : before/after 집계 (리뷰 연동 이후)
 * - stats[3] '재방문율 개선' : 고객 재방문 로직 구현 후
 * - hero.reviewsPerMonth : QR 리뷰 월간 증가 평균
 * - hero.avgRating : 활성 매장 평균 별점
 * - testimonials : Supabase testimonials 테이블 (수집 동의 받은 실제 후기)
 *
 * 프론트엔드 계약(app/page.tsx 참조):
 * {
 * stats: null | Array<{ num: string; label: string }> (길이 4)
 * hero: null | { reviewsPerMonth?: string; reviewsPerMonthLabel?: string;
 * avgRating?: string; avgRatingLabel?: string }
 * testimonials: null | Array<{
 * name: string; store: string; text: string; rating: number;
 * iconKey: 'coffee' | 'food' | 'gym'; color: string
 * }>
 * }
 * → 세 값 중 하나라도 비어있지 않으면 프론트가 isDemo=false 로 전환.
 * ──────────────────────────────────────────────────────────
 */
export async function GET() {
 // TODO: 실제 데이터 소스 연결 시 아래 블록을 채워 반환
 //
 // 예시:
 // const stores = await supabase.from('stores').select('id', { count: 'exact', head: true })
 // const aiReplies = await supabase.from('ai_replies').select('id', { count: 'exact', head: true })
 // const testimonials = await supabase.from('testimonials').select('*').eq('public', true).limit(3)

 return NextResponse.json(
 {
 stats: null,
 hero: null,
 testimonials: null,
 },
 {
 headers: {
 'Cache-Control': 'no-store, max-age=0',
 },
 }
 )
}
