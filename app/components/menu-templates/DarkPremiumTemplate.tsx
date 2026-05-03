'use client'

// 블랙 프리미엄 — 양꼬치/이자카야/오마카세 스타일
// 검정 배경 + 화이트 + 골드 강조 + 한/영 병기

type Theme = {
  primary_color: string
  accent_color: string
  bg_color: string
  surface_color: string
  text_color: string
  text_muted: string
  border_color: string
}

export default function DarkPremiumTemplate({
  store, items, theme, getName, getDesc,
}: {
  store: any
  items: any[]
  theme: Theme
  getName: (it: any) => string
  getDesc: (it: any) => string
  t: any
}) {
  const grouped: Record<string, any[]> = {}
  for (const it of items) {
    const cat = it.category || '메뉴'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(it)
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: theme.bg_color, color: theme.text_color }}>
      {/* 헤더 */}
      <header className="text-center py-10 px-4 border-b" style={{ borderColor: theme.border_color }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="w-10 h-[1px]" style={{ background: theme.accent_color }} />
          <span className="text-[10px] tracking-[0.5em] font-bold" style={{ color: theme.accent_color }}>MENU</span>
          <span className="w-10 h-[1px]" style={{ background: theme.accent_color }} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-wide" style={{ color: theme.text_color }}>
          {store.name}
        </h1>
        {store.address && <p className="text-[11px] mt-2 tracking-wider" style={{ color: theme.text_muted }}>{store.address}</p>}
      </header>

      <div className="max-w-2xl mx-auto px-5 md:px-10 py-8">
        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="mb-12">
            {/* 카테고리 헤더 — 골드 라인 */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-black tracking-[0.3em] mb-1" style={{ color: theme.accent_color }}>
                {cat.toUpperCase()}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-12 h-[2px]" style={{ background: theme.accent_color }} />
                <span className="text-[10px] tracking-widest" style={{ color: theme.text_muted }}>{cat}</span>
              </div>
            </div>

            {/* 메뉴 리스트 — 점선 leader */}
            <ul className="space-y-5">
              {list.map((it: any) => (
                <li key={it.id} className="group">
                  <div className="flex items-start gap-4">
                    {it.image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.image_url}
                        alt={getName(it)}
                        className="w-16 h-16 md:w-20 md:h-20 rounded object-cover flex-shrink-0"
                        style={{ border: `1px solid ${theme.border_color}` }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-base md:text-lg" style={{ color: theme.text_color }}>
                          {getName(it)}
                        </span>
                        <span
                          className="flex-1 border-b border-dotted mx-1 mb-1.5"
                          style={{ borderColor: theme.text_muted, opacity: 0.4 }}
                        />
                        <span className="font-bold text-base md:text-lg whitespace-nowrap" style={{ color: theme.accent_color }}>
                          {it.price.toLocaleString('ko-KR')}
                        </span>
                      </div>
                      {/* 영문/설명 */}
                      {(it.name_en || getDesc(it)) && (
                        <p className="text-[11px] mt-0.5 italic tracking-wide" style={{ color: theme.text_muted }}>
                          {it.name_en && <span>{it.name_en}</span>}
                          {it.name_en && getDesc(it) && <span> · </span>}
                          {getDesc(it) && <span>{getDesc(it).slice(0, 50)}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* 푸터 장식 */}
        <div className="text-center mt-16">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-12 h-[1px]" style={{ background: theme.accent_color }} />
            <span className="text-[10px] tracking-[0.4em]" style={{ color: theme.accent_color }}>THANK YOU</span>
            <span className="w-12 h-[1px]" style={{ background: theme.accent_color }} />
          </div>
          <p className="text-[10px] tracking-wider" style={{ color: theme.text_muted }}>* All prices include VAT *</p>
        </div>
      </div>
    </div>
  )
}
