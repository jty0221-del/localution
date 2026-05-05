'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Sidebar from '@/app/components/Sidebar'

// ── 타입 ─────────────────────────────────────────────────────
interface Review {
  id: string
  content: string
  rating: number | null
  posted_at: string | null
  draft_reply: string | null
  reply_status: string | null
  reply_tone: string | null
  author_mask: string | null
}

interface Settings {
  enabled: boolean
  tone: string
  auto_approve: boolean
  max_per_run: number
}

// ── 상수 ─────────────────────────────────────────────────────
const TONES = [
  { value: 'friendly', label: '친근한', desc: '사장님처럼 따뜻하게' },
  { value: 'expert',   label: '전문적', desc: '정중하고 단정하게' },
  { value: 'witty',    label: '유쾌한', desc: '위트 있게 밝게' },
  { value: 'simple',   label: '심플',   desc: '짧고 깔끔하게' },
  { value: 'emo',      label: '감성',   desc: '편지 같은 따뜻함' },
  { value: 'mz',       label: 'MZ',     desc: '요즘 자연스러운 톤' },
]

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:  { text: '승인 대기',  color: 'bg-amber-100 text-amber-700' },
  queued:   { text: '게시 대기',  color: 'bg-blue-100 text-blue-700' },
  submitted:{ text: '게시 완료',  color: 'bg-green-100 text-green-700' },
  failed:   { text: '실패',       color: 'bg-red-100 text-red-600' },
  rejected: { text: '무시됨',     color: 'bg-gray-100 text-gray-500' },
}

function StarRow({ rating }: { rating: number | null }) {
  const r = Math.round(Math.min(5, Math.max(0, rating ?? 0)))
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(r)}{'☆'.repeat(5 - r)}
    </span>
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

// ── 컴포넌트 ─────────────────────────────────────────────────
export default function NaverAutoReplyPage() {
  const [tab, setTab] = useState<'pending' | 'all' | 'settings'>('pending')
  const [reviews, setReviews] = useState<Review[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 데이터 로드 ──────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/naver-autoreply/settings')
    if (!res.ok) return
    const data = await res.json()
    setSettings(data.settings)
    setSettingsDraft(data.settings)
    setConnected(data.connected)
  }, [])

  const loadReviews = useCallback(async (all = false) => {
    setLoading(true)
    try {
      const url = all
        ? '/api/platform-reviews?platform=naver_place&has_reply=false&limit=50'
        : '/api/platform-reviews?platform=naver_place&has_reply=false&reply_status=pending&limit=30'
      const res = await fetch(url)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      // graceful
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSettings()
    loadReviews(false)
  }, [loadSettings, loadReviews])

  useEffect(() => {
    if (tab === 'pending')  loadReviews(false)
    if (tab === 'all')      loadReviews(true)
    if (tab === 'settings') loadSettings()
  }, [tab, loadReviews, loadSettings])

  // ── 승인 ────────────────────────────────────────────────
  const handleApprove = async (rev: Review, overrideText?: string) => {
    setActionLoading(rev.id)
    try {
      const res = await fetch('/api/naver-autoreply/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: rev.id,
          reply_text: overrideText ?? rev.draft_reply ?? '',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('답글 게시 대기열에 추가됐어요!')
        setEditingId(null)
        setReviews(prev => prev.map(r => r.id === rev.id ? { ...r, reply_status: 'queued' } : r))
      } else {
        showToast(data.error || '처리 실패', 'err')
      }
    } catch {
      showToast('네트워크 오류', 'err')
    }
    setActionLoading(null)
  }

  // ── 무시 ────────────────────────────────────────────────
  const handleReject = async (reviewId: string) => {
    setActionLoading(reviewId)
    try {
      const res = await fetch('/api/naver-autoreply/approve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('초안을 무시했어요.')
        setReviews(prev => prev.filter(r => r.id !== reviewId))
      } else {
        showToast(data.error || '처리 실패', 'err')
      }
    } catch {
      showToast('네트워크 오류', 'err')
    }
    setActionLoading(null)
  }

  // ── 설정 저장 ────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!settingsDraft) return
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/naver-autoreply/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      })
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
        setSettingsDraft(data.settings)
        showToast('설정을 저장했어요!')
      } else {
        showToast(data.error || '저장 실패', 'err')
      }
    } catch {
      showToast('네트워크 오류', 'err')
    }
    setSettingsSaving(false)
  }

  // ── 수동 생성 (크론 트리거) ───────────────────────────────
  const handleManualRun = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cron/naver-reply-generate')
      const data = await res.json()
      if (data.ok) {
        showToast(`AI 초안 생성 완료: ${data.total_drafted}건`)
        loadReviews(tab === 'all')
      } else {
        showToast(data.error || '생성 실패', 'err')
      }
    } catch {
      showToast('네트워크 오류', 'err')
    }
    setLoading(false)
  }

  const pendingCount = reviews.filter(r => r.reply_status === 'pending').length

  // ── 리뷰 카드 ────────────────────────────────────────────
  const ReviewCard = ({ rev }: { rev: Review }) => {
    const isEditing = editingId === rev.id
    const statusInfo = STATUS_LABEL[rev.reply_status || ''] || null
    const busy = actionLoading === rev.id

    return (
      <div className={`bg-white rounded-2xl border p-4 md:p-5 transition-all ${
        rev.reply_status === 'queued' || rev.reply_status === 'submitted'
          ? 'border-[#E8F5E9] opacity-60'
          : 'border-[#E8ECF0]'
      }`}>
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1A1A2E]">
              {rev.author_mask || '익명'}
            </span>
            <StarRow rating={rev.rating} />
            <span className="text-xs text-[#8B95A1]">{fmtDate(rev.posted_at)}</span>
          </div>
          {statusInfo && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          )}
        </div>

        {/* 리뷰 본문 */}
        {rev.content ? (
          <p className="text-sm text-[#374151] leading-relaxed bg-[#F8FAFC] rounded-xl px-3 py-2 mb-3">
            {rev.content.length > 150 ? rev.content.slice(0, 150) + '…' : rev.content}
          </p>
        ) : (
          <p className="text-xs text-[#8B95A1] italic mb-3">텍스트 없음 (사진·별점 리뷰)</p>
        )}

        {/* AI 초안 */}
        {rev.draft_reply ? (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-bold text-[#1A67F5]">✦ AI 초안</span>
              {rev.reply_tone && (
                <span className="text-[10px] text-[#8B95A1]">
                  · {TONES.find(t => t.value === rev.reply_tone)?.label || rev.reply_tone}
                </span>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full text-sm text-[#1A1A2E] bg-[#EEF4FF] border border-[#1A67F5]/30 rounded-xl px-3 py-2.5 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A67F5]/30"
                rows={5}
              />
            ) : (
              <p className="text-sm text-[#374151] leading-relaxed bg-[#EEF4FF] rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                {rev.draft_reply}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-3 bg-[#F8FAFC] rounded-xl px-3 py-2.5 text-xs text-[#8B95A1]">
            AI 초안이 아직 없어요. 크론이 실행되면 자동 생성됩니다.
          </div>
        )}

        {/* 액션 버튼 */}
        {rev.draft_reply && rev.reply_status !== 'submitted' && rev.reply_status !== 'queued' && (
          <div className="flex gap-2 flex-wrap">
            {isEditing ? (
              <>
                <button
                  onClick={() => handleApprove(rev, editText)}
                  disabled={busy || !editText.trim()}
                  className="flex-1 min-w-[100px] py-2 rounded-xl text-sm font-bold bg-[#1A67F5] text-white hover:bg-[#1552CC] disabled:opacity-50 transition-colors"
                >
                  {busy ? '처리 중…' : '수정 후 승인'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#8B95A1] bg-[#F2F4F6] hover:bg-[#E8ECF0] transition-colors"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleApprove(rev)}
                  disabled={busy}
                  className="flex-1 min-w-[80px] py-2 rounded-xl text-sm font-bold bg-[#1A67F5] text-white hover:bg-[#1552CC] disabled:opacity-50 transition-colors"
                >
                  {busy ? '처리 중…' : '✓ 승인·게시'}
                </button>
                <button
                  onClick={() => { setEditingId(rev.id); setEditText(rev.draft_reply || '') }}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-[#1A67F5] bg-[#EEF4FF] hover:bg-[#DCE8FF] disabled:opacity-50 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => handleReject(rev.id)}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-[#8B95A1] bg-[#F2F4F6] hover:bg-[#E8ECF0] disabled:opacity-50 transition-colors"
                >
                  무시
                </button>
              </>
            )}
          </div>
        )}

        {rev.reply_status === 'queued' && (
          <p className="text-xs text-[#1A67F5] font-semibold mt-1">⏳ Railway Worker가 SmartPlace에 게시 중이에요</p>
        )}
        {rev.reply_status === 'submitted' && (
          <p className="text-xs text-green-600 font-semibold mt-1">✓ 답글이 성공적으로 게시됐어요</p>
        )}
      </div>
    )
  }

  // ── 설정 탭 ─────────────────────────────────────────────
  const SettingsTab = () => {
    if (!connected) {
      return (
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-3">
            <Link2 size={26} className="text-[#3182F6]" strokeWidth={2.5} />
          </div>
          <p className="text-base font-bold text-[#1A1A2E] mb-1">네이버 플레이스 연동이 필요해요</p>
          <p className="text-sm text-[#8B95A1]">매장 관리 → 플랫폼 연결에서 네이버 플레이스를 연동해 주세요.</p>
        </div>
      )
    }

    if (!settingsDraft) return null

    const changed = JSON.stringify(settingsDraft) !== JSON.stringify(settings)

    return (
      <div className="space-y-4">
        {/* 자동답글 ON/OFF */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#1A1A2E] mb-0.5">자동 AI 답글 생성</div>
              <div className="text-xs text-[#8B95A1]">크론이 실행될 때 미답변 리뷰에 AI 초안을 자동으로 만들어요</div>
            </div>
            <button
              onClick={() => setSettingsDraft(prev => prev ? { ...prev, enabled: !prev.enabled } : prev)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settingsDraft.enabled ? 'bg-[#1A67F5]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settingsDraft.enabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* 답글 톤 */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <div className="text-sm font-bold text-[#1A1A2E] mb-3">기본 답글 톤</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setSettingsDraft(prev => prev ? { ...prev, tone: t.value } : prev)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settingsDraft.tone === t.value
                    ? 'border-[#1A67F5] bg-[#EEF4FF]'
                    : 'border-[#E8ECF0] hover:border-[#B0BEC5]'
                }`}
              >
                <div className={`text-sm font-bold mb-0.5 ${settingsDraft.tone === t.value ? 'text-[#1A67F5]' : 'text-[#1A1A2E]'}`}>
                  {t.label}
                </div>
                <div className="text-[11px] text-[#8B95A1]">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 자동 승인 */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#1A1A2E] mb-0.5">자동 승인 (Auto-Approve)</div>
              <div className="text-xs text-[#8B95A1]">
                ON이면 AI가 초안을 만들자마자 바로 게시 대기열에 넣어요.<br />
                OFF이면 이 페이지에서 직접 검토 후 승인해야 해요.
              </div>
              {settingsDraft.auto_approve && (
                <div className="mt-2 text-xs text-amber-600 font-semibold bg-amber-50 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1">
                  <AlertTriangle size={12} strokeWidth={2.5} />
                  AI 답글이 검토 없이 자동 게시됩니다
                </div>
              )}
            </div>
            <button
              onClick={() => setSettingsDraft(prev => prev ? { ...prev, auto_approve: !prev.auto_approve } : prev)}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
                settingsDraft.auto_approve ? 'bg-amber-500' : 'bg-[#D1D5DB]'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settingsDraft.auto_approve ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* 회당 최대 건수 */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <div className="text-sm font-bold text-[#1A1A2E] mb-1">크론 1회당 최대 답글 생성 수</div>
          <div className="text-xs text-[#8B95A1] mb-3">너무 많으면 AI API 비용이 많이 나올 수 있어요 (권장: 5~10건)</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={settingsDraft.max_per_run}
              onChange={e => setSettingsDraft(prev => prev ? { ...prev, max_per_run: Number(e.target.value) } : prev)}
              className="flex-1 accent-[#1A67F5]"
            />
            <span className="w-10 text-center text-sm font-bold text-[#1A67F5]">{settingsDraft.max_per_run}건</span>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSaveSettings}
          disabled={settingsSaving || !changed}
          className={`w-full py-3 rounded-2xl text-sm font-bold transition-all ${
            changed
              ? 'bg-[#1A67F5] text-white hover:bg-[#1552CC]'
              : 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {settingsSaving ? '저장 중…' : '설정 저장'}
        </button>
      </div>
    )
  }

  // ── 메인 렌더 ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[240px] pt-4 md:pt-0 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-black text-[#1A1A2E] mb-1">
              네이버 AI 자동답글
            </h1>
            <p className="text-sm text-[#8B95A1]">
              AI가 만든 답글 초안을 검토·승인하면 SmartPlace에 자동 게시돼요
            </p>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-5 bg-white rounded-2xl border border-[#E8ECF0] p-1">
            {[
              { key: 'pending',  label: '승인 대기', badge: pendingCount },
              { key: 'all',      label: '전체 현황', badge: 0 },
              { key: 'settings', label: '설정',      badge: 0 },
            ].map(({ key, label, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === key
                    ? 'bg-[#1A67F5] text-white shadow-sm'
                    : 'text-[#8B95A1] hover:text-[#1A1A2E]'
                }`}
              >
                {label}
                {badge > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === key ? 'bg-white/30 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 수동 생성 버튼 (pending/all 탭) */}
          {tab !== 'settings' && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleManualRun}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#1A67F5] bg-[#EEF4FF] hover:bg-[#DCE8FF] disabled:opacity-50 transition-colors"
              >
                <span className={loading ? 'animate-spin' : ''}>✦</span>
                AI 초안 지금 생성
              </button>
            </div>
          )}

          {/* 탭 콘텐츠 */}
          {tab === 'settings' ? (
            <SettingsTab />
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-sm text-[#8B95A1]">불러오는 중…</div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8ECF0] p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={26} className="text-[#059669]" strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-bold text-[#1A1A2E] mb-1">
                    {tab === 'pending' ? '승인 대기 중인 답글이 없어요' : '리뷰가 없어요'}
                  </p>
                  <p className="text-sm text-[#8B95A1]">
                    {tab === 'pending'
                      ? 'AI 자동 생성을 켜두면 새 리뷰가 올 때마다 초안이 만들어져요'
                      : '네이버 리뷰가 수집되면 여기에 표시됩니다'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(rev => <ReviewCard key={rev.id} rev={rev} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50 transition-all ${
          toast.type === 'ok' ? 'bg-[#1A67F5] text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
