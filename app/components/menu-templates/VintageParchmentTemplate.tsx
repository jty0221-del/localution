'use client'

// 빈티지 양피지 — 왕십리연탄집/김밥/한우 스타일
// 크라프트지 배경 + 검정박스 카테고리 + Serif 폰트

type Theme = {
  primary_color: string
  accent_color: string
  bg_color: string
  surface_color: string
  text_color: string
  text_muted: string
  border_color: string
}

export default function VintageParchmentTemplate({
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
    <div className="min-h-screen pb-12" style={{ background: theme.bg_color, fontFamily: 'serif' }}>
      {/* 거친 종이 질감 효과 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(120,53,15,0.15) 1px, transparent 2px), radial-gradient(circle at 80% 70%, rgba(120,53,15,0.1) 1px, transparent 2px)',
          backgroundSize: '40px 40px, 60px 60px',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-5 py-8">
        {/* 헤더 — 양 옆 장식선 */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.4 }} />
            <span className="text-[10px] tracking-[0.3em] font-bold" style={{ color: theme.text_muted }}>SINCE</span>
            <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.4 }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: theme.text_color }}>
            {store.name}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.4 }} />
            <span className="text-[10px] tracking-[0.3em] font-bold" style={{ color: theme.text_muted }}>MENU</span>
            <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.4 }} />
          </div>
          {store.address && <p className="text-[11px] mt-3 italic" style={{ color: theme.text_muted }}>{store.address}</p>}
        </header>

        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="mb-10">
            {/* 검정 박스 카테고리 */}
            <div className="mb-5">
              <div
                className="inline-block px-5 py-1.5 text-base font-black tracking-wider"
                style={{ background: theme.text_color, color: theme.bg_color }}
              >
                {cat}
              </div>
            </div>

            {/* 메뉴 리스트 — 점선 leader */}
            <ul className="space-y-3">
              {list.map((it: any) => (
                <li key={it.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-base" style={{ color: theme.text_color }}>
                      {getName(it)}
                    </span>
                    <span
                      className="flex-1 border-b border-dotted mx-1 mb-1"
                      style={{ borderColor: theme.text_muted, opacity: 0.6 }}
                    />
                    <span className="font-bold text-base whitespace-nowrap" style={{ color: theme.text_color }}>
                      {it.price.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                  {getDesc(it) && (
                    <p className="text-[11px] mt-0.5 italic" style={{ color: theme.text_muted }}>
                      — {getDesc(it).slice(0, 50)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* 하단 양 끝 장식 */}
        <div className="flex items-center justify-center gap-3 mt-12">
          <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.3 }} />
          <span className="text-[9px] tracking-[0.4em]" style={{ color: theme.text_muted }}>THANK YOU</span>
          <span className="flex-1 h-[1px]" style={{ background: theme.text_color, opacity: 0.3 }} />
        </div>
      </div>
    </div>
  )
}
