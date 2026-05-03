'use client'

// ============================================================
// 메뉴판 테마 에디터 — 업종별 프리셋 + 커스텀 색상
// ============================================================
import { useEffect, useState } from 'react'
import { Palette, Check, Save, Eye, ExternalLink } from 'lucide-react'
import { THEME_PRESETS, type MenuTheme } from '../lib/menu-themes'

export default function MenuThemeEditor({ storeSlug }: { storeSlug?: string | null }) {
  const [presetId, setPresetId] = useState<string>('default-clean')
  const [custom, setCustom] = useState<Partial<MenuTheme>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    fetch('/api/menu/theme', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.ok && j.menu_theme) {
          setPresetId(j.menu_theme.preset || 'default-clean')
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
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center shadow-sm">
            <Palette size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-black text-[#191F28]">메뉴판 디자인</h3>
            <p className="text-[11px] text-[#8B95A1]">업종에 맞는 테마 선택 + 색상 커스텀</p>
          </div>
        </div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2F4F6] text-[#4E5968] text-xs font-bold hover:bg-[#E5E8EB]">
            <Eye size={12} strokeWidth={2.5} /> 미리보기
            <ExternalLink size={10} strokeWidth={2.5} />
          </a>
        )}
      </div>

      {/* 프리셋 그리드 */}
      <div>
        <p className="text-xs font-bold text-[#4E5968] mb-2">업종별 프리셋</p>
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
                {/* 미리 보기 미니 카드 */}
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

      {/* 커스텀 토글 */}
      <button
        onClick={() => setShowCustom(s => !s)}
        className="w-full text-left text-xs font-bold text-[#3182F6] hover:underline flex items-center justify-between p-3 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
        <span>색상 직접 커스텀 (선택)</span>
        <span>{showCustom ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {showCustom && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-[#E5E8EB]">
          {(['primary_color', 'accent_color', 'bg_color', 'surface_color'] as const).map(k => (
            <div key={k} className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#4E5968] w-32 flex-shrink-0">
                {k === 'primary_color' && '메인 색상'}
                {k === 'accent_color' && '강조 색상'}
                {k === 'bg_color' && '배경 색상'}
                {k === 'surface_color' && '카드 배경'}
              </label>
              <input
                type="color"
                value={custom[k] || effective[k]}
                onChange={e => setCustom(c => ({ ...c, [k]: e.target.value }))}
                className="w-12 h-9 rounded cursor-pointer"
              />
              <input
                type="text"
                value={custom[k] || effective[k]}
                onChange={e => setCustom(c => ({ ...c, [k]: e.target.value }))}
                className="flex-1 px-2 py-1.5 rounded-lg bg-[#F2F4F6] border border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-xs font-mono"
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#4E5968] w-32 flex-shrink-0">카드 스타일</label>
            <select
              value={custom.card_style || effective.card_style}
              onChange={e => setCustom(c => ({ ...c, card_style: e.target.value as any }))}
              className="flex-1 px-2 py-1.5 rounded-lg bg-[#F2F4F6] border border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-xs">
              <option value="minimal">미니멀 (테두리 얇게)</option>
              <option value="bordered">테두리 강조</option>
              <option value="shadow">그림자 강조</option>
              <option value="photo-large">사진 크게 (고급)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#4E5968] w-32 flex-shrink-0">헤더 스타일</label>
            <select
              value={custom.header_style || effective.header_style}
              onChange={e => setCustom(c => ({ ...c, header_style: e.target.value as any }))}
              className="flex-1 px-2 py-1.5 rounded-lg bg-[#F2F4F6] border border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-xs">
              <option value="gradient">그라데이션</option>
              <option value="solid">단색</option>
              <option value="image">이미지 배경 (URL 별도 설정)</option>
            </select>
          </div>

          <button
            onClick={() => setCustom({})}
            className="w-full py-2 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-xs font-bold">
            커스텀 초기화 (프리셋 기본값으로)
          </button>
        </div>
      )}

      {/* 미리보기 */}
      <div className="rounded-2xl overflow-hidden border-2" style={{ borderColor: effective.border_color }}>
        <div className="px-4 py-3" style={{
          background: effective.header_style === 'gradient'
            ? `linear-gradient(135deg, ${effective.primary_color}, ${effective.accent_color})`
            : effective.header_style === 'solid' ? effective.primary_color : effective.surface_color,
        }}>
          <p className="text-sm font-black"
            style={{ color: effective.header_style === 'gradient' || effective.header_style === 'solid' ? '#fff' : effective.text_color }}>
            우리 매장 메뉴판 미리보기
          </p>
          <p className="text-[10px]"
            style={{ color: effective.header_style === 'gradient' || effective.header_style === 'solid' ? 'rgba(255,255,255,0.8)' : effective.text_muted }}>
            테마: {selectedPreset.label}
          </p>
        </div>
        <div className="p-3 space-y-2" style={{ background: effective.bg_color }}>
          <div className="p-3 rounded-xl"
            style={{ background: effective.surface_color, border: `1px solid ${effective.border_color}` }}>
            <p className="text-sm font-bold" style={{ color: effective.text_color }}>샘플 메뉴 1</p>
            <p className="text-[11px]" style={{ color: effective.text_muted }}>맛있는 설명 한 줄</p>
            <p className="text-base font-black mt-1" style={{ color: effective.primary_color }}>15,000원</p>
          </div>
          <div className="p-3 rounded-xl"
            style={{ background: effective.surface_color, border: `1px solid ${effective.border_color}` }}>
            <p className="text-sm font-bold" style={{ color: effective.text_color }}>샘플 메뉴 2</p>
            <p className="text-[11px]" style={{ color: effective.text_muted }}>다른 메뉴 설명</p>
            <p className="text-base font-black mt-1" style={{ color: effective.primary_color }}>22,000원</p>
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
          <><Save size={14} strokeWidth={2.5} /> 테마 저장</>
        )}
      </button>
    </div>
  )
}
