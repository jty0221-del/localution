'use client'

// ============================================================
// 관리자 임시 로그인 배너
//   · 모든 페이지 상단에 고정 표시 (impersonation 활성 시)
//   · "관리자 모드: <user> 로 로그인 중" + [원래대로 돌아가기]
// ============================================================
import { useEffect, useState } from 'react'
import { Shield, X } from 'lucide-react'

type Status = {
  ok: boolean
  impersonating: boolean
  current_user?: { id: string; email?: string; name?: string } | null
  admin_user?: { id: string; email?: string } | null
}

export default function ImpersonationBanner() {
  const [status, setStatus] = useState<Status | null>(null)
  const [reverting, setReverting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/admin/impersonate', { cache: 'no-store', credentials: 'include' })
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled) setStatus(j)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  if (!status?.impersonating) return null

  const revert = async () => {
    if (!confirm('임시 로그인을 종료하고 관리자 계정으로 돌아가시겠어요?')) return
    setReverting(true)
    try {
      const r = await fetch('/api/admin/impersonate', { method: 'DELETE', credentials: 'include' })
      const j = await r.json()
      if (j.ok) {
        location.href = '/admin/users'
      } else {
        alert(j.error || '복귀 실패')
        setReverting(false)
      }
    } catch (e: any) {
      alert(e?.message || '오류')
      setReverting(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-[#F04452] to-[#DC2626] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Shield size={16} className="flex-shrink-0" strokeWidth={2.5} />
          <div className="min-w-0">
            <span className="text-[11px] md:text-sm font-bold">관리자 임시 로그인</span>
            <span className="text-[11px] md:text-xs ml-2 opacity-90">
              {status.current_user?.name || status.current_user?.email || status.current_user?.id?.slice(0, 8)}
              {' '}로 보고 있음 (admin: {status.admin_user?.email})
            </span>
          </div>
        </div>
        <button onClick={revert} disabled={reverting}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#DC2626] text-[11px] md:text-xs font-bold hover:bg-[#FEF2F2] disabled:opacity-50 flex-shrink-0">
          <X size={12} strokeWidth={2.5} />
          {reverting ? '복귀 중...' : '관리자로 복귀'}
        </button>
      </div>
    </div>
  )
}
