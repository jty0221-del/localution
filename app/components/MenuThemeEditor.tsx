'use client'

// ============================================================
// 메뉴판 디자인 — 단일 프리미엄 디자인 (옵션 최소화)
// · 이미 멋있게 디자인되어 있음
// · 사장님은 매장 분위기에 맞는 색상만 살짝 조정
// ============================================================
import { useEffect, useState } from 'react'
import { Sparkles, Check, Save, Eye, ExternalLink } from 'lucide-react'
import { THEME_PRESETS, type MenuTheme } from '../lib/menu-themes'

export default function MenuThemeEditor({ storeSlug }: { storeSlug?: string | null }) {
 const [presetId, setPresetId] = useState<string>('korean-traditional')
 const [custom, setCustom] = useState<Partial<MenuTheme>>({})
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [saved, setSaved] = useState(false)

 useEffect(() => {
 fetch('/api/menu/theme', { credentials: 'include' })
 .then(r => r.json())
 .then(j => {
 if (j.ok && j.menu_theme) {
 setPresetId(j.menu_theme.preset || 'korean-traditional')
 if (j.menu_theme.custom) setCustom(j.menu_theme.custom)
 }
 })
 .finally(() => setLoading(false))
 }, [])

 async function handleSave() {
 setSaving(true)
 try {
 const r = await fetch('/api/menu/theme', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 preset: presetId,
 template_id: 'list-default',
 custom: Object.keys(custom).length > 0 ? custom : null,
 }),
 })
 const j = await r.json()
 if (j.ok) {
 setSaved(true)
 setTimeout(() => setSaved(false), 2500)
 } else {
 alert('저장 실패: ' + (j.error || 'unknown'))
 }
 } finally { setSaving(false) }
 }

 const selectedPreset = THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0]
 const effective: MenuTheme = { ...selectedPreset.theme, ...custom }

 if (loading) {
 return (
 <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
 <div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full" />
 </div>
 )
 }

 const previewUrl = storeSlug ? `/menu/${storeSlug}` : null

 return (
 <div className="space-y-4">
 {/* 헤더 — 안내 메시지 */}
 <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #FAF6F0 0%, #FDF4E7 100%)', border: '1px solid #E7DCC9' }}>
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#92400E] to-[#78350F] flex items-center justify-center shadow-sm flex-shrink-0">
 <Sparkles size={18} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <h3 className="font-black text-[#1F1612] mb-1">메뉴판은 이미 프리미엄으로 디자인됐어요</h3>
 <p className="text-[11px] leading-relaxed text-[#78716C]">
 진짜 인쇄 메뉴판처럼 — 큰 매장 헤더, 장식 라인, 시그니처 사진 카드, 점선 가격 leader, 한식 정갈한 레이아웃까지.
 사장님은 매장 분위기에 맞춰 <strong className="text-[#92400E]">색상만 살짝</strong> 골라주시면 돼요.
 </p>
 {previewUrl && (
 <a href={previewUrl} target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-xl bg-white text-[#1F1612] text-xs font-bold hover:bg-[#F5F5F4] border border-[#D6D3D1]">
 <Eye size={12} strokeWidth={2.5} /> 메뉴판 미리보기
 <ExternalLink size={10} strokeWidth={2.5} />
 </a>
 )}
 </div>
 </div>
 </div>

 {/* 색상 톤 선택 — 9가지 중 분위기 */}
 <div>
 <p className="text-xs font-bold text-[#4E5968] mb-2">매장 분위기에 맞는 색상 톤</p>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
 {THEME_PRESETS.map(p => {
 const isActive = p.id === presetId
 return (
 <button
 key={p.id}
 onClick={() => { setPresetId(p.id); setCustom({}) }}
 className={`text-left p-3 rounded-xl transition-all ${
 isActive ? 'ring-2 ring-[#3182F6] ring-offset-2' : 'hover:scale-105'
 }`}
 style={{
 background: p.theme.bg_color,
 border: `2px solid ${isActive ? p.theme.primary_color : p.theme.border_color}`,
 }}>
 <div className="flex items-center gap-1.5 mb-2">
 <div className="w-3 h-3 rounded-full" style={{ background: p.theme.primary_color }} />
 <div className="w-3 h-3 rounded-full" style={{ background: p.theme.accent_color }} />
 {isActive && <Check size={12} className="text-[#3182F6] ml-auto" strokeWidth={3} />}
 </div>
 <p className="text-xs font-black mb-0.5" style={{ color: p.theme.text_color }}>{p.label}</p>
 <p className="text-[10px] leading-tight" style={{ color: p.theme.text_muted }}>{p.desc}</p>
 <div className="mt-1.5 flex flex-wrap gap-1">
 {p.industries.slice(0, 3).map(ind => (
 <span key={ind} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
 style={{ background: p.theme.primary_color + '15', color: p.theme.primary_color }}>
 {ind}
 </span>
 ))}
 </div>
 </button>
 )
 })}
 </div>
 </div>

 {/* 프리뷰 미니 카드 */}
 <div className="rounded-2xl overflow-hidden" style={{ background: effective.bg_color, border: `1px solid ${effective.border_color}` }}>
 <div className="px-5 py-6 text-center" style={{ borderBottom: `1px solid ${effective.border_color}` }}>
 <div className="flex items-center justify-center gap-2 mb-2">
 <span className="w-8 h-[1px]" style={{ background: effective.text_muted, opacity: 0.4 }} />
 <span className="text-[9px] tracking-[0.4em] font-bold" style={{ color: effective.accent_color }}>MENU</span>
 <span className="w-8 h-[1px]" style={{ background: effective.text_muted, opacity: 0.4 }} />
 </div>
 <p className="text-lg font-black" style={{ color: effective.text_color, fontFamily: 'serif' }}>우리 매장</p>
 <p className="text-[10px] italic mt-0.5" style={{ color: effective.text_muted }}>오늘도 정성껏 준비했습니다</p>
 </div>
 <div className="p-4 space-y-3" style={{ fontFamily: 'serif' }}>
 <div className="flex items-baseline gap-2">
 <span className="font-bold text-sm" style={{ color: effective.text_color }}>샘플 메뉴 1</span>
 <span className="flex-1 border-b border-dotted mx-1" style={{ borderColor: effective.text_muted, opacity: 0.5 }} />
 <span className="font-black text-sm" style={{ color: effective.accent_color }}>15,000원</span>
 </div>
 <div className="flex items-baseline gap-2">
 <span className="font-bold text-sm" style={{ color: effective.text_color }}>샘플 메뉴 2</span>
 <span className="flex-1 border-b border-dotted mx-1" style={{ borderColor: effective.text_muted, opacity: 0.5 }} />
 <span className="font-black text-sm" style={{ color: effective.accent_color }}>22,000원</span>
 </div>
 <div className="flex items-baseline gap-2">
 <span className="font-bold text-sm" style={{ color: effective.text_color }}>샘플 메뉴 3</span>
 <span className="flex-1 border-b border-dotted mx-1" style={{ borderColor: effective.text_muted, opacity: 0.5 }} />
 <span className="font-black text-sm" style={{ color: effective.accent_color }}>9,500원</span>
 </div>
 </div>
 </div>

 <button
 onClick={handleSave}
 disabled={saving}
 className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
 saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
 } disabled:opacity-50`}>
 {saved ? (
 <><Check size={14} strokeWidth={3} /> 저장됨</>
 ) : (
 <><Save size={14} strokeWidth={2.5} /> 색상 저장</>
 )}
 </button>
 </div>
 )
}
