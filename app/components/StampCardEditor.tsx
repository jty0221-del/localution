'use client'

// ============================================================
// 사장님용 스탬프 카드 에디터
//   · qr-admin "스탬프 카드" 탭에서 사용
//   · 실시간 미리보기 + 저장 + 적립 손님 목록
// ============================================================
import { useEffect, useState } from 'react'
import { Save, Users, Gift, Sparkles, MessageCircle, Phone, Calendar } from 'lucide-react'
import StampCardView from './StampCardView'

const COLOR_PALETTE = [
  { name: '블루', value: '#3182F6' },
  { name: '퍼플', value: '#7C3AED' },
  { name: '레드', value: '#DC2626' },
  { name: '오렌지', value: '#EA580C' },
  { name: '앰버', value: '#F59E0B' },
  { name: '그린', value: '#059669' },
  { name: '핑크', value: '#EC4899' },
  { name: '다크', value: '#191F28' },
]

const ICON_PALETTE = ['☕', '🍰', '🍔', '🍕', '🍜', '🍣', '🥗', '🍦', '🥖', '🍷', '✂️', '💄', '💅', '🧴', '🌸', '🎨', '🐶', '⭐', '🎁', '❤️']

const PATTERN_OPTIONS = [
  { value: 'dots',     label: '도트' },
  { value: 'stripes',  label: '스트라이프' },
  { value: 'gradient', label: '그라데이션' },
  { value: 'solid',    label: '단색' },
]

const REWARD_PRESETS = [
  '음료 1잔 무료', '디저트 1개 무료', '10% 할인 쿠폰', '20% 할인 쿠폰',
  '사이드 메뉴 무료', '5천원 할인', '시술 1회 무료', '추가 1개 증정',
]

export default function StampCardEditor() {
  const [card, setCard] = useState({
    title: '단골 도장 카드',
    description: '',
    required_stamps: 10,
    reward_text: '음료 1잔 무료',
    theme_color: '#3182F6',
    bg_pattern: 'dots',
    icon_emoji: '☕',
  })
  const [stats, setStats] = useState({ customers: 0, total_stamps: 0, rewards_claimed: 0 })
  const [store, setStore] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [showCustomers, setShowCustomers] = useState(false)
  const [unmasked, setUnmasked] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/stamps/setup', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          if (j.card) {
            setCard({
              title: j.card.title,
              description: j.card.description || '',
              required_stamps: j.card.required_stamps,
              reward_text: j.card.reward_text,
              theme_color: j.card.theme_color,
              bg_pattern: j.card.bg_pattern,
              icon_emoji: j.card.icon_emoji,
            })
          }
          setStore(j.store)
          setStats(j.stats || { customers: 0, total_stamps: 0, rewards_claimed: 0 })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function loadCustomers() {
    fetch('/api/stamps/customers', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.ok) setCustomers(j.customers || [])
      })
  }

  useEffect(() => { if (showCustomers) loadCustomers() }, [showCustomers])

  async function handleSave() {
    setSaving(true)
    try {
      const r = await fetch('/api/stamps/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      })
      const j = await r.json()
      if (j.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        alert('저장 실패: ' + (j.message || j.error))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!store?.slug) {
    return (
      <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-6 border border-[#FCD34D]">
        <p className="text-sm font-bold text-[#92400E] mb-1">⚠️ 매장 정보가 먼저 필요해요</p>
        <p className="text-xs text-[#92400E]">"업체 설정" 탭에서 매장 정보를 입력해주세요.</p>
      </div>
    )
  }

  const stampUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/stamp/${store.slug}`
    : `/stamp/${store.slug}`

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#DC2626] flex items-center justify-center shadow-sm">
          <Gift size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="font-black text-[#191F28]">디지털 스탬프 카드</h2>
          <p className="text-[11px] text-[#8B95A1]">방문 적립 → 보상 자동 발급 · 단골 손님 관리까지</p>
        </div>
      </div>

      {/* KPI 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-[#3182F6]" />
            <p className="text-[11px] text-[#8B95A1]">적립 손님</p>
          </div>
          <p className="text-xl font-black text-[#3182F6]">{stats.customers}<span className="text-xs font-medium text-[#8B95A1] ml-1">명</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-[#7C3AED]" />
            <p className="text-[11px] text-[#8B95A1]">누적 스탬프</p>
          </div>
          <p className="text-xl font-black text-[#7C3AED]">{stats.total_stamps}<span className="text-xs font-medium text-[#8B95A1] ml-1">개</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift size={12} className="text-[#F59E0B]" />
            <p className="text-[11px] text-[#8B95A1]">발급 보상</p>
          </div>
          <p className="text-xl font-black text-[#F59E0B]">{stats.rewards_claimed}<span className="text-xs font-medium text-[#8B95A1] ml-1">회</span></p>
        </div>
      </div>

      {/* 미리보기 + 에디터 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 좌: 실시간 미리보기 */}
        <div>
          <p className="text-xs font-bold text-[#4E5968] mb-2">📱 손님 화면 미리보기</p>
          <StampCardView card={card} collection={{ current_stamps: 3, total_collected: 12, rewards_claimed: 1 }} />
          <div className="mt-3 p-3 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
            <p className="text-[10px] text-[#8B95A1] mb-1">손님이 스캔할 URL</p>
            <p className="text-xs font-mono text-[#191F28] break-all">{stampUrl}</p>
          </div>
        </div>

        {/* 우: 에디터 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">카드 제목</label>
            <input
              value={card.title}
              onChange={e => setCard({ ...card, title: e.target.value.slice(0, 40) })}
              placeholder="예: 우리 카페 단골 도장"
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">설명 (선택)</label>
            <input
              value={card.description}
              onChange={e => setCard({ ...card, description: e.target.value.slice(0, 80) })}
              placeholder="예: 따뜻한 아메리카노 한잔"
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">필요 스탬프 수</label>
              <select
                value={card.required_stamps}
                onChange={e => setCard({ ...card, required_stamps: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm">
                {[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}개 방문</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">아이콘</label>
              <select
                value={card.icon_emoji}
                onChange={e => setCard({ ...card, icon_emoji: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm">
                {ICON_PALETTE.map(i => <option key={i} value={i}>{i} {i}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">보상 내용</label>
            <input
              value={card.reward_text}
              onChange={e => setCard({ ...card, reward_text: e.target.value.slice(0, 50) })}
              placeholder="예: 음료 1잔 무료"
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm mb-1.5"
            />
            <div className="flex flex-wrap gap-1">
              {REWARD_PRESETS.map(r => (
                <button
                  key={r}
                  onClick={() => setCard({ ...card, reward_text: r })}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] hover:bg-[#3182F6] hover:text-white transition-colors text-[#4E5968]">
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">테마 색상</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCard({ ...card, theme_color: c.value })}
                  className={`w-9 h-9 rounded-lg transition-all ${card.theme_color === c.value ? 'ring-2 ring-offset-2 ring-[#191F28] scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">배경 스타일</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PATTERN_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setCard({ ...card, bg_pattern: p.value })}
                  className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                    card.bg_pattern === p.value ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
              saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
            } disabled:opacity-50`}>
            {saved ? '✓ 저장됨' : (
              <>
                <Save size={14} strokeWidth={2.5} /> 카드 저장
              </>
            )}
          </button>
        </div>
      </div>

      {/* 적립 손님 목록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <button
          onClick={() => setShowCustomers(s => !s)}
          className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#3182F6]" strokeWidth={2.5} />
            <h3 className="font-black text-[#191F28]">적립 손님 ({stats.customers}명)</h3>
          </div>
          <span className="text-xs text-[#8B95A1]">{showCustomers ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>

        {showCustomers && (
          <div className="mt-4 space-y-2">
            {customers.length === 0 ? (
              <p className="text-xs text-[#8B95A1] text-center py-6">아직 적립한 손님이 없어요. QR을 매장에 비치해보세요!</p>
            ) : customers.map(c => {
              const id = c.id
              const showFull = unmasked.has(id)
              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {(c.customer_name || c.customer_phone_masked).slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[#191F28] truncate">{c.customer_name || '익명'}</p>
                        {c.consent_marketing && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-bold">마케팅 동의</span>}
                      </div>
                      <button
                        onClick={() => {
                          setUnmasked(prev => {
                            const n = new Set(prev)
                            if (n.has(id)) n.delete(id); else n.add(id)
                            return n
                          })
                        }}
                        className="flex items-center gap-1 text-[11px] text-[#8B95A1] hover:text-[#3182F6]">
                        <Phone size={10} />
                        {showFull ? c.customer_phone : c.customer_phone_masked}
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-[#3182F6]">{c.current_stamps}<span className="text-[10px] text-[#8B95A1] ml-0.5">/{stats.customers > 0 ? c.required_stamps || '-' : '-'}</span></p>
                    <p className="text-[10px] text-[#8B95A1]">
                      {c.days_since_last_visit === 0 ? '오늘' :
                       c.days_since_last_visit === 1 ? '어제' :
                       (c.days_since_last_visit ?? 0) + '일 전'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 재방문 알림 안내 (Phase 1B 예정) */}
      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#191F28] mb-1">재방문 알림 (개발 중)</p>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              마케팅 동의한 손님께 카카오톡·문자로 재방문 알림을 보낼 수 있는 기능이 곧 추가됩니다.
              지금은 적립 손님 목록을 확인하고 직접 연락해보세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
