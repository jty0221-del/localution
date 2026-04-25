// app/updates/page.tsx
// ============================================================
// 업데이트 내역 — 타임라인 공개 페이지
//   · 비로그인도 접근 가능
//   · 서버 컴포넌트 (ISR 60초)
//   · released_at 기준 월 단위 그룹핑
//   · 18차-5 핫픽스: 하단 CTA 로그인 여부에 따라 분기
//       - 로그인 상태 → "← 대시보드로" (/dashboard)
//       - 비로그인   → "← 홈으로"     (/)
// ============================================================
import { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const revalidate = 60

export const metadata: Metadata = {
  title: '업데이트 내역 | 로컬루션',
  description: '자영업자·소상공인을 위한 로컬루션의 새로운 기능과 개선사항을 확인하세요.',
}

type UpdateRow = {
  id: string
  title: string
  summary: string
  highlight: string | null
  category: 'feature' | 'fix' | 'notice' | 'beta'
  released_at: string // YYYY-MM-DD
  cover_url: string | null
  link_url: string | null
}

const CATEGORY_LABEL: Record<UpdateRow['category'], { label: string; cls: string }> = {
  feature: { label: 'NEW',    cls: 'bg-blue-100 text-blue-700' },
  fix:     { label: 'FIX',    cls: 'bg-amber-100 text-amber-700' },
  notice:  { label: '공지',   cls: 'bg-slate-100 text-slate-700' },
  beta:    { label: 'BETA',   cls: 'bg-purple-100 text-purple-700' },
}

function formatYearMonth(dateStr: string) {
  // "2026-04-20" → "2026.04"
  return dateStr.slice(0, 7).replace('-', '.')
}

async function fetchUpdates(): Promise<UpdateRow[]> {
  // 서버 컴포넌트에서 HTTP 루프백 대신 Supabase 직접 조회.
  //  · 빌드 환경(env 누락) / preview / 잘못된 baseUrl 폴백 이슈 회피
  //  · /api/updates 는 외부(SDK·웹훅)에서 호출하는 케이스에 한해 유지
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey || url.includes('placeholder.supabase.co')) return []
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const svc = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await svc
      .from('app_updates')
      .select('id,title,summary,highlight,category,released_at,cover_url,link_url,sort_order')
      .eq('active', true)
      .order('released_at', { ascending: false })
      .order('sort_order', { ascending: false })
    if (error) return []
    return (data ?? []) as UpdateRow[]
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// 로그인 여부 감지 (쿠키 존재 여부만 확인, 토큰 검증은 생략)
//   · localution_user (OAuth)  — 제품 기본 로그인 쿠키
//   · sb-*-auth-token          — Supabase 세션 폴백
// ------------------------------------------------------------
async function isLoggedIn(): Promise<boolean> {
  try {
    const store = await cookies()
    if (store.get('localution_user')?.value) return true
    const sb = store.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    return !!sb?.value
  } catch {
    return false
  }
}

export default async function UpdatesPage() {
  const [updates, loggedIn] = await Promise.all([fetchUpdates(), isLoggedIn()])

  const ctaHref  = loggedIn ? '/dashboard' : '/'
  const ctaLabel = loggedIn ? '← 대시보드로' : '← 홈으로'

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24">
      {/* ---- 상단 헤더 ---- */}
      <section className="px-5 pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 grid place-items-center mb-4">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 1 0-12 0c0 7 12 7 12 0z"/>
              <path d="M8 8a6 6 0 1 0 12 0c0 7-12 7-12 0z"/>
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            <span className="text-blue-600">원클릭</span>으로 모든 것을{' '}
            <span className="text-blue-600">자동화</span>하세요
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-500">
            로컬루션의 새로운 기능과 개선 내역을 한눈에 확인하세요.
          </p>
        </div>
      </section>

      {/* ---- 타임라인 카드 ---- */}
      <section className="px-5">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm ring-1 ring-slate-100 px-5 md:px-10 py-8 md:py-12">
          <h2 className="text-center text-base md:text-lg font-semibold text-slate-900 mb-8 md:mb-10">
            업데이트 내역
          </h2>

          {updates.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              등록된 업데이트 내역이 없습니다.
            </div>
          ) : (
            <ol className="relative pl-6 md:pl-8">
              {/* 세로 연결선 */}
              <span
                aria-hidden
                className="absolute left-[7px] md:left-[9px] top-3 bottom-3 w-px bg-gradient-to-b from-blue-200 via-slate-200 to-transparent"
              />

              {updates.map((u) => {
                const cat = CATEGORY_LABEL[u.category] ?? CATEGORY_LABEL.feature
                return (
                  <li key={u.id} className="relative mb-10 last:mb-0">
                    {/* 마커 */}
                    <span
                      aria-hidden
                      className="absolute -left-6 md:-left-8 top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100"
                    />

                    {/* 날짜 */}
                    <div className="text-xs md:text-sm text-slate-500 text-center mb-2">
                      {formatYearMonth(u.released_at)}
                    </div>

                    {/* 카드 */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-5 md:px-6 md:py-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cat.cls}`}>
                          {cat.label}
                        </span>
                        {u.link_url ? (
                          <a
                            href={u.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm md:text-base font-semibold text-blue-700 hover:underline"
                          >
                            {u.title}
                          </a>
                        ) : (
                          <h3 className="text-sm md:text-base font-semibold text-blue-700 text-center">
                            {u.title}
                          </h3>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 text-center whitespace-pre-line leading-relaxed">
                        {u.summary}
                      </p>
                      {u.highlight ? (
                        <p className="mt-2 text-sm text-blue-600 text-center font-medium whitespace-pre-line">
                          {u.highlight}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="mt-10 md:mt-12 text-center">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
