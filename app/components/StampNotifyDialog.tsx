'use client'

// ============================================================
// 재방문 알림 발송 다이얼로그
//   · 휴면 손님 리스트 (N일 이상 안 옴)
//   · 일괄 선택 + 메시지 작성
//   · SMS 일괄 발송 (모바일 SMS 앱 호출) 또는 카톡 공유
// ============================================================
import { useEffect, useState } from 'react'
import { X, MessageSquare, Send, Check, Phone, Calendar, Users, Smartphone, Copy } from 'lucide-react'

type DormantCustomer = {
  id: string
  customer_phone: string
  customer_name: string | null
  current_stamps: number
  total_collected: number
  last_visit_at: string
  consent_marketing: boolean
  customer_phone_masked: string
  days_since_last_visit: number
}

const TEMPLATES = [
  { label: '기본', text: '{고객명}님, 오랜만이에요! 매장에서 기다리고 있어요. 이번 주 방문 시 도장 1개 추가 적립해드려요.' },
  { label: '쿠폰', text: '{고객명}님, 보고싶었어요! 이번 주 방문 시 음료 1잔 무료 쿠폰 드릴게요.' },
  { label: '신메뉴', text: '{고객명}님 안녕하세요! 신메뉴 출시 기념 단골 손님 한정 할인 진행중이에요.' },
  { label: '한정', text: '{고객명}님, 이번 주말 한정 이벤트 진행중! 매장에서 기다릴게요.' },
]

export default function StampNotifyDialog({
  open,
  onClose,
  consentedOnly,
}: {
  open: boolean
  onClose: () => void
  consentedOnly?: boolean
}) {
  const [days, setDays] = useState(14)
  const [customers, setCustomers] = useState<DormantCustomer[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState(TEMPLATES[0].text)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/stamps/dormant?days=${days}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          let list = j.customers || []
          if (consentedOnly) list = list.filter((c: DormantCustomer) => c.consent_marketing)
          setCustomers(list)
        }
      })
      .finally(() => setLoading(false))
  }, [open, days, consentedOnly])

  if (!open) return null

  const toggleAll = () => {
    if (selected.size === customers.length) setSelected(new Set())
    else setSelected(new Set(customers.map(c => c.id)))
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const buildPersonalMessage = (name: string | null) => {
    return message.replace(/{고객명}/g, name || '단골')
  }

  const selectedCustomers = customers.filter(c => selected.has(c.id))

  const handleSendSms = () => {
    if (selectedCustomers.length === 0) return
    // SMS URL scheme — 한 명씩 또는 multi-recipient
    if (selectedCustomers.length === 1) {
      const c = selectedCustomers[0]
      const url = `sms:${c.customer_phone}?body=${encodeURIComponent(buildPersonalMessage(c.customer_name))}`
      window.location.href = url
    } else {
      // 여러명: comma-separated phone numbers (개별 메시지 X — 동일 메시지 일괄 발송 OS 의존)
      const phones = selectedCustomers.map(c => c.customer_phone).join(',')
      const url = `sms:${phones}?body=${encodeURIComponent(buildPersonalMessage(null))}`
      window.location.href = url
    }
  }

  const handleCopyAll = async () => {
    const text = selectedCustomers
      .map(c => `${c.customer_name || '손님'} (${c.customer_phone}): ${buildPersonalMessage(c.customer_name)}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleKakaoShare = () => {
    if (selectedCustomers.length === 0) return
    const text = selectedCustomers.length === 1
      ? buildPersonalMessage(selectedCustomers[0].customer_name)
      : buildPersonalMessage(null)
    // 카카오톡 공유 — Kakao SDK 없으면 Web Share API
    if (navigator.share) {
      navigator.share({ title: '재방문 안내', text }).catch(() => null)
    } else {
      // fallback: 클립보드 복사
      handleCopyAll()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
              <MessageSquare size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-[#191F28]">재방문 알림 발송</h3>
              <p className="text-[10px] text-[#8B95A1]">휴면 단골 손님께 SMS 또는 카톡 공유</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]"><X size={20} /></button>
        </div>

        {/* 휴면 기간 필터 */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#4E5968]">휴면 기준:</span>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                days === d ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
              }`}>
              {d}일+
            </button>
          ))}
        </div>

        {/* 손님 리스트 */}
        <div className="bg-[#F8FAFB] rounded-xl p-3 mb-3 max-h-[40vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-[#8B95A1]">불러오는 중...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8B95A1]">
              {days}일 이상 안 온 손님이 없어요. 모든 손님이 최근에 방문했어요.
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#E5E8EB]">
                <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-bold text-[#3182F6]">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selected.size === customers.length ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#C9CDD2]'
                  }`}>
                    {selected.size === customers.length && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  전체 선택 ({customers.length}명)
                </button>
                <span className="text-[10px] text-[#8B95A1]">{selected.size}명 선택됨</span>
              </div>
              {customers.map(c => (
                <button key={c.id} onClick={() => toggleOne(c.id)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                    selected.has(c.id) ? 'bg-[#EFF6FF] border border-[#BFDBFE]' : 'bg-white border border-[#E5E8EB] hover:bg-[#F8FAFB]'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected.has(c.id) ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#C9CDD2]'
                  }`}>
                    {selected.has(c.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[#191F28] truncate">{c.customer_name || '익명'}</p>
                      {c.consent_marketing && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-bold">동의</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#8B95A1] mt-0.5">
                      <Phone size={9} strokeWidth={2.5} />
                      {c.customer_phone_masked}
                      <span className="mx-1">·</span>
                      <Calendar size={9} strokeWidth={2.5} />
                      {c.days_since_last_visit}일 전
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 메시지 작성 */}
        <div className="mb-3">
          <label className="text-xs font-bold text-[#4E5968] mb-1.5 block">메시지 내용</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="{고객명}님, 오랜만이에요!"
            className="w-full px-3 py-2 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm leading-relaxed"
          />
          <p className="text-[10px] text-[#8B95A1] mt-1">
            {'{고객명}'} 자리에 손님 이름이 자동 들어갑니다 ({message.length}/200)
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] text-[#8B95A1] mr-1">템플릿:</span>
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => setMessage(t.text)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] hover:bg-[#3182F6] hover:text-white transition-colors text-[#4E5968]">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 발송 안내 */}
        {selectedCustomers.length > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="text-[#92400E] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div className="text-[11px] text-[#92400E] leading-relaxed">
                <p className="font-bold mb-1">발송 방식 안내</p>
                <p><strong>SMS:</strong> 모바일에서 클릭 시 문자 앱 자동 열림. 사장님이 발송 버튼 누름 = 통신사 요금 발생 (1통 약 20원).</p>
                <p className="mt-1"><strong>복사:</strong> 명단 + 개별 메시지 클립보드 복사. 카톡 단체 채팅방 등에 직접 붙여넣기.</p>
              </div>
            </div>
          </div>
        )}

        {/* 발송 버튼 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSendSms}
            disabled={selectedCustomers.length === 0}
            className="py-3 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Send size={14} strokeWidth={2.5} />
            SMS 발송 ({selectedCustomers.length}명)
          </button>
          <button
            onClick={handleCopyAll}
            disabled={selectedCustomers.length === 0}
            className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
              copied ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
            }`}>
            {copied ? <><Check size={14} strokeWidth={3} /> 복사됨</> : <><Copy size={14} strokeWidth={2.5} /> 명단+메시지 복사</>}
          </button>
        </div>
      </div>
    </div>
  )
}
