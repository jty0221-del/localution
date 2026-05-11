// app/components/CreatorChannelsSection.tsx
// ============================================================
// v38: 마케터·블로거·1인 사업자 채널 연동 섹션
//   · 매장 없는 사용자도 자기 채널을 연동할 수 있도록
//   · 홈페이지 URL / 블로그 URL / Instagram / Threads / YouTube
//   · /api/user/creator-channels GET/POST 로 저장
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import {
  Globe, BookOpen, Instagram, MessageSquare, Youtube,
  Save, ExternalLink, Loader2, CheckCircle2, Sparkles,
} from 'lucide-react'

type Channels = {
  homepage_url?: string
  blog_url?: string
  instagram_url?: string
  threads_url?: string
  youtube_channel_url?: string
}

export default function CreatorChannelsSection() {
  const [channels, setChannels] = useState<Channels>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/user/creator-channels', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j?.ok) setChannels(j.channels || {})
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const validate = (key: keyof Channels, value: string): string => {
    if (!value) return ''
    const v = value.trim()
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      return 'http:// 또는 https:// 로 시작해주세요'
    }
    try { new URL(v) } catch { return '유효한 URL 형식이 아니에요' }
    return ''
  }

  const handleChange = (key: keyof Channels, value: string) => {
    setChannels(prev => ({ ...prev, [key]: value }))
    const err = validate(key, value)
    setErrors(prev => ({ ...prev, [key]: err }))
  }

  const handleSave = async () => {
    // 전체 validate
    const newErrors: Record<string, string> = {}
    for (const key of Object.keys(channels) as (keyof Channels)[]) {
      const v = channels[key] || ''
      const err = validate(key, v)
      if (err) newErrors[key] = err
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSaving(true)
    try {
      const r = await fetch('/api/user/creator-channels', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channels),
      })
      const j = await r.json()
      if (j.ok) {
        setSavedAt(Date.now())
        setTimeout(() => setSavedAt(null), 3000)
      } else {
        alert('저장 실패: ' + (j.error || 'unknown'))
      }
    } catch (e: any) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields: Array<{
    key: keyof Channels
    label: string
    placeholder: string
    icon: any
    iconBg: string
    helper: string
    helperLink?: string
  }> = [
    {
      key: 'homepage_url',
      label: '홈페이지',
      placeholder: 'https://my-site.com',
      icon: Globe,
      iconBg: 'from-blue-500 to-indigo-600',
      helper: '개인 홈페이지 / 회사 사이트',
    },
    {
      key: 'blog_url',
      label: '블로그',
      placeholder: 'https://blog.naver.com/...',
      icon: BookOpen,
      iconBg: 'from-emerald-500 to-green-600',
      helper: '네이버 블로그 / 티스토리 / 워드프레스 등',
      helperLink: '/marketing/blog-tracking',
    },
    {
      key: 'instagram_url',
      label: 'Instagram',
      placeholder: 'https://instagram.com/...',
      icon: Instagram,
      iconBg: 'from-pink-500 to-rose-600',
      helper: '인스타그램 프로필',
    },
    {
      key: 'threads_url',
      label: 'Threads',
      placeholder: 'https://threads.net/@...',
      icon: MessageSquare,
      iconBg: 'from-gray-700 to-black',
      helper: 'Threads 프로필 (자동 발행은 별도 OAuth 연결)',
      helperLink: '/marketing/threads',
    },
    {
      key: 'youtube_channel_url',
      label: 'YouTube',
      placeholder: 'https://youtube.com/@...',
      icon: Youtube,
      iconBg: 'from-red-500 to-red-700',
      helper: 'YouTube 채널 URL',
      helperLink: '/marketing/youtube-community',
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 mt-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm ring-1 ring-violet-200 flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-bold text-[#191F28]">개인 채널 연동</h2>
          <p className="text-xs text-[#8B95A1] mt-0.5">
            매장이 없는 마케터·블로거·1인 사업자도 본인 채널을 등록하면 AI 콘텐츠 작성 시 자동으로 참고해요
          </p>
        </div>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-8 text-[#8B95A1]">
          <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {fields.map(f => {
              const Icon = f.icon
              const val = channels[f.key] || ''
              const err = errors[f.key]
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${f.iconBg} shadow-sm flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className="text-white" strokeWidth={2.5} />
                    </div>
                    <label className="text-sm font-bold text-[#191F28]">{f.label}</label>
                    {val && !err && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 size={11} /> 입력됨
                      </span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={val}
                    onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg border ${
                      err ? 'border-red-300 bg-red-50' : 'border-[#E5E8EB] bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-[#3182F6]/30 focus:border-[#3182F6] transition`}
                  />
                  <div className="flex items-center justify-between gap-2 text-[11px] min-h-[16px]">
                    <span className={err ? 'text-red-600 font-medium' : 'text-[#8B95A1]'}>
                      {err || f.helper}
                    </span>
                    {f.helperLink && (
                      <a
                        href={f.helperLink}
                        className="text-[#3182F6] font-semibold hover:underline flex items-center gap-0.5 flex-shrink-0"
                      >
                        관리 <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[#F2F4F6]">
            <p className="text-[11px] text-[#8B95A1] flex-1">
              저장된 URL 은 AI 블로그 글 작성 / 숏폼 / Threads 자동 발행 시 본인 채널로 자동 참조됩니다.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || Object.values(errors).some(v => !!v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition disabled:opacity-50 flex-shrink-0"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> 저장 중...</>
              ) : savedAt ? (
                <><CheckCircle2 size={14} /> 저장 완료</>
              ) : (
                <><Save size={14} /> 저장</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
