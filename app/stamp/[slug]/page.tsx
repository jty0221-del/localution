'use client'

// ============================================================
// /stamp/[slug] — 손님이 QR 스캔으로 진입하는 페이지
//   · 이모지 전면 제거 → lucide 아이콘 (2026-05-03)
//   · 더 명확한 에러 안내
// ============================================================
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import StampCardView from '../../components/StampCardView'
import { Award, Gift, Sparkles, AlertCircle, ChevronRight, Users } from 'lucide-react'

const LS_PHONE = 'localution.customer_phone'

export default function StampScanPage() {
  const params = useParams()
  const slug = String(params?.slug || '')

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(true)
  const [card, setCard] = useState<any>(null)
  const [collection, setCollection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stamping, setStamping] = useState(false)
  const [err, setErr] = useState('')
  const [errCode, setErrCode] = useState<'no_card' | 'network' | ''>('')
  const [phase, setPhase] = useState<'input' | 'view'>('input')
  const [rewardJustClaimed, setRewardJustClaimed] = useState(false)
  const [milestoneReached, setMilestoneReached] = useState<{ at: number; reward: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stamps/collect?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok) {
          setErrCode(j.error === 'no_active_card' ? 'no_card' : 'network')
          setErr(j.error === 'no_active_card'
            ? '이 매장은 아직 스탬프 카드를 등록하지 않았어요.'
            : '연결에 실패했어요.')
          return
        }
        setCard(j.card)
      })
      .catch(() => { setErrCode('network'); setErr('네트워크 오류') })
      .finally(() => setLoading(false))

    try {
      const saved = localStorage.getItem(LS_PHONE)
      if (saved) {
        setPhone(formatPhone(saved))
        fetch(`/api/stamps/collect?slug=${encodeURIComponent(slug)}&phone=${saved}`)
          .then(r => r.json())
          .then(j => {
            if (j.ok && j.collection) {
              setCard(j.card)
              setCollection(j.collection)
              setPhase('view')
            }
          })
      }
    } catch (_) {}
  }, [slug])

  function formatPhone(d: string): string {
    if (d.length <= 3) return d
    if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3)
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7)
  }

  async function handleStamp() {
    setErr('')
    if (phone.replace(/[^0-9]/g, '').length < 10) {
      setErr('전화번호 11자리를 정확히 입력해주세요.')
      return
    }
    setStamping(true)
    try {
      const r = await fetch('/api/stamps/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, phone: phone.replace(/[^0-9]/g, ''), name, consent_marketing: consent }),
      })
      const j = await r.json()
      if (!j.ok) {
        setErr(j.message || j.error || '적립 실패')
        return
      }
      try { localStorage.setItem(LS_PHONE, phone.replace(/[^0-9]/g, '')) } catch (_) {}
      setCard(j.card)
      setCollection(j.collection)
      setRewardJustClaimed(j.reward_pending)
      setMilestoneReached(j.milestone_reached || null)
      setPhase('view')
    } catch (e: any) {
      setErr('네트워크 오류')
    } finally {
      setStamping(false)
    }
  }

  function handlePhoneChange(v: string) {
    const d = v.replace(/[^0-9]/g, '').slice(0, 11)
    setPhone(formatPhone(d))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full mb-3" />
          <p className="text-sm text-[#8B95A1]">불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (err && !card) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={28} className="text-[#92400E]" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-[#191F28] mb-1">{err}</p>
          <p className="text-xs text-[#8B95A1] mb-4">
            {errCode === 'no_card'
              ? '사장님이 스탬프 카드를 등록하면 자동으로 활성화돼요.'
              : '잠시 후 다시 시도해주세요.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-[#191F28] text-white text-xs font-bold">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] py-6 px-4">
      <div className="max-w-md mx-auto">

        {phase === 'input' ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-2"
                style={{ background: `linear-gradient(135deg, ${card?.theme_color || '#3182F6'}, ${card?.theme_color || '#3182F6'}CC)` }}>
                <Award size={26} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black text-[#191F28]">{card?.title || '단골 도장 카드'}</h1>
              {card?.description && <p className="text-xs text-[#8B95A1] mt-1">{card.description}</p>}
              <div className="mt-3 px-4 py-2 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] inline-flex items-center gap-1.5">
                <Gift size={12} className="text-[#92400E]" strokeWidth={2.5} />
                <p className="text-xs font-bold text-[#92400E]">
                  {card?.required_stamps}회 방문 시 {card?.reward_text}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#4E5968] mb-1 block">전화번호 *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-base"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#4E5968] mb-1 block">이름 (선택)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-base"
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-[#4E5968] cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span>매장 소식-쿠폰 받기 동의 <span className="text-[#8B95A1]">(언제든 거부 가능)</span></span>
              </label>

              {err && <p className="text-xs text-[#DC2626]">{err}</p>}

              <button
                onClick={handleStamp}
                disabled={stamping}
                className="w-full py-3.5 rounded-xl text-white font-black text-base shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: card?.theme_color || '#3182F6' }}>
                <Sparkles size={16} strokeWidth={2.5} />
                {stamping ? '적립 중...' : '도장 받기'}
              </button>

              <p className="text-[10px] text-[#C9CDD2] text-center">
                전화번호는 매장에만 공유되며, 안전하게 암호화 저장됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {rewardJustClaimed && (
              <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-5 mb-4 border-2 border-[#FCD34D]">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                    <Gift size={28} className="text-[#92400E]" strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-black text-[#92400E]">최종 보상 달성!</p>
                  <p className="text-sm text-[#92400E] mt-1">{card?.reward_text}</p>
                  <p className="text-xs text-[#92400E]/80 mt-2">사장님께 이 화면을 보여주세요</p>
                </div>
              </div>
            )}

            {milestoneReached && !rewardJustClaimed && (
              <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-5 mb-4 border-2 border-[#FCD34D]">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-2">
                    <Gift size={28} className="text-[#92400E]" strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-black text-[#92400E]">{milestoneReached.at}회 달성!</p>
                  <p className="text-sm text-[#92400E] mt-1">{milestoneReached.reward}</p>
                  <p className="text-xs text-[#92400E]/80 mt-2">사장님께 이 화면을 보여주세요</p>
                </div>
              </div>
            )}

            <StampCardView card={card} collection={collection} />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPhase('input'); setRewardJustClaimed(false); setMilestoneReached(null) }}
                className="py-3 rounded-xl bg-white text-[#4E5968] font-bold text-sm shadow-sm border border-[#E5E8EB] flex items-center justify-center gap-1">
                <Users size={12} strokeWidth={2.5} /> 다른 번호로
              </button>
              <a
                href="/my/stamps"
                className="py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-1">
                내 모든 카드 <ChevronRight size={12} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
