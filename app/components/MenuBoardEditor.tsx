'use client'

// ============================================================
// 사장님용 디지털 메뉴판 에디터
//   · 메뉴 CRUD + 네이버 자동 가져오기 + 다국어 입력
// ============================================================
import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit3, Save, Globe, Download, Image as ImageIcon, Star, Sparkles, Bookmark, Link2, FolderOpen, ClipboardList, Languages, AlertTriangle, MapPin, Check, CheckCircle2, RefreshCw, Clock } from 'lucide-react'
import MenuBookmarkletDialog from './MenuBookmarkletDialog'

type MenuItem = {
  id?: string
  category?: string | null
  name_ko: string
  name_en?: string | null
  name_ja?: string | null
  name_zh?: string | null
  desc_ko?: string | null
  desc_en?: string | null
  desc_ja?: string | null
  desc_zh?: string | null
  price: number
  image_url?: string | null
  is_signature?: boolean
  is_new?: boolean
  is_soldout?: boolean
  display_order?: number
}

const EMPTY_ITEM: MenuItem = {
  category: '',
  name_ko: '',
  price: 0,
  is_signature: false,
  is_new: false,
  is_soldout: false,
}

export default function MenuBoardEditor() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importPlaceId, setImportPlaceId] = useState('')
  const [importBookingId, setImportBookingId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<MenuItem[]>([])
  const [importErr, setImportErr] = useState('')
  const [importStatus, setImportStatus] = useState<'idle' | 'queued' | 'running' | 'success' | 'failed'>('idle')
  const [importMessage, setImportMessage] = useState('')
  const [activeLang, setActiveLang] = useState<'ko' | 'en' | 'ja' | 'zh'>('ko')
  const [translating, setTranslating] = useState(false)
  const [translateMsg, setTranslateMsg] = useState('')

  // Papago 자동 번역 — 한국어 → 영/일/중 동시
  async function autoTranslateAll() {
    if (!editing) return
    const koName = (editing as any).name_ko
    const koDesc = (editing as any).desc_ko
    if (!koName) {
      setTranslateMsg('한국어 메뉴 이름을 먼저 입력해주세요')
      setTimeout(() => setTranslateMsg(''), 3000)
      return
    }
    setTranslating(true)
    setTranslateMsg('Papago 번역 중...')

    const targets: { lang: 'en' | 'ja' | 'zh'; papago: string }[] = [
      { lang: 'en', papago: 'en' },
      { lang: 'ja', papago: 'ja' },
      { lang: 'zh', papago: 'zh-CN' },
    ]

    const updates: any = { ...editing }
    let okCount = 0

    for (const t of targets) {
      try {
        // 메뉴 이름
        const r1 = await fetch('/api/translate/papago', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: koName, source: 'ko', target: t.papago }),
        })
        const j1 = await r1.json()
        if (j1.ok) {
          updates['name_' + t.lang] = j1.translated
          okCount++
        }

        // 설명 (있으면)
        if (koDesc) {
          const r2 = await fetch('/api/translate/papago', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: koDesc, source: 'ko', target: t.papago }),
          })
          const j2 = await r2.json()
          if (j2.ok) {
            updates['desc_' + t.lang] = j2.translated
          }
        }
      } catch (_) {}
    }

    setEditing(updates)
    setTranslating(false)
    setTranslateMsg(okCount > 0 ? `번역 완료 (${okCount}/3 언어)` : '번역 실패 — 잠시 후 재시도')
    setTimeout(() => setTranslateMsg(''), 4000)
  }

  // 단일 언어 번역
  async function autoTranslateOne(targetLang: 'en' | 'ja' | 'zh') {
    if (!editing) return
    const koName = (editing as any).name_ko
    const koDesc = (editing as any).desc_ko
    if (!koName) {
      setTranslateMsg('한국어 메뉴 이름 먼저 입력')
      setTimeout(() => setTranslateMsg(''), 3000)
      return
    }
    setTranslating(true)
    setTranslateMsg('번역 중...')
    const papagoTarget = targetLang === 'zh' ? 'zh-CN' : targetLang
    const updates: any = { ...editing }
    try {
      const r1 = await fetch('/api/translate/papago', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: koName, source: 'ko', target: papagoTarget }),
      })
      const j1 = await r1.json()
      if (j1.ok) updates['name_' + targetLang] = j1.translated

      if (koDesc) {
        const r2 = await fetch('/api/translate/papago', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: koDesc, source: 'ko', target: papagoTarget }),
        })
        const j2 = await r2.json()
        if (j2.ok) updates['desc_' + targetLang] = j2.translated
      }
      setEditing(updates)
      setTranslateMsg('번역 완료')
    } catch (_) {
      setTranslateMsg('번역 실패')
    } finally {
      setTranslating(false)
      setTimeout(() => setTranslateMsg(''), 3000)
    }
  }

  // 북마클릿 모드
  const [showBookmarklet, setShowBookmarklet] = useState(false)
  const [bmkToken, setBmkToken] = useState<string | null>(null)
  const [bmkImportId, setBmkImportId] = useState<string | null>(null)
  const [bmkPolling, setBmkPolling] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null)

  async function startBookmarkletFlow() {
    setImportErr('')
    try {
      const r = await fetch('/api/menu/import-bookmarklet/init', {
        method: 'POST',
        credentials: 'include',
      })
      const j = await r.json()
      if (!j.ok) {
        setImportErr(j.message || j.error || '토큰 생성 실패')
        return
      }
      setBmkToken(j.token)
      setBmkImportId(j.import_id)
      setShowBookmarklet(true)
    } catch (e) {
      setImportErr('네트워크 오류')
    }
  }

  function pollBookmarkletResult() {
    if (!bmkImportId || bmkPolling) return
    setBmkPolling(true)

    const startedAt = Date.now()
    const interval = setInterval(async () => {
      try {
        const r = await fetch('/api/menu/import-status?id=' + bmkImportId, { credentials: 'include' })
        const j = await r.json()
        if (j.ok && j.status === 'success') {
          clearInterval(interval)
          setBmkPolling(false)
          setShowBookmarklet(false)
          setLastSyncAt(j.completed_at || new Date().toISOString())

          // auto-sync 결과 감지 (error_message 에 통계 들어있음)
          if (j.error_message && j.error_message.startsWith('auto-sync:')) {
            setSyncResultMsg(j.error_message.replace('auto-sync: ', ''))
            setTimeout(() => setSyncResultMsg(null), 8000)
            // 메뉴 리스트 새로고침
            fetchItems()
          } else if (Array.isArray(j.items) && j.items.length > 0) {
            // preview 모드 → 미리보기 모달 띄움
            setImportPreview(j.items)
            setShowImport(true)
          }
        }
        if (Date.now() - startedAt > 30 * 60 * 1000) {
          clearInterval(interval)
          setBmkPolling(false)
        }
      } catch (_) {}
    }, 3000)
  }

  // "지금 동기화" 빠른 액션 — 토큰 발급 + 다이얼로그 직행
  async function quickSync() {
    setImportErr('')
    try {
      const r = await fetch('/api/menu/import-bookmarklet/init', {
        method: 'POST',
        credentials: 'include',
      })
      const j = await r.json()
      if (!j.ok) {
        setImportErr(j.message || j.error || '토큰 생성 실패')
        return
      }
      setBmkToken(j.token)
      setBmkImportId(j.import_id)
      setShowBookmarklet(true)
    } catch (_) {
      setImportErr('네트워크 오류')
    }
  }

  function formatRelTime(iso: string | null): string {
    if (!iso) return '없음'
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return '방금 전'
    if (min < 60) return min + '분 전'
    const hr = Math.floor(min / 60)
    if (hr < 24) return hr + '시간 전'
    const day = Math.floor(hr / 24)
    return day + '일 전'
  }

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const r = await fetch('/api/menu', { credentials: 'include' })
      const j = await r.json()
      if (j.ok) {
        setItems(j.items || [])
        setStore(j.store)
      }
    } finally { setLoading(false) }
  }

  function startEdit(item: MenuItem | null = null) {
    setEditing(item || { ...EMPTY_ITEM })
  }

  async function handleSave() {
    if (!editing || !editing.name_ko) return
    if (editing.id) {
      await fetch('/api/menu', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
    } else {
      await fetch('/api/menu', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
    }
    setEditing(null)
    await fetchItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('이 메뉴를 삭제하시겠어요?')) return
    await fetch('/api/menu?id=' + id, { method: 'DELETE', credentials: 'include' })
    await fetchItems()
  }

  async function handleNaverImport() {
    const id = importPlaceId.replace(/[^0-9]/g, '')
    if (!id) { setImportErr('네이버 placeId 를 입력해주세요'); return }
    setImporting(true)
    setImportErr('')
    setImportStatus('queued')
    setImportMessage('워커에 작업 요청 중...')
    try {
      const r = await fetch('/api/menu/import-naver', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: id, bookingBusinessId: importBookingId.replace(/[^0-9]/g, '') || null }),
      })
      const j = await r.json()
      if (!j.ok) {
        setImportErr(j.message || j.error || '작업 요청 실패')
        setImportStatus('failed')
        setImporting(false)
        return
      }

      const importId = j.import_id
      setImportMessage('네이버 세션으로 메뉴 페이지 접근 중... (10~30초 소요)')

      // 폴링 — 2초 간격, 최대 90초
      const startedAt = Date.now()
      const pollInterval = setInterval(async () => {
        try {
          const sr = await fetch(`/api/menu/import-status?id=${importId}`, { credentials: 'include' })
          const sj = await sr.json()
          if (!sj.ok) return

          if (sj.status === 'running') {
            setImportStatus('running')
            setImportMessage('네이버 인증 + 메뉴 추출 중...')
          } else if (sj.status === 'success') {
            clearInterval(pollInterval)
            setImportStatus('success')
            setImportMessage(`${(sj.items || []).length}개 메뉴를 가져왔어요!`)
            setImportPreview(sj.items || [])
            setImporting(false)
          } else if (sj.status === 'failed') {
            clearInterval(pollInterval)
            setImportStatus('failed')
            setImportErr(sj.error_message || sj.error_code || '가져오기 실패')
            setImporting(false)
          }

          if (Date.now() - startedAt > 130_000) {
            clearInterval(pollInterval)
            setImportStatus('failed')
            setImportErr('시간 초과 — 다시 시도해주세요')
            setImporting(false)
          }
        } catch (_) {}
      }, 2000)
    } catch (e) {
      setImportErr('네트워크 오류')
      setImportStatus('failed')
      setImporting(false)
    }
  }

  async function handleSaveImport() {
    if (importPreview.length === 0) return
    await fetch('/api/menu', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: importPreview }),
    })
    setShowImport(false)
    setImportPreview([])
    setImportPlaceId('')
    await fetchItems()
  }

  if (loading) {
    return <div className="bg-white rounded-2xl p-12 text-center shadow-sm"><div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full" /></div>
  }

  if (!store?.slug) {
    return (
      <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-6 border border-[#FCD34D]">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle size={14} className="text-[#92400E]" strokeWidth={2.5} />
          <p className="text-sm font-bold text-[#92400E]">매장 정보가 먼저 필요해요</p>
        </div>
        <p className="text-xs text-[#92400E]">"업체 설정" 탭에서 매장 정보를 입력해주세요.</p>
      </div>
    )
  }

  // 카테고리별 그룹
  const grouped: Record<string, MenuItem[]> = {}
  for (const it of items) {
    const cat = it.category || '메뉴'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(it)
  }

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${store.slug}`
    : `/menu/${store.slug}`

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#3182F6] flex items-center justify-center shadow-sm">
            <Globe size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-black text-[#191F28]">디지털 메뉴판</h2>
            <p className="text-[11px] text-[#8B95A1]">QR 스캔 → 모바일 메뉴 (다국어 지원)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={startBookmarkletFlow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] text-white text-xs font-bold hover:opacity-90 shadow-sm">
            <Bookmark size={12} strokeWidth={2.5} /> 북마클릿으로 가져오기
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#03C75A] text-white text-xs font-bold hover:opacity-90">
            <Download size={12} strokeWidth={2.5} /> 네이버 플레이스 메뉴 가져오기
          </button>
          <button
            onClick={() => startEdit()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#191F28] text-white text-xs font-bold">
            <Plus size={12} strokeWidth={2.5} /> 메뉴 추가
          </button>
        </div>
      </div>

      {/* URL 안내 */}
      <div className="p-3 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
        <div className="flex items-center gap-1.5 mb-1">
          <Link2 size={11} className="text-[#3182F6]" strokeWidth={2.5} />
          <p className="text-[10px] text-[#8B95A1]">손님이 스캔할 메뉴판 URL</p>
        </div>
        <p className="text-xs font-mono text-[#191F28] break-all">{menuUrl}</p>
      </div>

      {/* 빠른 동기화 + 결과 표시 */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] border border-[#BFDBFE] flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm flex-shrink-0">
              <RefreshCw size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1E40AF]">네이버 메뉴 자동 동기화</p>
              <p className="text-[10px] text-[#3182F6] flex items-center gap-1">
                <Clock size={9} strokeWidth={2.5} />
                마지막 동기화: {formatRelTime(lastSyncAt)}
              </p>
            </div>
          </div>
          <button
            onClick={quickSync}
            className="px-3 py-2 rounded-xl bg-[#191F28] text-white text-xs font-bold hover:bg-[#333D4B]">
            지금 동기화
          </button>
        </div>
      )}

      {syncResultMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F0FDF4] border-2 border-[#BBF7D0] animate-pulse">
          <CheckCircle2 size={14} className="text-[#059669]" strokeWidth={2.5} />
          <p className="text-xs font-bold text-[#065F46]">{syncResultMsg}</p>
        </div>
      )}

      {/* 메뉴 리스트 */}
      {items.length === 0 ? (
        <div className="bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] rounded-2xl p-10 text-center border border-[#E5E8EB]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={26} className="text-[#C9CDD2]" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-[#191F28] mb-1">아직 메뉴가 없어요</p>
          <p className="text-xs text-[#8B95A1] mb-4">"네이버에서 가져오기" 또는 "메뉴 추가" 버튼으로 시작하세요</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <FolderOpen size={14} className="text-[#3182F6]" strokeWidth={2.5} />
              <p className="text-sm font-black text-[#191F28]">{cat}</p>
            </div>
            <div className="space-y-2">
              {list.map(it => (
                <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFB] transition-colors">
                  {it.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.image_url} alt={it.name_ko} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#F2F4F6] flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={20} className="text-[#C9CDD2]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-sm font-bold text-[#191F28] truncate">{it.name_ko}</p>
                      {it.is_signature && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">대표</span>}
                      {it.is_new && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">NEW</span>}
                      {it.is_soldout && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]">품절</span>}
                    </div>
                    {it.desc_ko && <p className="text-[11px] text-[#8B95A1] truncate">{it.desc_ko}</p>}
                    <p className="text-xs font-bold text-[#3182F6]">{it.price.toLocaleString('ko-KR')}원</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(it)} className="w-8 h-8 rounded-lg bg-[#F2F4F6] hover:bg-[#E5E8EB] flex items-center justify-center">
                      <Edit3 size={12} className="text-[#4E5968]" />
                    </button>
                    <button onClick={() => it.id && handleDelete(it.id)} className="w-8 h-8 rounded-lg bg-[#FEE2E2] hover:bg-[#FECACA] flex items-center justify-center">
                      <Trash2 size={12} className="text-[#991B1B]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── 메뉴 편집 모달 ────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-[#191F28]">{editing.id ? '메뉴 수정' : '메뉴 추가'}</h3>
              <button onClick={() => setEditing(null)} className="text-[#8B95A1]">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">카테고리</label>
                  <input value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="예: 커피" className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">가격 *</label>
                  <input type="number" value={editing.price || ''} onChange={e => setEditing({ ...editing, price: parseInt(e.target.value, 10) || 0 })} placeholder="6000" className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">이미지 URL</label>
                <input value={editing.image_url || ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm" />
              </div>

              {/* 다국어 탭 + Papago 자동 번역 */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex gap-1 bg-[#F2F4F6] rounded-lg p-1 w-fit">
                    {[
                      { k: 'ko', l: '한국어' },
                      { k: 'en', l: 'EN' },
                      { k: 'ja', l: '日本' },
                      { k: 'zh', l: '中文' },
                    ].map(t => (
                      <button key={t.k} onClick={() => setActiveLang(t.k as any)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${activeLang === t.k ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1]'}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                  {activeLang === 'ko' ? (
                    <button
                      onClick={autoTranslateAll}
                      disabled={translating || !editing.name_ko}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-[#03C75A] to-[#059669] text-white text-[11px] font-bold disabled:opacity-50">
                      <Languages size={11} strokeWidth={2.5} />
                      {translating ? '번역 중...' : '영/일/중 자동 번역'}
                    </button>
                  ) : (
                    <button
                      onClick={() => autoTranslateOne(activeLang as 'en' | 'ja' | 'zh')}
                      disabled={translating || !editing.name_ko}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-[#03C75A] to-[#059669] text-white text-[11px] font-bold disabled:opacity-50">
                      <Languages size={11} strokeWidth={2.5} />
                      {translating ? '번역 중...' : '한국어에서 번역'}
                    </button>
                  )}
                </div>
                {translateMsg && (
                  <p className="text-[10px] text-[#3182F6] mb-2 px-1">{translateMsg}</p>
                )}
                <div className="space-y-2">
                  <input
                    value={(editing as any)['name_' + activeLang] || ''}
                    onChange={e => setEditing({ ...editing, ['name_' + activeLang]: e.target.value })}
                    placeholder={activeLang === 'ko' ? '메뉴 이름 *' : '번역 (자동 번역 가능)'}
                    className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
                  />
                  <textarea
                    value={(editing as any)['desc_' + activeLang] || ''}
                    onChange={e => setEditing({ ...editing, ['desc_' + activeLang]: e.target.value })}
                    placeholder="설명 (선택)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!editing.is_signature} onChange={e => setEditing({ ...editing, is_signature: e.target.checked })} />
                  <span>대표 메뉴</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!editing.is_new} onChange={e => setEditing({ ...editing, is_new: e.target.checked })} />
                  <span>NEW</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!editing.is_soldout} onChange={e => setEditing({ ...editing, is_soldout: e.target.checked })} />
                  <span>품절</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] font-bold text-sm">취소</button>
                <button onClick={handleSave} disabled={!editing.name_ko} className="py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm disabled:opacity-50">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 네이버 임포트 모달 ────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#03C75A] to-[#059669] flex items-center justify-center">
                  <Download size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-black text-[#191F28]">네이버 메뉴 가져오기</h3>
              </div>
              <button onClick={() => { setShowImport(false); setImportPreview([]); setImportErr('') }} className="text-[#8B95A1]">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <p className="text-xs text-[#065F46] leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-bold"><MapPin size={11} strokeWidth={2.5} /> placeId 찾는 법</span><br/>
                  네이버 플레이스 URL 의 숫자 (예: <span className="font-mono">place/<b>10441797</b>/menu</span>)
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">네이버 placeId *</label>
                <input value={importPlaceId} onChange={e => setImportPlaceId(e.target.value)} placeholder="10441797" className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#03C75A] focus:bg-white outline-none text-base" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">bookingBusinessId (선택)</label>
                <input value={importBookingId} onChange={e => setImportBookingId(e.target.value)} placeholder="1289786" className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#03C75A] focus:bg-white outline-none text-base" />
                <p className="text-[10px] text-[#8B95A1] mt-0.5">smartplace URL 의 bookingBusinessId 파라미터</p>
              </div>

              {importErr && <p className="text-xs text-[#DC2626]">{importErr}</p>}

              {importStatus !== 'idle' && importStatus !== 'success' && importStatus !== 'failed' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                  <div className="animate-spin w-4 h-4 border-2 border-[#3182F6] border-t-transparent rounded-full" />
                  <p className="text-xs text-[#1E40AF] font-medium">{importMessage}</p>
                </div>
              )}

              {importPreview.length === 0 ? (
                <button onClick={handleNaverImport} disabled={importing || !importPlaceId} className="w-full py-3 rounded-xl bg-[#03C75A] text-white font-bold text-sm disabled:opacity-50">
                  {importing ? '가져오는 중...' : '네이버에서 메뉴 가져오기'}
                </button>
              ) : (
                <>
                  <div className="bg-[#F0FDF4] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={12} className="text-[#065F46]" strokeWidth={2.5} />
                      <p className="text-xs font-bold text-[#065F46]">{importPreview.length}개 메뉴를 찾았어요</p>
                    </div>
                    <p className="text-[10px] text-[#065F46]">아래 미리보기를 확인하고 저장하세요.</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5">
                    {importPreview.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FAFB]">
                        {it.image_url ? <img src={it.image_url} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-[#F2F4F6]" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#191F28] truncate">{it.name_ko}</p>
                          <p className="text-[10px] text-[#3182F6]">{it.price.toLocaleString('ko-KR')}원</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setImportPreview([])} className="py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] font-bold text-sm">다시 시도</button>
                    <button onClick={handleSaveImport} className="py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm">전체 저장</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 번역 안내 (Phase 2B) */}
      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#191F28] mb-1">AI 자동 번역 (개발 중)</p>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              한국어 메뉴를 입력하면 영어·일본어·중국어로 자동 번역하는 기능이 곧 추가됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 북마클릿 다이얼로그 */}
      <MenuBookmarkletDialog
        open={showBookmarklet}
        onClose={() => { setShowBookmarklet(false); setBmkPolling(false) }}
        importId={bmkImportId}
        token={bmkToken}
        pollSuccess={pollBookmarkletResult}
      />
    </div>
  )
}
