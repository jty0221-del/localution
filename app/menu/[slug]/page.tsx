'use client'

// ============================================================
// /menu/[slug] — 진짜 인쇄 메뉴판 같은 프리미엄 디지털 메뉴판
//   · 단일 프리미엄 디자인 (옵션 없음, 누구나 멋있게)
//   · Serif 헤더 + 장식 라인 + 점선 가격 leader + 시그니처 사진
// ============================================================
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Star, Sparkles, MapPin, Phone } from 'lucide-react'

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const LANGS: { k: Lang; label: string }[] = [
  { k: 'ko', label: '한국어' },
  { k: 'en', label: 'English' },
  { k: 'ja', label: '日本語' },
  { k: 'zh', label: '中文' },
]

const UI_TEXT: Record<Lang, any> = {
  ko: { signature: '대표 메뉴', new: 'NEW', soldout: '품절', menu: 'MENU', subtitle: '오늘도 정성껏 준비했습니다', thanks: 'THANK YOU' },
  en: { signature: 'SIGNATURE', new: 'NEW', soldout: 'SOLD OUT', menu: 'MENU', subtitle: 'Crafted with care', thanks: 'THANK YOU' },
  ja: { signature: '看板メニュー', new: 'NEW', soldout: '売り切れ', menu: 'MENU', subtitle: '心を込めて', thanks: 'ありがとう' },
  zh: { signature: '招牌菜', new: '新品', soldout: '售罄', menu: 'MENU', subtitle: '用心烹制', thanks: 'THANK YOU' },
}

export default function MenuPage() {
  const params = useParams()
  // useParams가 Next 버전에 따라 인코딩 또는 디코딩 형태로 줄 수 있음 — 항상 디코딩된 형태로 통일
  const rawSlug = String(params?.slug || '')
  let slug = rawSlug
  try { slug = decodeURIComponent(rawSlug) } catch { /* 이미 디코딩 상태면 그대로 */ }
  const [items, setItems] = useState<any[]>([])
  const [store, setStore] = useState<any>(null)
  const [theme, setTheme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('ko')

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    const url = `/api/menu/public?slug=${encodeURIComponent(slug)}&_=${Date.now()}`
    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        console.log('[menu]', j.ok, 'items:', j.items?.length, 'store:', j.store?.name)
        if (j.ok) {
          setItems(j.items || [])
          setStore(j.store)
          setTheme(j.theme)
        }
      })
      .catch(err => console.error('[menu] fetch err:', err))
      .finally(() => setLoading(false))
  }, [slug])

  const t = UI_TEXT[lang]

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const it of items) {
      const cat = it.category || (lang === 'ko' ? '메뉴' : 'Menu')
      if (!g[cat]) g[cat] = []
      g[cat].push(it)
    }
    return g
  }, [items, lang])

  const getName = (it: any) => it[`name_${lang}`] || it.name_ko
  const getDesc = (it: any) => it[`desc_${lang}`] || it.desc_ko

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#1F1612] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!store || items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#92400E] to-[#78350F] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <p className="text-base font-bold text-[#1F1612] mb-1">메뉴 준비 중</p>
          <p className="text-xs text-[#78716C]">잠시 후 다시 확인해 주세요</p>
        </div>
      </div>
    )
  }

  // 테마 색상 — 사장님이 고른 색이 있으면 적용, 없으면 기본 따뜻한 베이지+갈색
  const TH = {
    primary: theme?.primary_color || '#1F1612',
    accent: theme?.accent_color || '#92400E',
    bg: theme?.bg_color || '#FAF6F0',
    surface: theme?.surface_color || '#FFFFFF',
    text: theme?.text_color || '#1F1612',
    muted: theme?.text_muted || '#78716C',
    border: theme?.border_color || '#D6D3D1',
  }

  return (
    <div className="min-h-screen" style={{ background: TH.bg, fontFamily: '"Noto Serif KR", "Nanum Myeongjo", serif' }}>
      {/* 상단 작은 언어 선택 (방해 안 되게 우측 정렬) */}
      <div className="sticky top-0 z-30 px-5 py-2.5 flex items-center justify-end backdrop-blur-md" style={{ background: `${TH.bg}E0`, borderBottom: `1px solid ${TH.border}80` }}>
        <select
          value={lang}
          onChange={e => setLang(e.target.value as Lang)}
          className="text-[11px] font-bold rounded-md px-2 py-1 outline-none cursor-pointer"
          style={{ background: 'transparent', color: TH.muted, border: `1px solid ${TH.border}` }}>
          {LANGS.map(l => <option key={l.k} value={l.k}>{l.label}</option>)}
        </select>
      </div>

      {/* 매장 헤더 — 양옆 장식 라인 + 큰 매장명 + MENU 라벨 */}
      <header className="relative px-5 pt-12 pb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="flex-1 max-w-20 h-[1px]" style={{ background: TH.muted, opacity: 0.5 }} />
          <span className="text-[10px] tracking-[0.5em] font-bold" style={{ color: TH.accent }}>{t.menu}</span>
          <span className="flex-1 max-w-20 h-[1px]" style={{ background: TH.muted, opacity: 0.5 }} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2" style={{ color: TH.text }}>
          {store.name}
        </h1>
        <p className="text-xs italic" style={{ color: TH.muted }}>{t.subtitle}</p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TH.accent }} />
          <span className="w-12 h-[1px]" style={{ background: TH.accent, opacity: 0.6 }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TH.accent }} />
          <span className="w-12 h-[1px]" style={{ background: TH.accent, opacity: 0.6 }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TH.accent }} />
        </div>
      </header>

      {/* 메뉴 본문 */}
      <main className="max-w-2xl mx-auto px-5 md:px-8 pb-16">
        {Object.entries(grouped).map(([cat, list]) => {
          // 시그니처 메뉴는 별도 사진 카드, 일반 메뉴는 점선 leader 리스트
          const sig = list.filter((it: any) => it.is_signature && it.image_url)
          const others = list.filter((it: any) => !sig.includes(it))

          return (
            <section key={cat} className="mb-14">
              {/* 카테고리 타이틀 — 한글 + 영문 부제 */}
              <div className="text-center mb-7">
                <h2 className="text-2xl md:text-3xl font-black tracking-wide mb-1" style={{ color: TH.text }}>
                  {cat}
                </h2>
                <div className="flex items-center justify-center gap-2.5">
                  <span className="w-10 h-[1px]" style={{ background: TH.muted, opacity: 0.4 }} />
                  <span className="text-[10px] tracking-[0.4em] font-bold" style={{ color: TH.accent }}>
                    {(cat || '').toUpperCase().slice(0, 14)}
                  </span>
                  <span className="w-10 h-[1px]" style={{ background: TH.muted, opacity: 0.4 }} />
                </div>
              </div>

              {/* 시그니처 메뉴 — 사진 큼직하게 */}
              {sig.length > 0 && (
                <div className={`grid gap-4 mb-6 ${sig.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {sig.map((it: any) => (
                    <article key={it.id} className="rounded-2xl overflow-hidden shadow-sm" style={{ background: TH.surface, border: `1px solid ${TH.border}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.image_url} alt={getName(it)} className={`w-full object-cover ${it.is_soldout ? 'opacity-40 grayscale' : ''}`} style={{ aspectRatio: '4/3' }} />
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded" style={{ background: TH.accent, color: '#fff' }}>
                            <Star size={10} fill="#fff" strokeWidth={0} /> {t.signature}
                          </span>
                          {it.is_new && <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded" style={{ background: TH.text, color: TH.bg }}>{t.new}</span>}
                          {it.is_soldout && <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded" style={{ background: '#9CA3AF', color: '#fff' }}>{t.soldout}</span>}
                        </div>
                        <h3 className="text-lg font-black mb-1" style={{ color: TH.text }}>{getName(it)}</h3>
                        {getDesc(it) && <p className="text-[12px] leading-relaxed mb-3 italic" style={{ color: TH.muted }}>{getDesc(it)}</p>}
                        <div className="flex items-baseline justify-between pt-2 border-t" style={{ borderColor: TH.border }}>
                          <span className="text-[10px] tracking-[0.3em] font-bold" style={{ color: TH.muted }}>PRICE</span>
                          <span className="text-xl font-black" style={{ color: TH.accent }}>{it.price.toLocaleString('ko-KR')}<span className="text-sm font-bold ml-0.5" style={{ color: TH.text }}>원</span></span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* 일반 메뉴 — 점선 leader 정갈한 리스트 */}
              {others.length > 0 && (
                <ul className="space-y-4">
                  {others.map((it: any) => (
                    <li key={it.id} className={it.is_soldout ? 'opacity-50' : ''}>
                      <div className="flex items-center gap-3">
                        {it.image_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={it.image_url} alt={getName(it)} className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover flex-shrink-0" style={{ border: `1px solid ${TH.border}` }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-base md:text-lg whitespace-nowrap" style={{ color: TH.text }}>
                              {getName(it)}
                            </span>
                            {it.is_new && <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: TH.text, color: TH.bg }}>{t.new}</span>}
                            {it.is_soldout && <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: '#9CA3AF', color: '#fff' }}>{t.soldout}</span>}
                            <span className="flex-1 border-b border-dotted mx-1 mb-1.5" style={{ borderColor: TH.muted, opacity: 0.5 }} />
                            <span className="font-black text-base md:text-lg whitespace-nowrap" style={{ color: TH.accent }}>
                              {it.price.toLocaleString('ko-KR')}<span className="text-xs font-bold ml-0.5" style={{ color: TH.text }}>원</span>
                            </span>
                          </div>
                          {getDesc(it) && (
                            <p className="text-[11px] mt-0.5 italic line-clamp-1" style={{ color: TH.muted }}>
                              — {getDesc(it)}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </main>

      {/* 푸터 — 매장 정보 + THANK YOU */}
      <footer className="border-t pt-10 pb-12 px-5 text-center" style={{ borderColor: TH.border }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="w-10 h-[1px]" style={{ background: TH.accent, opacity: 0.6 }} />
          <span className="text-[10px] tracking-[0.5em] font-bold" style={{ color: TH.accent }}>{t.thanks}</span>
          <span className="w-10 h-[1px]" style={{ background: TH.accent, opacity: 0.6 }} />
        </div>
        <p className="text-base font-black mb-2" style={{ color: TH.text }}>{store.name}</p>
        <div className="space-y-1 text-[11px]" style={{ color: TH.muted }}>
          {store.address && (
            <p className="flex items-center justify-center gap-1.5">
              <MapPin size={11} strokeWidth={2} />
              <span>{store.address}</span>
            </p>
          )}
          {store.phone && (
            <p className="flex items-center justify-center gap-1.5">
              <Phone size={11} strokeWidth={2} />
              <span>{store.phone}</span>
            </p>
          )}
        </div>
        <p className="text-[9px] mt-6 tracking-wider" style={{ color: TH.muted, opacity: 0.6 }}>
          Powered by 로컬루션 · localution.co.kr
        </p>
      </footer>
    </div>
  )
}
