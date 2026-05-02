'use client'

// ============================================================
// 사장님용 스탬프 카드 에디터 — 세련화 v2 (2026-05-03)
//   · 이모지 전면 제거 → lucide 아이콘 + 그라데이션 박스
//   · 아이콘 emoji / 배경 패턴 선택 옵션 제거 (단순화)
//   · 손님 스캔 QR 코드 자동 생성 + 다운로드
//   · 손님 수동 추가 (이름 + 전화번호 입력)
//   · CSV 내보내기 + PDF 인쇄 (브라우저 print)
//   · /customers 자동 동기화 안내
// ============================================================
import { useEffect, useState } from 'react'
import {
  Save, Users, Gift, Sparkles, Phone, MessageCircle,
  Award, QrCode, Download, FileSpreadsheet, Printer,
  UserPlus, ExternalLink, Check, Smartphone,
} from 'lucide-react'
import StampCardView from './StampCardView'
import QRImage from './QRImage'

const COLOR_PALETTE = [
  { name: '블루',   value: '#3182F6' },
  { name: '퍼플',   value: '#7C3AED' },
  { name: '레드',   value: '#DC2626' },
  { name: '오렌지', value: '#EA580C' },
  { name: '앰버',   value: '#F59E0B' },
  { name: '그린',   value: '#059669' },
  { name: '핑크',   value: '#EC4899' },
  { name: '다크',   value: '#191F28' },
]

const REWARD_PRESETS = [
  '음료 1잔 무료', '디저트 1개 무료', '10% 할인 쿠폰', '20% 할인 쿠폰',
  '사이드 메뉴 무료', '5천원 할인', '시술 1회 무료', '추가 1개 증정',
]

async function downloadStampQR(url: string, storeName: string) {
  if (!url) return
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: 1000,
      margin: 2,
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `stamp-${storeName || 'qr'}.png`
    a.click()
  } catch (_) {
    alert('다운로드 실패')
  }
}

export default function StampCardEditor() {
  const [card, setCard] = useState({
    title: '단골 도장 카드',
    description: '',
    required_stamps: 10,
    reward_text: '음료 1잔 무료',
    theme_color: '#3182F6',
  })
  const [stats, setStats] = useState({ customers: 0, total_stamps: 0, rewards_claimed: 0 })
  const [store, setStore] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [showCustomers, setShowCustomers] = useState(false)
  const [unmasked, setUnmasked] = useState<Set<string>>(new Set())
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualStamps, setManualStamps] = useState(1)
  const [manualBusy, setManualBusy] = useState(false)
  const [manualErr, setManualErr] = useState('')
  const [downloadingQR, setDownloadingQR] = useState(false)

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
    } finally { setSaving(false) }
  }

  function handlePhoneChange(v: string) {
    const d = v.replace(/[^0-9]/g, '').slice(0, 11)
    if (d.length <= 3) setManualPhone(d)
    else if (d.length <= 7) setManualPhone(d.slice(0, 3) + '-' + d.slice(3))
    else setManualPhone(d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7))
  }

  async function handleManualAdd() {
    setManualErr('')
    if (manualPhone.replace(/[^0-9]/g, '').length < 10) {
      setManualErr('전화번호 11자리를 정확히 입력해주세요')
      return
    }
    setManualBusy(true)
    try {
      const r = await fetch('/api/stamps/manual-add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualName.trim() || null,
          phone: manualPhone.replace(/[^0-9]/g, ''),
          initial_stamps: manualStamps,
        }),
      })
      const j = await r.json()
      if (!j.ok) {
        setManualErr(j.message || j.error || '추가 실패')
        return
      }
      setShowManualAdd(false)
      setManualName('')
      setManualPhone('')
      setManualStamps(1)
      loadCustomers()
      // 통계 갱신
      const r2 = await fetch('/api/stamps/setup', { credentials: 'include' })
      const j2 = await r2.json()
      if (j2.ok && j2.stats) setStats(j2.stats)
    } finally { setManualBusy(false) }
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
        <p className="text-sm font-bold text-[#92400E] mb-1">매장 정보가 먼저 필요해요</p>
        <p className="text-xs text-[#92400E]">"업체 설정" 탭에서 매장 정보를 입력해주세요.</p>
      </div>
    )
  }

  const stampUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/stamp/${store.slug}`
    : `/stamp/${store.slug}`

  return (
    <div className="space-y-5">
      {/* 헤더 — 그라데이션 박스 + Award 아이콘 */}
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#DC2626] flex items-center justify-center shadow-sm flex-shrink-0">
          <Award size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="font-black text-[#191F28]">디지털 스탬프 카드</h2>
          <p className="text-[11px] text-[#8B95A1]">방문 적립 - 보상 자동 발급 - 단골 손님 자동 등록</p>
        </div>
      </div>

      {/* KPI 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-[#3182F6]" strokeWidth={2.5} />
            <p className="text-[11px] text-[#8B95A1]">적립 손님</p>
          </div>
          <p className="text-xl font-black text-[#3182F6]">{stats.customers}<span className="text-xs font-medium text-[#8B95A1] ml-1">명</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-[#7C3AED]" strokeWidth={2.5} />
            <p className="text-[11px] text-[#8B95A1]">누적 스탬프</p>
          </div>
          <p className="text-xl font-black text-[#7C3AED]">{stats.total_stamps}<span className="text-xs font-medium text-[#8B95A1] ml-1">개</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift size={12} className="text-[#F59E0B]" strokeWidth={2.5} />
            <p className="text-[11px] text-[#8B95A1]">발급 보상</p>
          </div>
          <p className="text-xl font-black text-[#F59E0B]">{stats.rewards_claimed}<span className="text-xs font-medium text-[#8B95A1] ml-1">회</span></p>
        </div>
      </div>

      {/* 미리보기 + 에디터 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 좌: 손님 화면 미리보기 + QR 코드 */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#EFF6FF] flex items-center justify-center">
                <Smartphone size={12} className="text-[#3182F6]" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-bold text-[#4E5968]">손님 화면 미리보기</p>
            </div>
            <StampCardView card={card} collection={{ current_stamps: 3, total_collected: 12, rewards_claimed: 1 }} />
          </div>

          {/* 손님이 스캔할 QR 코드 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E8EB]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
                <QrCode size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">스탬프 적립 QR</p>
                <p className="text-[10px] text-[#8B95A1]">손님이 스캔 → 자동 적립 페이지</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white border-2 border-[#191F28] rounded-xl shadow-md">
                <QRImage url={stampUrl} size={180} />
              </div>
              <div className="w-full p-2.5 rounded-lg bg-[#F8FAFB] border border-[#E5E8EB]">
                <p className="text-[10px] text-[#8B95A1] mb-0.5">QR 스캔 시 이동 URL</p>
                <p className="text-[10px] font-mono text-[#191F28] break-all">{stampUrl}</p>
              </div>
              <button
                onClick={async () => {
                  setDownloadingQR(true)
                  await downloadStampQR(stampUrl, card.title)
                  setDownloadingQR(false)
                }}
                disabled={downloadingQR}
                className="w-full py-2.5 rounded-xl bg-[#191F28] text-white text-xs font-bold hover:bg-[#333D4B] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Download size={12} strokeWidth={2.5} />
                {downloadingQR ? '다운로드 중...' : 'PNG 다운로드 (1000px)'}
              </button>
            </div>
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

          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">필요 스탬프 수</label>
            <select
              value={card.required_stamps}
              onChange={e => setCard({ ...card, required_stamps: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm">
              {[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}개 방문 시 보상</option>)}
            </select>
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
                <button key={r}
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
                <button key={c.value}
                  onClick={() => setCard({ ...card, theme_color: c.value })}
                  className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center ${card.theme_color === c.value ? 'ring-2 ring-offset-2 ring-[#191F28] scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.value }}
                  title={c.name}>
                  {card.theme_color === c.value && <Check size={14} className="text-white" strokeWidth={3} />}
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
            {saved ? (
              <><Check size={14} strokeWidth={3} /> 저장됨</>
            ) : (
              <><Save size={14} strokeWidth={2.5} /> 카드 저장</>
            )}
          </button>
        </div>
      </div>

      {/* 적립 손님 목록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <button
            onClick={() => setShowCustomers(s => !s)}
            className="flex items-center gap-2 text-left">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
              <Users size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-[#191F28]">적립 손님 ({stats.customers}명)</h3>
            <span className="text-xs text-[#8B95A1]">{showCustomers ? '접기' : '펼치기'}</span>
          </button>

          {showCustomers && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setShowManualAdd(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#191F28] text-white text-[11px] font-bold hover:bg-[#333D4B]">
                <UserPlus size={11} strokeWidth={2.5} /> 수동 추가
              </button>
              <a
                href="/api/stamps/export"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#059669] text-white text-[11px] font-bold hover:bg-[#047857]">
                <FileSpreadsheet size={11} strokeWidth={2.5} /> 엑셀
              </a>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7C3AED] text-white text-[11px] font-bold hover:bg-[#6D28D9]">
                <Printer size={11} strokeWidth={2.5} /> PDF
              </button>
              <a
                href="/customers"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] text-[#4E5968] text-[11px] font-bold hover:bg-[#E5E8EB]">
                <ExternalLink size={11} strokeWidth={2.5} /> 고객관리로
              </a>
            </div>
          )}
        </div>

        {showCustomers && (
          <div className="space-y-2">
            {/* CRM 동기화 안내 */}
            <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#3182F6] flex items-center justify-center flex-shrink-0">
                <Users size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#1E40AF] mb-0.5">고객관리 자동 동기화</p>
                <p className="text-[10px] text-[#1E40AF]/80 leading-relaxed">
                  스탬프 적립 손님은 <a href="/customers" className="underline font-bold">/customers</a> 에 단골 태그로 자동 등록돼요.
                  방문 횟수도 자동 증분.
                </p>
              </div>
            </div>

            {customers.length === 0 ? (
              <p className="text-xs text-[#8B95A1] text-center py-6">아직 적립한 손님이 없어요. QR 을 매장에 비치하거나 "수동 추가" 로 손님을 등록해보세요.</p>
            ) : customers.map(c => {
              const id = c.id
              const showFull = unmasked.has(id)
              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {(c.customer_name || c.customer_phone_masked || '-').slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[#191F28] truncate">{c.customer_name || '익명'}</p>
                        {c.consent_marketing && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-bold">
                            <Check size={8} strokeWidth={3} /> 마케팅 동의
                          </span>
                        )}
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
                    <p className="text-sm font-black text-[#3182F6]">{c.current_stamps}<span className="text-[10px] text-[#8B95A1] ml-0.5">/{card.required_stamps}</span></p>
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

      {/* 재방문 알림 안내 */}
      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#191F28] mb-1">재방문 알림 (개발 중)</p>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              마케팅 동의한 손님께 카카오톡-문자로 재방문 알림을 보낼 수 있는 기능이 곧 추가됩니다.
              지금은 <a href="/customers" className="underline font-bold">고객관리</a> 에서 단체 메시지를 발송할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      {/* 손님 수동 추가 모달 */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#191F28] to-[#333D4B] flex items-center justify-center shadow-sm">
                <UserPlus size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-[#191F28]">손님 수동 추가</h3>
                <p className="text-[10px] text-[#8B95A1]">스마트폰 없는 손님 / 오프라인 등록</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">이름 (선택)</label>
                <input
                  value={manualName}
                  onChange={e => setManualName(e.target.value.slice(0, 40))}
                  placeholder="홍길동"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">전화번호 *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={manualPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">초기 스탬프 수</label>
                <select
                  value={manualStamps}
                  onChange={e => setManualStamps(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm">
                  {Array.from({ length: card.required_stamps + 1 }, (_, i) => i).map(n => (
                    <option key={n} value={n}>{n}개 (지금까지 {n}회 방문)</option>
                  ))}
                </select>
              </div>

              {manualErr && <p className="text-xs text-[#DC2626]">{manualErr}</p>}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => { setShowManualAdd(false); setManualErr('') }}
                  className="py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] font-bold text-sm">취소</button>
                <button
                  onClick={handleManualAdd}
                  disabled={manualBusy}
                  className="py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm disabled:opacity-50">
                  {manualBusy ? '추가 중...' : '추가하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
