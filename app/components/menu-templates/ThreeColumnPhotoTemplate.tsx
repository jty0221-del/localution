'use client'

// 3컬럼 사진 그리드 — 돈까스/일식/세트메뉴 스타일
// 3분할 사진 박스 + 한/영 병기 카테고리

type Theme = {
  primary_color: string
  accent_color: string
  bg_color: string
  surface_color: string
  text_color: string
  text_muted: string
  border_color: string
}

export default function ThreeColumnPhotoTemplate({
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
    <div className="min-h-screen pb-12" style={{ background: theme.bg_color }}>
      {/* 헤더 */}
      <header
        className="py-6 px-4 text-center"
        style={{ background: theme.primary_color, color: '#fff' }}
      >
        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">{store.name}</h1>
        <p className="text-[11px] tracking-[0.3em] opacity-90">SET MENU · LUNCH</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="mb-10">
            {/* 카테고리 — 한/영 병기 박스 */}
            <div className="mb-5 flex items-center gap-3">
              <div
                className="px-4 py-2 font-black tracking-wider text-base"
                style={{ background: theme.text_color, color: theme.bg_color }}
              >
                {cat}
              </div>
              <span className="text-[11px] tracking-[0.3em] font-bold" style={{ color: theme.text_muted }}>
                {cat.toUpperCase()}
              </span>
              <span className="flex-1 h-[2px]" style={{ background: theme.text_color }} />
            </div>

            {/* 3컬럼 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {list.map((it: any) => (
                <div
                  key={it.id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: theme.surface_color,
                    border: `1px solid ${theme.border_color}`,
                  }}
                >
                  {/* 사진 박스 */}
                  {it.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.image_url}
                      alt={getName(it)}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div
                      className="w-full aspect-square flex items-center justify-center text-xs"
                      style={{ background: theme.surface_color, color: theme.text_muted }}
                    >
                      No Image
                    </div>
                  )}

                  {/* 정보 박스 */}
                  <div className="p-3">
                    <p className="text-sm font-bold mb-0.5 line-clamp-1" style={{ color: theme.text_color }}>
                      {getName(it)}
                    </p>
                    {it.name_en && (
                      <p className="text-[10px] mb-1.5 line-clamp-1 italic" style={{ color: theme.text_muted }}>
                        {it.name_en}
                      </p>
                    )}
                    {getDesc(it) && (
                      <p className="text-[10px] mb-2 line-clamp-2" style={{ color: theme.text_muted }}>
                        {getDesc(it).slice(0, 40)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black" style={{ color: theme.primary_color }}>
                        {it.price.toLocaleString('ko-KR')}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: theme.text_muted }}>원</span>
                    </div>
                    {/* 배지 */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {it.is_signature && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: theme.accent_color, color: '#fff' }}
                        >
                          BEST
                        </span>
                      )}
                      {it.is_new && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: theme.primary_color, color: '#fff' }}
                        >
                          NEW
                        </span>
                      )}
                      {it.is_soldout && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: '#9CA3AF', color: '#fff' }}
                        >
                          SOLD OUT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-center text-[10px] mt-8" style={{ color: theme.text_muted }}>
          * 사진은 실제와 다를 수 있습니다 *
        </p>
      </div>
    </div>
  )
}
