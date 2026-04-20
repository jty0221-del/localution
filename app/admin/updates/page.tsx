'use client'

// app/admin/updates/page.tsx
// ============================================================
// 관리자 · 앱 업데이트 내역 CRUD
//   · /api/admin/updates 기반 (requireAdmin 듀얼모드)
//   · 추가/수정 모달 + 활성 토글 + 삭제
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/app/lib/adminFetch'

type UpdateRow = {
  id: string
  title: string
  summary: string
  highlight: string | null
  category: 'feature' | 'fix' | 'notice' | 'beta'
  released_at: string
  active: boolean
  sort_order: number
  cover_url: string | null
  link_url: string | null
  created_at: string
  updated_at: string
}

const CATEGORY_LABEL: Record<UpdateRow['category'], string> = {
  feature: 'NEW',
  fix: 'FIX',
  notice: '공지',
  beta: 'BETA',
}

const emptyDraft = (): Partial<UpdateRow> => ({
  title: '',
  summary: '',
  highlight: '',
  category: 'feature',
  released_at: new Date().toISOString().slice(0, 10),
  active: true,
  sort_order: 0,
  cover_url: '',
  link_url: '',
})

export default function AdminUpdatesPage() {
  const [rows, setRows]       = useState<UpdateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [draft, setDraft]     = useState<Partial<UpdateRow> | null>(null)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await adminFetch('/api/admin/updates')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '불러오기 실패')
      setRows(json.updates ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!draft) return
    if (!draft.title?.trim() || !draft.summary?.trim() || !draft.released_at) {
      alert('제목 · 본문 · 배포일자는 필수입니다.')
      return
    }
    setSaving(true)
    try {
      const isEdit = Boolean(draft.id)
      const url = isEdit
        ? `/api/admin/updates?id=${encodeURIComponent(draft.id!)}`
        : '/api/admin/updates'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = {
        title:       draft.title?.trim(),
        summary:     draft.summary?.trim(),
        highlight:   draft.highlight?.trim() || null,
        category:    draft.category ?? 'feature',
        released_at: draft.released_at,
        active:      draft.active !== false,
        sort_order:  Number(draft.sort_order ?? 0),
        cover_url:   draft.cover_url?.trim() || null,
        link_url:    draft.link_url?.trim() || null,
      }
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '저장 실패')
      setDraft(null)
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row: UpdateRow) {
    try {
      const res = await adminFetch(`/api/admin/updates?id=${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || '토글 실패')
      }
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, active: !r.active } : r))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'unknown error')
    }
  }

  async function remove(row: UpdateRow) {
    if (!confirm(`"${row.title}" 업데이트를 삭제할까요?`)) return
    try {
      const res = await adminFetch(`/api/admin/updates?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || '삭제 실패')
      }
      setRows(prev => prev.filter(r => r.id !== row.id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'unknown error')
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24">
      <div className="max-w-5xl mx-auto px-5 pt-8 md:pt-12">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">업데이트 내역 관리</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              /updates 페이지와 대시보드 팝업에 노출되는 내역을 관리합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => load()}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >새로고침</button>
            <button
              onClick={() => setDraft(emptyDraft())}
              className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >+ 새 업데이트</button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">
            {error}
          </div>
        ) : null}

        {/* 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium w-24">날짜</th>
                <th className="text-left px-4 py-3 font-medium w-20">분류</th>
                <th className="text-left px-4 py-3 font-medium">제목 / 본문</th>
                <th className="text-left px-4 py-3 font-medium w-20">정렬</th>
                <th className="text-left px-4 py-3 font-medium w-20">활성</th>
                <th className="text-right px-4 py-3 font-medium w-36">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400">불러오는 중…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400">등록된 업데이트가 없습니다.</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 text-slate-700">{row.released_at}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      row.category === 'feature' ? 'bg-blue-100 text-blue-700' :
                      row.category === 'fix'     ? 'bg-amber-100 text-amber-700' :
                      row.category === 'beta'    ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-700'
                    }`}>{CATEGORY_LABEL[row.category]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.title}</div>
                    <div className="text-slate-500 text-xs mt-1 line-clamp-2 whitespace-pre-line">{row.summary}</div>
                    {row.highlight ? (
                      <div className="text-blue-600 text-xs mt-1">{row.highlight}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.sort_order}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(row)}
                      className={`text-xs px-2 py-1 rounded ${
                        row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >{row.active ? 'ON' : 'OFF'}</button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setDraft({ ...row })}
                      className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                    >수정</button>
                    <button
                      onClick={() => remove(row)}
                      className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- 추가/수정 모달 ---- */}
      {draft ? (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {draft.id ? '업데이트 수정' : '새 업데이트 추가'}
              </h2>
              <button
                onClick={() => setDraft(null)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="닫기"
              >✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">제목 *</label>
                <input
                  type="text"
                  value={draft.title ?? ''}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="N플레이스 자동 리뷰 프로그램 출시"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">본문 *</label>
                <textarea
                  rows={3}
                  value={draft.summary ?? ''}
                  onChange={e => setDraft({ ...draft, summary: e.target.value })}
                  placeholder="한두 줄 설명"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">강조 라인 (파란색)</label>
                <input
                  type="text"
                  value={draft.highlight ?? ''}
                  onChange={e => setDraft({ ...draft, highlight: e.target.value })}
                  placeholder="요즘 많이 힘드신 자영업자분들을 위해 무료로 제공합니다. 힘내세요!"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">배포일자 *</label>
                  <input
                    type="date"
                    value={draft.released_at ?? ''}
                    onChange={e => setDraft({ ...draft, released_at: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">분류</label>
                  <select
                    value={draft.category ?? 'feature'}
                    onChange={e => setDraft({ ...draft, category: e.target.value as UpdateRow['category'] })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="feature">NEW (신기능)</option>
                    <option value="fix">FIX (개선)</option>
                    <option value="notice">공지</option>
                    <option value="beta">BETA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">정렬 (큰 수가 위)</label>
                  <input
                    type="number"
                    value={draft.sort_order ?? 0}
                    onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">활성 여부</label>
                  <select
                    value={draft.active === false ? 'off' : 'on'}
                    onChange={e => setDraft({ ...draft, active: e.target.value === 'on' })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="on">ON · 노출</option>
                    <option value="off">OFF · 숨김</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">링크 URL (선택)</label>
                <input
                  type="url"
                  value={draft.link_url ?? ''}
                  onChange={e => setDraft({ ...draft, link_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDraft(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                disabled={saving}
              >취소</button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
