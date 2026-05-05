'use client'

// 클래식 한식 정식 — 쭈꾸매한상, 호호치즈돈까스 스타일
// 청록색 헤더 + 점선 가격 leader + 사진 그리드 하단

type Theme = {
 primary_color: string
 accent_color: string
 bg_color: string
 surface_color: string
 text_color: string
 text_muted: string
 border_color: string
}

export default function ClassicKoreanTemplate({
 store, items, theme, getName, getDesc, t,
}: {
 store: any
 items: any[]
 theme: Theme
 getName: (it: any) => string
 getDesc: (it: any) => string
 t: any
}) {
 // 카테고리별 그룹
 const grouped: Record<string, any[]> = {}
 for (const it of items) {
 const cat = it.category || '메뉴'
 if (!grouped[cat]) grouped[cat] = []
 grouped[cat].push(it)
 }

 return (
 <div className="min-h-screen pb-12" style={{ background: theme.bg_color }}>
 {/* 매장 로고/타이틀 */}
 <header className="text-center py-6 px-4" style={{ borderBottom: `2px solid ${theme.primary_color}` }}>
 <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: theme.primary_color }}>{store.name}</h1>
 {store.address && <p className="text-[11px] mt-1" style={{ color: theme.text_muted }}>{store.address}</p>}
 </header>

 <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
 {Object.entries(grouped).map(([cat, list]) => {
 const photoItems = list.filter(it => it.image_url)
 return (
 <section key={cat} className="mb-10">
 {/* 카테고리 큰 청록 타이틀 */}
 <div className="text-center mb-6">
 <h2 className="text-2xl md:text-3xl font-bold tracking-wider" style={{ color: theme.primary_color, letterSpacing: '0.3em' }}>
 {cat.split('').map((c, i) => (i > 0 ? <span key={i} style={{ color: theme.text_muted }}> | </span> : null)).flat()}
 {cat}
 </h2>
 </div>

 {/* 메뉴 + 점선 + 가격 */}
 <div className="space-y-2 mb-5">
 {list.map((it: any) => (
 <div key={it.id} className="flex items-baseline gap-2">
 <span className="font-bold text-base" style={{ color: theme.text_color }}>
 <span style={{ color: theme.primary_color }}>|</span> {getName(it)}
 </span>
 {getDesc(it) && (
 <span className="text-xs" style={{ color: theme.text_muted }}>({getDesc(it).slice(0, 30)})</span>
 )}
 <span className="flex-1 border-b border-dotted mx-1 mb-1" style={{ borderColor: theme.text_muted, opacity: 0.5 }} />
 <span className="font-bold text-base" style={{ color: theme.text_color }}>
 {it.price.toLocaleString('ko-KR')}
 </span>
 </div>
 ))}
 </div>

 {/* 사진 그리드 (있는 메뉴만) */}
 {photoItems.length > 0 && (
 <div className={`grid gap-2 ${photoItems.length === 1 ? 'grid-cols-1' : photoItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
 {photoItems.slice(0, 6).map((it: any) => (
 <div key={it.id} className="text-center">
 <p className="text-[10px] mb-1 font-bold" style={{ color: theme.text_muted }}>{getName(it)}</p>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={it.image_url} alt={getName(it)} className="w-full aspect-square object-cover rounded-lg" />
 </div>
 ))}
 </div>
 )}
 </section>
 )
 })}

 <p className="text-center text-[10px] mt-8" style={{ color: theme.text_muted }}>* 이미지는 실제와 다를 수 있습니다 *</p>
 </div>
 </div>
 )
}
