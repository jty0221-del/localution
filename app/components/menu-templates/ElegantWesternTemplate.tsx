'use client'

// 엘레강스 양식 — 파스타/스테이크/카페 스타일
// 화이트 베이스 + Cursive 영문 헤더 + Signature 도장 + 장식 프레임

type Theme = {
  primary_color: string
  accent_color: string
  bg_color: string
  surface_color: string
  text_color: string
  text_muted: string
  border_color: string
}

export default function ElegantWesternTemplate({
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
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-10">
        {/* 장식 프레임 헤더 */}
        <header className="text-center mb-10 relative">
          <div className="absolute inset-x-0 top-1/2 h-[1px]" style={{ background: theme.text_color, opacity: 0.2 }} />
          <div className="relative inline-block px-8 py-4" style={{ background: theme.bg_color }}>
            <p
              className="text-xs tracking-[0.5em] font-bold mb-2"
              style={{ color: theme.primary_color }}
            >
              MENU
            </p>
            <h1 className="text-3xl md:text-4xl font-black mb-1" style={{ color: theme.text_color }}>
              {store.name}
            </h1>
            <p
              className="text-sm italic"
              style={{ color: theme.text_muted, fontFamily: '"Brush Script MT", cursive' }}
            >
              Bon Appétit
            </p>
          </div>
        </header>

        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="mb-12">
            {/* 카테고리 — 영문 cursive + 한글 부제 */}
            <div className="text-center mb-6">
              <h2
                className="text-2xl md:text-3xl mb-1"
                style={{
                  color: theme.primary_color,
                  fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
                }}
              >
                {cat}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="w-8 h-[1px]" style={{ background: theme.text_muted, opacity: 0.5 }} />
                <span className="text-[10px] tracking-[0.4em]" style={{ color: theme.text_muted }}>
                  {cat.toUpperCase()}
                </span>
                <span className="w-8 h-[1px]" style={{ background: theme.text_muted, opacity: 0.5 }} />
              </div>
            </div>

            {/* 메뉴 카드 */}
            <ul className="space-y-4">
              {list.map((it: any) => (
                <li
                  key={it.id}
                  className="rounded-lg p-4"
                  style={{ background: theme.surface_color, border: `1px solid ${theme.border_color}` }}
                >
                  <div className="flex items-start gap-4">
                    {it.image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.image_url}
                        alt={getName(it)}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="font-bold text-base" style={{ color: theme.text_color }}>
                          {getName(it)}
                        </h3>
                        {it.is_signature && (
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: theme.accent_color, color: '#fff' }}
                          >
                            SIGNATURE
                          </span>
                        )}
                      </div>
                      {it.name_en && (
                        <p
                          className="text-xs italic mb-1"
                          style={{ color: theme.text_muted, fontFamily: '"Brush Script MT", cursive' }}
                        >
                          {it.name_en}
                        </p>
                      )}
                      {getDesc(it) && (
                        <p className="text-[11px] leading-relaxed mb-2" style={{ color: theme.text_muted }}>
                          {getDesc(it).slice(0, 80)}
                        </p>
                      )}
                      <p className="text-base font-black" style={{ color: theme.primary_color }}>
                        {it.price.toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Signature 도장 */}
        <div className="text-center mt-12">
          <div
            className="inline-block px-6 py-3 rounded-full"
            style={{
              border: `2px solid ${theme.primary_color}`,
              color: theme.primary_color,
              fontFamily: '"Brush Script MT", cursive',
            }}
          >
            <p className="text-base">{store.name} · Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}
