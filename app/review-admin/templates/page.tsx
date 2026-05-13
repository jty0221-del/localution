'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/app/components/Sidebar'
import PageHeader from '@/app/components/PageHeader'
import {
  ClipboardList, Plus, Pin, PinOff, Edit3, Trash2, Star, Save, X, RefreshCw,
} from 'lucide-react'

type Template = {
  id: string
  label: string
  body: string
  trigger_keywords: string[] | null
  rating_match: number | null
  use_count: number
  is_pinned: boolean
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/user/reply-templates', { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setTemplates(j.templates)
    } catch (_) {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (t: Partial<Template> & { id?: string }) => {
    const isNew = !t.id
    const url = '/api/user/reply-templates'
    const method = isNew ? 'POST' : 'PATCH'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    })
    const j = await r.json()
    if (j.ok) {
      load()
      setEditing(null)
      setNewOpen(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('이 템플릿을 삭제할까요?')) return
    const r = await fetch(`/api/user/reply-templates?id=${id}`, { method: 'DELETE' })
    const j = await r.json()
    if (j.ok) load()
  }

  const togglePin = async (t: Template) => {
    save({ id: t.id, is_pinned: !t.is_pinned })
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<ClipboardList size={24} className="text-white" strokeWidth={2.5} />}
          title="답글 템플릿"
          subtitle="자주 쓰는 답글 저장 — 1클릭으로 사용"
          variant="emerald"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs md:text-sm text-gray-500">{templates.length}개 템플릿</div>
            <button
              onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition"
            >
              <Plus size={14} /> 새 템플릿
            </button>
          </div>

          {newOpen && (
            <TemplateForm
              onCancel={() => setNewOpen(false)}
              onSave={(data) => save(data)}
            />
          )}

          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className={`bg-white rounded-2xl border ${t.is_pinned ? 'border-amber-200' : 'border-gray-200'} shadow-sm p-3 md:p-4`}>
                {editing?.id === t.id ? (
                  <TemplateForm
                    initial={t}
                    onCancel={() => setEditing(null)}
                    onSave={(data) => save({ ...data, id: t.id })}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {t.is_pinned && <Pin size={12} className="text-amber-500 fill-amber-500" />}
                          <span className="text-sm md:text-base font-bold text-gray-900">{t.label}</span>
                          {t.rating_match && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] md:text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-bold">
                              <Star size={10} className="fill-amber-500" />{t.rating_match}점만
                            </span>
                          )}
                          <span className="text-[10px] md:text-xs text-gray-400">{t.use_count}회 사용</span>
                        </div>
                        {t.trigger_keywords && t.trigger_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {t.trigger_keywords.map(k => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                #{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => togglePin(t)}
                          className="p-1.5 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded transition"
                          aria-label="고정"
                        >
                          {t.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                        <button
                          onClick={() => setEditing(t)}
                          className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition"
                          aria-label="수정"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => remove(t.id)}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition"
                          aria-label="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs md:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">
                      {t.body}
                    </div>
                  </>
                )}
              </div>
            ))}
            {templates.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                아직 템플릿이 없어요. 위 [+ 새 템플릿] 버튼으로 만들어보세요.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function TemplateForm({ initial, onCancel, onSave }: {
  initial?: Template
  onCancel: () => void
  onSave: (t: Partial<Template>) => void
}) {
  const [label, setLabel] = useState(initial?.label || '')
  const [body, setBody] = useState(initial?.body || '')
  const [keywords, setKeywords] = useState((initial?.trigger_keywords || []).join(', '))
  const [ratingMatch, setRatingMatch] = useState(initial?.rating_match || 0)
  const [isPinned, setIsPinned] = useState(initial?.is_pinned || false)

  const handleSave = () => {
    if (!label.trim() || !body.trim()) return
    onSave({
      label: label.trim(),
      body: body.trim(),
      trigger_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      rating_match: ratingMatch || null,
      is_pinned: isPinned,
    })
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 md:p-4 space-y-2">
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="템플릿 이름 (예: 감사 인사 / 부정 리뷰 사과)"
        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="답글 본문 (예: 사장님입니다. 방문 감사합니다. 다시 뵙고 싶어요!)"
        rows={4}
        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
      />
      <input
        type="text"
        value={keywords}
        onChange={e => setKeywords(e.target.value)}
        placeholder="추천 키워드 (예: 감사, 맛있, 친절) — 쉼표 구분"
        className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-gray-700">별점 매칭:</span>
        {[0, 1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRatingMatch(n)}
            className={`px-2 py-1 text-[11px] font-bold rounded transition ${
              ratingMatch === n ? 'bg-emerald-500 text-white' : 'bg-white border border-emerald-200 text-emerald-700'
            }`}
          >
            {n === 0 ? '모든' : `${n}점`}
          </button>
        ))}
      </div>
      <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
        <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="accent-amber-500" />
        <Pin size={11} className="text-amber-500" />
        고정 (목록 최상단)
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition"
        >
          <Save size={14} /> 저장
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs md:text-sm font-bold rounded-lg transition"
        >
          <X size={14} /> 취소
        </button>
      </div>
    </div>
  )
}
