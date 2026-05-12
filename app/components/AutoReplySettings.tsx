// app/components/AutoReplySettings.tsx
// ============================================================
// v38: 플랫폼-범용 autoreply 설정 컴포넌트 (재사용 가능)
//   <AutoReplySettings platform="kakao_map" />
//   <AutoReplySettings platform="naver_place" />
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles, ToggleLeft, ToggleRight, Loader2, CheckCircle2, AlertTriangle,
  Smile, Briefcase, Laugh, Minus, Heart, Hash,
} from 'lucide-react'

type Settings = {
  enabled: boolean
  tone: string
  auto_approve: boolean
  max_per_run: number
}

type Props = {
  platform: 'naver_place' | 'kakao_map' | 'baemin' | 'yogiyo' | 'coupangeats'
  platformLabel?: string
}

const TONES = [
  { value: 'friendly', label: '친근한', desc: '사장님처럼 따뜻하게', Icon: Smile, color: 'from-amber-500 to-orange-600' },
  { value: 'expert', label: '전문적', desc: '정중하고 단정하게', Icon: Briefcase, color: 'from-slate-500 to-gray-700' },
  { value: 'witty', label: '유쾌한', desc: '위트 있게 밝게', Icon: Laugh, color: 'from-pink-500 to-rose-600' },
  { value: 'simple', label: '심플', desc: '짧고 깔끔하게', Icon: Minus, color: 'from-blue-500 to-indigo-600' },
  { value: 'emo', label: '감성', desc: '편지 같은 따뜻함', Icon: Heart, color: 'from-purple-500 to-violet-600' },
  { value: 'mz', label: 'MZ', desc: '요즘 자연스러운 톤', Icon: Hash, color: 'from-emerald-500 to-green-600' },
]

const PLATFORM_LABELS: Record<string, string> = {
  naver_place: '네이버 플레이스',
  kakao_map: '카카오맵',
  baemin: '배달의민족',
  yogiyo: '요기요',
  coupangeats: '쿠팡이츠',
}

export default function AutoReplySettings({ platform, platformLabel }: Props) {
  const label = platformLabel || PLATFORM_LABELS[platform] || platform
  const [settings, setSettings] = useState<Settings | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/autoreply/settings?platform=${platform}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) {
        setSettings(j.settings)
        setConnected(j.connected)
      }
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [platform])

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return
    setSaving(true)
    const optimistic = { ...settings, ...patch }
    setSettings(optimistic)
    try {
      const r = await fetch(`/api/autoreply/settings?platform=${platform}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await r.json()
      if (j.ok) {
        setSettings(j.settings)
        showToast('저장됨')
      } else {
        await load()
        showToast(j.error || '저장 실패', 'err')
      }
    } catch (e: any) {
      await load()
      showToast(e?.message || '저장 실패', 'err')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 flex items-center justify-center py-8 text-[#8B95A1] text-sm">
        <Loader2 size={16} className="animate-spin mr-2" /> 자동답글 설정 로드 중…
      </div>
    )
  }

  if (!connected || !settings) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-amber-500" />
          <div className="text-sm md:text-base font-bold text-[#191F28]">AI 자동답글</div>
        </div>
        <p className="text-xs md:text-sm text-[#8B95A1] mb-3">
          {label} 연동 후 자동답글을 켤 수 있어요.
        </p>
        <a
          href={`/my/platforms/${platform}/connect`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] text-white text-xs md:text-sm font-bold rounded-lg hover:bg-[#1B64DA] transition"
        >
          {label} 연결하기 →
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${settings.enabled ? 'from-emerald-500 to-green-600' : 'from-gray-400 to-gray-500'} shadow-sm flex items-center justify-center flex-shrink-0`}>
            <Sparkles size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm md:text-base font-bold text-[#191F28]">AI 자동답글</div>
            <div className="text-[11px] md:text-xs text-[#8B95A1]">
              {settings.enabled ? '4시간마다 미답변 리뷰에 AI 초안 자동 작성' : '꺼짐'}
            </div>
          </div>
        </div>
        <button
          onClick={() => update({ enabled: !settings.enabled })}
          disabled={saving}
          aria-label={settings.enabled ? '자동답글 끄기' : '자동답글 켜기'}
          className="flex-shrink-0"
        >
          {settings.enabled ? (
            <ToggleRight size={36} className="text-emerald-500" strokeWidth={2} />
          ) : (
            <ToggleLeft size={36} className="text-gray-400" strokeWidth={2} />
          )}
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Tone 선택 */}
          <div>
            <div className="text-xs md:text-sm font-bold text-[#191F28] mb-2">답글 톤</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {TONES.map(t => {
                const Icon = t.Icon
                const active = settings.tone === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => update({ tone: t.value })}
                    disabled={saving}
                    className={`flex items-center gap-2 p-2 md:p-2.5 rounded-lg border transition text-left ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-[#E5E8EB] bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#191F28]">{t.label}</div>
                      <div className="text-[10px] text-[#8B95A1] leading-tight">{t.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* auto_approve */}
          <div className="flex items-center justify-between gap-3 p-3 bg-[#F8F9FA] rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-xs md:text-sm font-bold text-[#191F28]">초안 자동 발행</div>
              <div className="text-[11px] md:text-xs text-[#8B95A1]">
                꺼짐: 초안만 생성, 사장님 확인 후 발행 / 켜짐: AI가 바로 발행
              </div>
            </div>
            <button
              onClick={() => update({ auto_approve: !settings.auto_approve })}
              disabled={saving}
              className="flex-shrink-0"
            >
              {settings.auto_approve ? (
                <ToggleRight size={32} className="text-emerald-500" strokeWidth={2} />
              ) : (
                <ToggleLeft size={32} className="text-gray-400" strokeWidth={2} />
              )}
            </button>
          </div>

          {/* max_per_run */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs md:text-sm font-bold text-[#191F28]">1회 최대 처리 건수</div>
              <div className="text-sm md:text-base font-black text-emerald-600">{settings.max_per_run}건</div>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={settings.max_per_run}
              onChange={e => update({ max_per_run: parseInt(e.target.value, 10) })}
              disabled={saving}
              className="w-full accent-emerald-500"
            />
            <div className="flex items-center justify-between text-[10px] md:text-xs text-[#8B95A1] mt-1">
              <span>1건</span>
              <span>20건</span>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className={`flex items-center gap-1.5 text-xs md:text-sm ${toast.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}
