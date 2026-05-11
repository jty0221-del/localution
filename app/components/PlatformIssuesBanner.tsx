// app/components/PlatformIssuesBanner.tsx
// ============================================================
// v38: 사용자 플랫폼 자격증명 이슈 통합 배너
//   · NaverLockoutBanner 의 일반화 버전
//   · 자격증명 오류 / 계정 잠금 / 로그인 폼 변경 등 모두 표시
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, X, RefreshCw } from 'lucide-react'

type Issue = {
  platform: string
  label: string
  status: string
  error_short: string
  store_name: string | null
  suggestion: string
  connect_href: string
}

export default function PlatformIssuesBanner() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('platform_issues_dismissed') === '1') {
        setDismissed(true)
        return
      }
    }
    fetch('/api/user/platform-issues', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.ok && j.has_issues) setIssues(j.issues)
      })
      .catch(() => {})
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('platform_issues_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || issues.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 shadow-sm p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-sm flex items-center justify-center">
          <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm md:text-base font-bold text-red-900">
              플랫폼 연결 문제 발생
            </div>
            <span className="px-2 py-0.5 text-[10px] md:text-xs font-bold bg-red-600 text-white rounded-md">
              {issues.length}건
            </span>
          </div>
          <ul className="space-y-2 mb-3">
            {issues.map(i => (
              <li key={i.platform} className="flex items-start gap-2 p-2 md:p-2.5 bg-white/70 rounded-lg border border-red-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-bold text-red-900">{i.label}</span>
                    {i.store_name && (
                      <span className="text-[10px] md:text-xs text-red-700 truncate">· {i.store_name}</span>
                    )}
                  </div>
                  <p className="text-[11px] md:text-xs text-red-800 leading-snug mt-0.5">
                    {i.suggestion}
                  </p>
                </div>
                <a
                  href={i.connect_href}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[11px] md:text-xs font-bold rounded-lg hover:shadow-sm transition"
                >
                  <RefreshCw size={11} /> 재연결
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[10px] md:text-[11px] text-red-700 leading-snug">
            플랫폼 연결이 끊어지면 리뷰 수집·답글 자동 발행이 멈춰요. 재연결 후 다음 자동 사이클부터 즉시 작동합니다.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-red-600 hover:bg-red-100 rounded-md"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
