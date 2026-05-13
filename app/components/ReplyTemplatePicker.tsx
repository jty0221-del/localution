// app/components/ReplyTemplatePicker.tsx
// ============================================================
// v38: 답글 템플릿 1클릭 삽입 + 리뷰 내용 기반 자동 추천
//   · 사장님이 미리 저장한 템플릿 중 리뷰 내용/별점에 맞는 것 우선 표시
//   · 트리거 키워드 매칭 + rating_match 우선
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ChevronDown, Pin, Sparkles, ExternalLink } from 'lucide-react'

type Template = {
  id: string
  label: string
  body: string
  trigger_keywords: string[] | null
  rating_match: number | null
  use_count: number
  is_pinned: boolean
}

type Props = {
  reviewContent?: string | null
  reviewRating?: number | null
  onPick: (text: string) => void
  colorAccent?: string
}

export default function ReplyTemplatePicker({ reviewContent, reviewRating, onPick, colorAccent = '#3182F6' }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/user/reply-templates', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j.ok) setTemplates(j.templates) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [open, loaded])

  // 추천 점수 계산
  const scoreTemplate = (t: Template): number => {
    let score = 0
    if (t.is_pinned) score += 100
    score += Math.min(50, t.use_count)
    // 별점 매칭
    if (t.rating_match && reviewRating === t.rating_match) score += 80
    // 키워드 매칭
    if (t.trigger_keywords && reviewContent) {
      const text = reviewContent.toLowerCase()
      for (const k of t.trigger_keywords) {
        if (text.includes(k.toLowerCase())) score += 30
      }
    }
    return score
  }

  const sorted = [...templates].sort((a, b) => scoreTemplate(b) - scoreTemplate(a))
  const recommended = sorted.filter(t => scoreTemplate(t) >= 30).slice(0, 3)
  const others = sorted.filter(t => !recommended.find(r => r.id === t.id))

  const pick = async (t: Template) => {
    onPick(t.body)
    setOpen(false)
    // use_count 증가 (background)
    try {
      await fetch('/api/user/reply-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, increment_use: true }),
      })
    } catch (_) {}
  }

  return (
    <div className="mt-2 relative">
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#E5E8EB] rounded-md text-[10px] md:text-xs font-bold text-[#4E5968] hover:bg-[#F8F9FA] transition"
      >
        <ClipboardList size={11} /> 템플릿
        <ChevronDown size={11} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 w-full max-w-md bg-white border border-[#E5E8EB] rounded-xl shadow-lg p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
          {!loaded && (
            <div className="text-xs text-[#8B95A1] py-2 text-center">로드 중…</div>
          )}
          {loaded && templates.length === 0 && (
            <div className="text-xs text-[#8B95A1] py-3 text-center">
              저장된 템플릿이 없어요.
              <a href="/review-admin/templates" className="block mt-1 text-[#3182F6] font-bold inline-flex items-center gap-0.5">
                템플릿 만들러 가기 <ExternalLink size={10} />
              </a>
            </div>
          )}
          {recommended.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-[#7C3AED] px-1 inline-flex items-center gap-1">
                <Sparkles size={9} /> 이 리뷰에 추천
              </div>
              {recommended.map(t => (
                <TemplateRow key={t.id} t={t} onPick={pick} colorAccent={colorAccent} highlight />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              {recommended.length > 0 && <div className="border-t border-[#F2F4F6] my-1" />}
              <div className="text-[10px] font-bold text-[#8B95A1] px-1">전체 템플릿</div>
              {others.slice(0, 10).map(t => (
                <TemplateRow key={t.id} t={t} onPick={pick} colorAccent={colorAccent} />
              ))}
            </>
          )}
          <a
            href="/review-admin/templates"
            className="block text-center text-[10px] md:text-xs text-[#3182F6] font-bold hover:underline py-1.5 border-t border-[#F2F4F6] mt-1"
          >
            템플릿 관리 →
          </a>
        </div>
      )}
    </div>
  )
}

function TemplateRow({ t, onPick, colorAccent, highlight }: {
  t: Template
  onPick: (t: Template) => void
  colorAccent: string
  highlight?: boolean
}) {
  return (
    <button
      onClick={() => onPick(t)}
      type="button"
      className={`w-full text-left p-2 rounded-lg transition ${
        highlight ? 'bg-purple-50 hover:bg-purple-100' : 'bg-[#F8F9FA] hover:bg-[#F2F4F6]'
      }`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        {t.is_pinned && <Pin size={9} className="text-amber-500 fill-amber-500" />}
        <span className="text-[11px] md:text-xs font-bold text-[#191F28] truncate">{t.label}</span>
        {t.rating_match && (
          <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
            {t.rating_match}점
          </span>
        )}
        <span className="text-[9px] text-[#8B95A1] ml-auto">{t.use_count}회</span>
      </div>
      <div className="text-[10px] md:text-[11px] text-[#4E5968] line-clamp-2">{t.body}</div>
    </button>
  )
}
