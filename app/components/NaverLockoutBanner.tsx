// app/components/NaverLockoutBanner.tsx
// ============================================================
// v38: 네이버 계정 잠금 / 답글 발행 실패 배너
//   · 답글 실패 reply_error 에 "안전하지 않은 환경" / "비정상" 패턴 감지
//   · 사장님에게 nid.naver.com 로그인 안내 표시
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, X } from 'lucide-react'

type LockoutStatus = {
  has_lockout: boolean
  failed_count: number
  sample_review_id?: string
}

export default function NaverLockoutBanner() {
  const [status, setStatus] = useState<LockoutStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 세션당 1회만 닫음 (sessionStorage)
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('naver_lockout_dismissed') === '1') {
        setDismissed(true)
        return
      }
    }
    fetch('/api/review-reply/naver-status?check_lockout=1', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.ok && j.has_lockout) setStatus(j)
      })
      .catch(() => {})
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('naver_lockout_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !status?.has_lockout) return null

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm flex items-center justify-center">
          <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm md:text-base font-bold text-amber-900">
              네이버 답글 발행이 막혀있어요
            </div>
            <span className="px-2 py-0.5 text-[10px] md:text-xs font-bold bg-amber-600 text-white rounded-md">
              {status.failed_count}건 실패
            </span>
          </div>
          <p className="text-xs md:text-sm text-amber-900 leading-relaxed mb-3">
            네이버에서 "안전하지 않은 환경에서 로그인" 차단이 걸렸어요. 사장님이 직접 한 번 로그인하면 풀려요.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://nid.naver.com/nidlogin.login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg text-xs md:text-sm font-bold hover:shadow-md transition"
            >
              <ExternalLink size={14} />
              네이버 로그인하러 가기
            </a>
            <a
              href="/review-admin/naver"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs md:text-sm font-medium hover:bg-amber-50 transition"
            >
              답글 다시 시도
            </a>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-amber-600 hover:bg-amber-100 rounded-md"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
