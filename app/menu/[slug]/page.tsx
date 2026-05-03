'use client'

// ============================================================
// /menu/[slug] — 손님용 공개 디지털 메뉴판
//   · 카테고리 필터 + 다국어 토글 + 검색
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Search, Globe, Star, X, UtensilsCrossed } from 'lucide-react'

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const LANGS: { k: Lang; flag: string; name: string }[] = [
  { k: 'ko', flag: '🇰🇷', name: '한국어' },
  { k: 'en', flag: '🇺🇸', name: 'English' },
  { k: 'ja', flag: '🇯🇵', name: '日本語' },
  { k: 'zh', flag: '🇨🇳', name: '中文' },
]

// 가격 단위는 항상 한국 원 (외국인도 한국에서 결제하므로 통일)
const UI_TEXT: Record<Lang, any> = {
  ko: { search: '메뉴 검색', all: '전체', signature: '대표 메뉴', new: '신메뉴', soldout: '품절' },
  en: { search: 'Search menu', all: 'All', signature: 'Signature', new: 'NEW', soldout: 'Sold Out' },
  ja: { search: 'メニュー検索', all: 'すべて', signature: '看板メニュー', new: 'NEW', soldout: '売り切れ' },
  zh: { search: '搜索菜单', all: '全部', signature: '招牌菜', new: '新品', soldout: '售罄' },
}

export default function MenuPage() {
  const params = useParams()
  const slug = String(params?.slug || '')
  const [items, setItems] = useState<any[]>([])
  const [store, setStore] = useState<any>(null)
  const [theme, setTheme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('ko')
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/menu/public?slug=${slug}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setItems(j.items || [])
          setStore(j.store)
          setTheme(j.theme)
        }
      })
      .finally(() => setLoading(false))
  }, [slug])

  const t = UI_TEXT[lang]

  const categories = useMemo(() => {
    const cats = new Set<string>()
    items.forEach(it => it.category && cats.add(it.category))
    return Array.from(cats)
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (activeCat !== 'all') list = list.filter(it => it.category === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(it =>
        (it.name_ko || '').toLowerCase().includes(q) ||
        (it[`name_${lang}`] || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, activeCat, search, lang])

  const groupedByCategory = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const it of filtered) {
      const cat = it.category || (lang === 'ko' ? '메뉴' : 'Menu')
      if (!g[cat]) g[cat] = []
      g[cat].push(it)
    }
    return g
  }, [filtered, lang])

  const getName = (it: any) => it[`name_${lang}`] || it.name_ko
  const getDesc = (it: any) => it[`desc_${lang}`] || it.desc_ko

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full" /></div>
  }

  if (!store || items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-sm font-bold text-[#191F28] mb-1">메뉴가 등록되지 않았어요</p>
          <p className="text-xs text-[#8B95A1]">잠시 후 다시 확인해주세요</p>
        </div>
      </div>
    )
  }

  // 테마 색상 적용 (없으면 기본 흰색)
  const th = theme || {
    primary_color: '#3182F6',
    accent_color: '#7C3AED',
    bg_color: '#FFFFFF',
    surface_color: '#F8FAFB',
    text_color: '#191F28',
    text_muted: '#8B95A1',
    border_color: '#E5E8EB',
    card_style: 'minimal',
    header_style: 'gradient',
  }
  const headerBg = th.header_style === 'gradient'
    ? `linear-gradient(135deg, ${th.primary_color}, ${th.accent_color})`
    : th.header_style === 'solid' ? th.primary_color : th.surface_color

  return (
    <div className="min-h-screen" style={{ background: th.bg_color }}>
      {/* 상단 헤더 — 테마 적용 */}
      <header className="sticky top-0 z-40 border-b" style={{ background: headerBg, borderColor: th.border_color }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <h1 className="text-base font-black truncate" style={{ color: t.header_style === 'gradient' || t.header_style === 'solid' ? '#fff' : t.text_color }}>{store.name}</h1>
              <p className="text-[10px]" style={{ color: t.header_style === 'gradient' || t.header_style === 'solid' ? 'rgba(255,255,255,0.8)' : t.text_muted }}>디지털 메뉴판</p>
            </div>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Lang)}
              className="text-xs rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(255,255,255,0.95)', border: `1px solid ${t.border_color}`, color: t.text_color }}>
              {LANGS.map(l => <option key={l.k} value={l.k}>{l.flag} {l.name}</option>)}
            </select>
          </div>

          {/* 검색 */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F2F4F6] border border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
            />
          </div>

          {/* 카테고리 탭 */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <button onClick={() => setActiveCat('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  activeCat === 'all' ? 'bg-[#191F28] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                }`}>{t.all}</button>
              {categories.map(c => (
                <button key={c} onClick={() => setActiveCat(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    activeCat === c ? 'bg-[#191F28] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                  }`}>{c}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* 메뉴 그리드 */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {Object.keys(groupedByCategory).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm text-[#8B95A1]">검색 결과가 없어요</p>
          </div>
        ) : Object.entries(groupedByCategory).map(([cat, list]) => (
          <section key={cat} className="mb-6">
            <h2 className="text-sm font-black text-[#191F28] mb-3 px-1">{cat}</h2>
            <div className="grid grid-cols-1 gap-3">
              {list.map((it: any) => (
                <button key={it.id} onClick={() => setSelected(it)} className="text-left">
                  <div className={`flex gap-3 p-3 rounded-2xl border bg-white hover:border-[#3182F6] transition-colors ${it.is_soldout ? 'opacity-50' : ''}`}>
                    {it.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={it.image_url} alt={getName(it)} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed size={24} className="text-[#3182F6]" strokeWidth={2} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1 flex-wrap mb-1">
                        <p className="text-sm font-bold text-[#191F28] line-clamp-1 flex-1">{getName(it)}</p>
                        {it.is_signature && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                            <Star size={8} fill="#92400E" /> {t.signature}
                          </span>
                        )}
                        {it.is_new && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">{t.new}</span>}
                        {it.is_soldout && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]">{t.soldout}</span>}
                      </div>
                      {getDesc(it) && <p className="text-[11px] text-[#8B95A1] line-clamp-2 mb-1">{getDesc(it)}</p>}
                      <p className="text-base font-black text-[#191F28]">{it.price.toLocaleString('ko-KR')}<span className="text-xs font-medium text-[#8B95A1] ml-0.5">원</span></p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* 메뉴 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selected.image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selected.image_url} alt={getName(selected)} className="w-full aspect-square object-cover" />
            )}
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
              <X size={18} />
            </button>
            <div className="p-5">
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <h3 className="text-lg font-black text-[#191F28] flex-1">{getName(selected)}</h3>
                {selected.is_signature && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">⭐ {t.signature}</span>}
                {selected.is_new && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">{t.new}</span>}
              </div>
              <p className="text-2xl font-black text-[#3182F6] mb-3">{selected.price.toLocaleString('ko-KR')}원</p>
              {getDesc(selected) && <p className="text-sm text-[#4E5968] leading-relaxed">{getDesc(selected)}</p>}
              {selected.is_soldout && <p className="text-sm font-bold text-[#DC2626] mt-3">{t.soldout}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="text-center py-4 text-[10px] text-[#C9CDD2]">
        Powered by 로컬루션 · localution.co.kr
      </footer>
    </div>
  )
}
