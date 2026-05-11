// app/admin/queue-control/page.tsx
// ============================================================
// 관리자: BullMQ 큐 비상 제어 — 모바일 최적화
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/app/components/PageHeader'
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Zap,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react'

type QueueStatus = {
  counts?: { waiting: number; prioritized: number; active: number; completed: number; failed: number; delayed: number }
  prioritized?: any[]
}

type ActionResult = {
  label: string
  ok: boolean
  message: string
  ts: number
}

export default function QueueControlPage() {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [results, setResults] = useState<ActionResult[]>([])
  const [platform, setPlatform] = useState<'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'all'>('naver_place')

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const url = platform === 'all'
        ? '/api/admin/queue-job-inspect'
        : `/api/admin/queue-job-inspect?platform=${platform}`
      const r = await fetch(url + '&_t=' + Date.now(), { cache: 'no-store' })
      const j = await r.json()
      setStatus(j)
    } catch (e: any) {
      setResults(prev => [{ label: '조회 실패', ok: false, message: e.message, ts: Date.now() }, ...prev])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 10000)
    return () => clearInterval(t)
  }, [platform])

  const runAction = async (label: string, url: string) => {
    setBusyAction(label)
    try {
      const r = await fetch(url, { cache: 'no-store' })
      const j = await r.json()
      setResults(prev => [{
        label,
        ok: !!j.ok,
        message: j.message || j.error || JSON.stringify(j).slice(0, 200),
        ts: Date.now(),
      }, ...prev.slice(0, 9)])
      await fetchStatus()
    } catch (e: any) {
      setResults(prev => [{ label, ok: false, message: e.message, ts: Date.now() }, ...prev.slice(0, 9)])
    } finally {
      setBusyAction(null)
    }
  }

  const counts = status?.counts || { waiting: 0, prioritized: 0, active: 0, completed: 0, failed: 0, delayed: 0 }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <PageHeader
        title="큐 비상 제어"
        subtitle="BullMQ 적체 / 중복 / hang 즉시 복구"
        icon={Activity}
        gradient="from-rose-500 to-pink-600"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 플랫폼 필터 + 새로고침 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {(['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition ${
                  platform === p
                    ? 'bg-rose-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {p === 'all' ? '전체' : p === 'naver_place' ? '네이버' : p === 'baemin' ? '배민' : p === 'yogiyo' ? '요기요' : '쿠팡'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {/* 큐 상태 카드 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          <StatCard label="대기" value={counts.waiting} color="bg-gradient-to-br from-blue-500 to-blue-600" />
          <StatCard label="우선순위" value={counts.prioritized} color="bg-gradient-to-br from-purple-500 to-purple-600" highlight={counts.prioritized > 10} />
          <StatCard label="처리중" value={counts.active} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <StatCard label="완료" value={counts.completed} color="bg-gradient-to-br from-gray-500 to-gray-600" />
          <StatCard label="실패" value={counts.failed} color="bg-gradient-to-br from-red-500 to-red-600" highlight={counts.failed > 5} />
          <StatCard label="지연" value={counts.delayed} color="bg-gradient-to-br from-amber-500 to-amber-600" />
        </div>

        {/* 비상 액션 버튼들 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base md:text-lg font-bold text-gray-900">비상 복구 액션</div>
              <div className="text-xs text-gray-500">큐 적체 / 답글 발행 안 됨 / hang 상황</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionButton
              label="1) 중복 dedup + 적체 정리"
              desc="prioritized 의 중복 잡 제거 + waiting fetch_reviews 200건 청소"
              busy={busyAction === 'cleanup'}
              onClick={() => runAction('cleanup', '/api/admin/queue-emergency-cleanup?dry=0&clean_fetch=1')}
              color="from-purple-500 to-violet-600"
            />
            <ActionButton
              label="2) Hang 된 active 해제"
              desc="30분+ 처리 중인 fetch_reviews 강제 해제 → slot 즉시 해제"
              busy={busyAction === 'release'}
              onClick={() => runAction('release', '/api/admin/queue-force-release-active?action_filter=fetch_reviews')}
              color="from-orange-500 to-red-600"
            />
            <ActionButton
              label="3) 묵은 stale 잡 제거"
              desc="3시간+ 묵은 priority 1 잡 제거 (큐 블로킹 해소)"
              busy={busyAction === 'stale'}
              onClick={() => runAction('stale', '/api/admin/queue-remove-stale?max_age_hours=3')}
              color="from-amber-500 to-orange-600"
            />
            <ActionButton
              label="4) prioritized → waiting 변환"
              desc={`${platform === 'all' ? '모든' : platform === 'naver_place' ? '네이버' : '해당'} 답글 잡을 waiting 으로 이동 (워커 미pickup 우회)`}
              busy={busyAction === 'promote'}
              onClick={() => runAction('promote', `/api/admin/queue-promote-to-waiting?platform=${platform === 'all' ? 'naver_place' : platform}`)}
              color="from-blue-500 to-indigo-600"
            />
          </div>
        </div>

        {/* prioritized 잡 상세 (있을 때만) */}
        {status?.prioritized && status.prioritized.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold text-gray-900">
                Prioritized 잡 ({status.prioritized.length}건)
              </div>
              <div className="text-xs text-gray-500">최대 15건 표시</div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {status.prioritized.slice(0, 15).map((j: any) => (
                <div key={j.id} className="flex items-center gap-2 p-2 md:p-3 bg-gray-50 rounded-lg text-xs md:text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] md:text-xs text-gray-500 truncate">
                      {String(j.id).slice(0, 24)}
                    </div>
                    <div className="font-medium text-gray-900 truncate">
                      {j.platform} · {j.action}
                    </div>
                    <div className="text-[11px] md:text-xs text-gray-500 truncate">
                      {j.userId || ''} · review {String(j.platform_review_id || '').slice(0, 16)}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-medium">
                      P{j.priority || '?'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 액션 결과 */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-base font-bold text-gray-900">최근 액션 결과</div>
              <div className="text-xs text-gray-500">최대 10건</div>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 p-2 md:p-3 bg-gray-50 rounded-lg text-xs md:text-sm">
                  <div className={`flex-shrink-0 mt-0.5 ${r.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{r.label}</div>
                    <div className="text-[11px] md:text-xs text-gray-600 break-words">{r.message}</div>
                  </div>
                  <div className="flex-shrink-0 text-[10px] md:text-xs text-gray-400">
                    {new Date(r.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 운영 가이드 */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <div className="text-sm md:text-base font-bold text-rose-900">언제 사용?</div>
          </div>
          <ul className="text-xs md:text-sm text-rose-900 space-y-1.5">
            <li className="flex items-start gap-1.5">
              <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
              <span><b>prioritized 50+</b> → 1번 dedup + 정리</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
              <span><b>active 가 30분+ 같은 잡</b> → 2번 active 해제 또는 Railway worker restart</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
              <span><b>답글 발행 안 됨 + 큐에 잡 있음</b> → 4번 waiting 변환</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
              <span>자세한 가이드: <code className="bg-rose-100 px-1 rounded text-[11px]">worker/BULLMQ_QUEUE_PRIORITY_INCIDENT_v38.md</code></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <div className={`${color} rounded-xl p-2.5 md:p-3 text-white shadow-sm ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="text-[10px] md:text-xs font-medium opacity-90">{label}</div>
      <div className="text-lg md:text-2xl font-black mt-0.5">{value}</div>
    </div>
  )
}

function ActionButton({ label, desc, busy, onClick, color }: {
  label: string
  desc: string
  busy: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-left p-3 md:p-4 rounded-xl bg-gradient-to-br ${color} text-white shadow-sm hover:shadow-md transition disabled:opacity-50`}
    >
      <div className="flex items-center gap-2 mb-1">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        <div className="text-sm md:text-base font-bold">{label}</div>
      </div>
      <div className="text-[11px] md:text-xs opacity-90 leading-snug">{desc}</div>
    </button>
  )
}
