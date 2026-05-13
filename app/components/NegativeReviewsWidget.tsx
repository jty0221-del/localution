'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Star, ArrowRight, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'

type Critical = {
  id: string
  platform: string
  platform_label: string
  rating: number
  content_preview: string
  author: string
  posted_at: string | null
  has_draft: boolean
  review_admin_href: string
}

type Data = {
  critical_count: number
  warning_count: number
  critical: Critical[]
  warning_sample: any[]
}

export default function NegativeReviewsWidget() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/negative-reviews', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!data || data.critical_count === 0) {
    // 부정 리뷰 없음 — 칭찬 메시지
    if (data && data.warning_count === 0) {
      return (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-4 md:p-5 mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm flex items-center justify-center">
              <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm md:text-base font-bold text-emerald-900">미답변 부정 리뷰 없음</div>
              <div className="text-xs md:text-sm text-emerald-700">모든 리뷰가 답변 완료 또는 긍정 리뷰입니다.</div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 p-4 md:p-5 mb-4 md:mb-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-sm flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-sm md:text-base font-bold text-red-900">긴급 답글 필요</div>
              <span className="px-2 py-0.5 text-[10px] md:text-xs font-bold bg-red-600 text-white rounded-md">
                {data.critical_count}건
              </span>
            </div>
            <div className="text-[11px] md:text-xs text-red-700 mt-0.5">
              1~2점 미답변 — 24시간 안에 답글 권장
              {data.warning_count > 0 && ` · 3점 ${data.warning_count}건 추가`}
            </div>
          </div>
        </div>
      </div>

      <ul className="space-y-2 mb-3">
        {data.critical.slice(0, 5).map(c => (
          <li key={c.id}>
            <a
              href={c.review_admin_href}
              className="block p-2.5 md:p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] md:text-xs font-bold text-red-700 px-1.5 py-0.5 bg-red-50 rounded">
                    {c.platform_label}
                  </span>
                  <span className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < c.rating ? 'fill-amber-500' : 'text-gray-300'} />
                    ))}
                  </span>
                  {c.has_draft && (
                    <span className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      AI 초안 준비됨
                    </span>
                  )}
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">{c.author}</span>
              </div>
              <div className="text-xs md:text-sm text-gray-700 line-clamp-2">{c.content_preview}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] md:text-xs text-gray-500">
                  {c.posted_at ? new Date(c.posted_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : ''}
                </span>
                <span className="text-[11px] md:text-xs font-bold text-red-700 inline-flex items-center gap-0.5">
                  답글 작성 <ArrowRight size={11} />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {data.critical_count > 5 && (
        <a
          href="/review-admin"
          className="block text-center text-xs md:text-sm font-bold text-red-700 hover:text-red-900 hover:underline"
        >
          전체 {data.critical_count}건 보기 →
        </a>
      )}
    </div>
  )
}
