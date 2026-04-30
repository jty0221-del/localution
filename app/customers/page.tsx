'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { BRAND_GRAD } from '../lib/brand-colors'
import { useCustomers, type Customer } from '../hooks/useCustomers'
import type { CustomerTag } from '../lib/supabase'

type Tag = CustomerTag

const TAG_COLORS: Record<Tag, { bg: string; text: string }> = {
  'VIP':     { bg: '#EFF6FF', text: '#3182F6' },
  '단골':    { bg: '#F0FDF4', text: '#16A34A' },
  '신규':    { bg: '#FEFCE8', text: '#CA8A04' },
  '휴면':    { bg: '#F2F4F6', text: '#8B95A1' },
  '블랙리스트': { bg: '#FFF1F2', text: '#E11D48' },
}

const ALL_TAGS: Tag[] = ['VIP', '단골', '신규', '휴면', '블랙리스트']

// 업종 무관 중립 샘플 — 고객 0명일 때 UI 미리보기용 (저장되지 않음)
const DEMO_CUSTOMERS: Customer[] = [
  { id: 'demo-1', name: '김민준', phone: '010-1234-5678', visits: 18, totalSpend: 243000, lastVisit: '2026-04-14', tags: ['VIP', '단골'],  memo: '재방문 주기 짧음' },
  { id: 'demo-2', name: '이서연', phone: '010-2345-6789', visits: 9,  totalSpend: 87000,  lastVisit: '2026-04-10', tags: ['단골'],         memo: '' },
  { id: 'demo-3', name: '박지호', phone: '010-3456-7890', visits: 2,  totalSpend: 19000,  lastVisit: '2026-04-12', tags: ['신규'],         memo: '첫 방문 쿠폰 사용' },
  { id: 'demo-4', name: '최유진', phone: '010-4567-8901', visits: 1,  totalSpend: 12000,  lastVisit: '2026-02-20', tags: ['휴면'],         memo: '' },
  { id: 'demo-5', name: '정수빈', phone: '010-5678-9012', visits: 22, totalSpend: 318000, lastVisit: '2026-04-13', tags: ['VIP'],          memo: '정기 방문 단골' },
  { id: 'demo-6', name: '강태양', phone: '010-6789-0123', visits: 0,  totalSpend: 0,      lastVisit: '2026-01-05', tags: ['블랙리스트'],   memo: '노쇼 3회 기록' },
]

export default function CustomersPage() {
  const { customers: real, mode, loading, add } = useCustomers()
  const isDemo = real.length === 0
  const customers: Customer[] = isDemo ? DEMO_CUSTOMERS : real

  const [filterTag, setFilterTag] = useState<Tag | '전체'>('전체')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newTag, setNewTag] = useState<Tag>('신규')
  const [newMemo, setNewMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = customers.filter(c => {
    const matchTag  = filterTag === '전체' || c.tags.includes(filterTag)
    const matchSearch = !search ||
      c.name.includes(search) ||
      c.phone.includes(search) ||
      c.memo.includes(search)
    return matchTag && matchSearch
  })

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(c => c.id))

  // Windows·macOS·모바일 모두 호환되는 메시지 발송 방식
  // 1) 템플릿 치환({고객명}) + 전화번호 리스트 포함하여 클립보드 복사
  // 2) KakaoTalk PC deep link 시도 (설치돼 있으면 자동 실행)
  // 3) 사용자에게 "카카오톡 대화창에 Ctrl+V 붙여넣기" 안내
  //   ※ 알림톡 API 자동 발송은 전체 스탑 (2026-04-20)
  const [sendMode, setSendMode] = useState<'kakao' | 'sms'>('kakao')
  const [sendError, setSendError] = useState<string | null>(null)

  const buildPersonalizedBlocks = (): string => {
    const pick = customers.filter(c => selected.includes(c.id))
    return pick.map(c => {
      const body = msgText.replace(/\{고객명\}/g, c.name || '고객')
      return `[${c.name} · ${c.phone}]\n${body}`
    }).join('\n\n————————\n\n')
  }

  const sendKakao = async () => {
    setSendError(null)
    try {
      const bulk = buildPersonalizedBlocks()
      // 1) 클립보드 복사 (Windows/Mac/모바일 모두 동작)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(bulk)
      } else {
        // 비보안 컨텍스트 fallback
        const ta = document.createElement('textarea')
        ta.value = bulk; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch (_) {}; document.body.removeChild(ta)
      }
      // 2) KakaoTalk PC 실행 시도 (Windows 카톡PC 설치 시 자동 실행)
      //    실패해도 복사는 완료돼 있으므로 사용자가 수동으로 열어 붙여넣을 수 있음
      try { window.open('kakaotalk://', '_self') } catch (_) {}
      setMsgSent(true)
      setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(''); setSelected([]) }, 2500)
    } catch (e: any) {
      setSendError('클립보드 복사 실패: ' + (e?.message || '브라우저 권한 확인'))
    }
  }

  const sendSMS = () => {
    setSendError(null)
    const pick = customers.filter(c => selected.includes(c.id))
    const phones = pick.map(c => c.phone.replace(/[^0-9]/g, '')).filter(Boolean).join(',')
    if (!phones) { setSendError('전화번호가 없는 고객입니다.'); return }
    // 모바일: sms: URI → 기본 메시지 앱이 열림
    // Windows 데스크톱: sms: URI는 Windows 10+ Your Phone/Phone Link 연동 시에만 동작
    //   → 실패 시 클립보드 fallback
    const firstName = pick[0]?.name || '고객'
    const previewBody = msgText.replace(/\{고객명\}/g, firstName)
    const ua = navigator.userAgent.toLowerCase()
    const isMobile = /android|iphone|ipad|ipod/.test(ua)
    if (isMobile) {
      const sep = /iphone|ipad|ipod/.test(ua) ? '&' : '?' // iOS: ?body, Android: ?body 공용
      window.location.href = 'sms:' + phones + sep + 'body=' + encodeURIComponent(previewBody)
      setMsgSent(true)
      setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(''); setSelected([]) }, 2500)
    } else {
      // Windows/Mac 데스크톱 → Phone Link 미설치 시 클립보드 복사 후 안내
      setSendError(null)
      const bulk = buildPersonalizedBlocks()
      const copyText = async () => {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(bulk)
        } else {
          const ta = document.createElement('textarea')
          ta.value = bulk; ta.style.position = 'fixed'; ta.style.opacity = '0'
          document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch (_) {}; document.body.removeChild(ta)
        }
        setMsgSent(true)
        setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(''); setSelected([]) }, 2500)
      }
      // Windows 10+의 Phone Link(휴대폰 연결) 앱 실행 시도
      try {
        window.open('ms-phone-link:', '_self')
      } catch (_) {}
      copyText().catch(() => setSendError('클립보드 복사 실패: 브라우저 권한 확인'))
    }
  }

  const sendMessage = () => { sendMode === 'kakao' ? sendKakao() : sendSMS() }

  const addCustomer = async () => {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    try {
      await add({
        name: newName.trim(),
        phone: newPhone.trim(),
        memo: newMemo.trim(),
        tags: [newTag],
      })
      setAddOpen(false)
      setNewName(''); setNewPhone(''); setNewMemo(''); setNewTag('신규')
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    total:   customers.length,
    vip:     customers.filter(c => c.tags.includes('VIP')).length,
    regular: customers.filter(c => c.tags.includes('단골')).length,
    dormant: customers.filter(c => c.tags.includes('휴면')).length,
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[220px] pt-14 md:pt-0 min-w-0">
          <PageHeader
            icon="🫶"
            title="고객 관리"
            subtitle="단골을 데이터로 키운다 — 재방문·리뷰·쿠폰이 연결되는 CRM"
            variant="warn"
          />

          <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">
                  데모 모드
                </span>
              )}
              {mode === 'remote' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">
                  클라우드 저장 활성
                </span>
              )}
              {mode === 'local' && !isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-semibold">
                  로컬 저장
                </span>
              )}
            </div>
            <p className="text-sm text-[#8B95A1]">
              {isDemo
                ? '아직 고객을 등록하지 않아 샘플을 보여드려요. "+ 고객 추가"로 첫 단골을 등록해보세요 ✨'
                : '단골·VIP·신규 고객을 한눈에 관리하세요'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-[#E5E8EB] text-[#4E5968] font-bold text-sm px-3 py-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors">
              + 고객 추가
            </button>
            <button
              onClick={() => setMsgOpen(true)}
              disabled={selected.length === 0}
              className="flex items-center gap-2 bg-[#3182F6] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#1B64DA] disabled:opacity-40 transition-colors shadow-sm">
              💬 단체 메시지 ({selected.length}명)
            </button>
          </div>
        </div>

        {/* 데모 배너 */}
        {isDemo && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs md:text-sm text-[#92400E]">
              지금 보고 계신 6명은 기능 미리보기용 샘플이에요. 실제 고객을 추가하면 샘플은 자동으로 사라집니다.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#3182F6] text-white hover:opacity-90 whitespace-nowrap">
              + 첫 고객 추가
            </button>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: '전체 고객',   value: stats.total,   icon: '👥', color: '#3182F6' },
            { label: 'VIP',         value: stats.vip,     icon: '⭐', color: '#F59E0B' },
            { label: '단골',        value: stats.regular, icon: '💚', color: '#16A34A' },
            { label: '휴면 (90일+)', value: stats.dormant, icon: '💤', color: '#8B95A1' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#8B95A1] font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 필터 + 검색 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {(['전체', ...ALL_TAGS] as const).map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterTag === tag
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'
                }`}>
                {tag}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 전화번호, 메모 검색..."
            className="w-full px-4 py-2.5 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]/20 text-[#191F28]"
          />
        </div>

        {/* 고객 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center px-5 py-3 border-b border-[#F2F4F6] bg-[#F8FAFC]">
            <input type="checkbox"
              checked={selected.length === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded text-[#3182F6] mr-4 cursor-pointer" />
            <span className="text-xs font-bold text-[#8B95A1]">
              {loading ? '불러오는 중…' : `고객 ${filtered.length}명`}
            </span>
          </div>

          {loading ? (
            // 15차-10 스켈레톤 로더 (5행 animate-pulse)
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F2F4F6] animate-pulse">
                <div className="w-4 h-4 rounded bg-[#F2F4F6] flex-shrink-0" />
                <div className="w-10 h-10 rounded-full bg-[#F2F4F6] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 bg-[#F2F4F6] rounded w-20" />
                    <div className="h-3 bg-[#F2F4F6] rounded-full w-10" />
                  </div>
                  <div className="h-2.5 bg-[#F2F4F6] rounded w-28" />
                </div>
                <div className="text-right flex-shrink-0 hidden md:block space-y-1.5">
                  <div className="h-3 bg-[#F2F4F6] rounded w-14 ml-auto" />
                  <div className="h-2.5 bg-[#F2F4F6] rounded w-16 ml-auto" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[#8B95A1] flex flex-col items-center">
              {/* SVG 빈 상태 일러스트 */}
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-60" aria-hidden="true">
                <circle cx="40" cy="40" r="38" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="2" />
                <circle cx="28" cy="33" r="9" fill="#BFDBFE" />
                <circle cx="52" cy="33" r="9" fill="#93C5FD" />
                <path d="M18 58c0-8 9-14 22-14s22 6 22 14" stroke="#3182F6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="40" cy="23" r="5" fill="#60A5FA" opacity="0.5" />
              </svg>
              <div className="text-sm font-semibold mb-1 text-[#4E5968]">
                {customers.length === 0
                  ? '아직 등록된 고객이 없어요'
                  : '검색 조건에 맞는 고객이 없습니다'}
              </div>
              <div className="text-xs text-[#8B95A1] mb-4 break-keep">
                {customers.length === 0 ? '첫 고객을 추가하고 CRM을 시작해보세요' : '필터나 검색어를 바꿔보세요'}
              </div>
              {customers.length === 0 && (
                <button onClick={() => setAddOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-colors">
                  + 첫 고객 추가하기
                </button>
              )}
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id}
                className={`flex items-center gap-4 px-5 py-4 border-b border-[#F2F4F6] hover:bg-[#F8FAFC] transition-colors ${
                  selected.includes(c.id) ? 'bg-blue-50' : ''
                }`}>
                <input type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="w-4 h-4 rounded text-[#3182F6] cursor-pointer flex-shrink-0" />

                {/* 아바타 */}
                <div className={`w-10 h-10 rounded-full ${BRAND_GRAD.avatar} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {c.name[0]}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-[#191F28] text-sm">{c.name}</span>
                    {c.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: TAG_COLORS[tag].bg, color: TAG_COLORS[tag].text }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#8B95A1]">{c.phone || '연락처 없음'}</div>
                  {c.memo && <div className="text-xs text-[#4E5968] mt-0.5 truncate">📝 {c.memo}</div>}
                </div>

                {/* 통계 */}
                <div className="text-right flex-shrink-0 hidden md:block">
                  <div className="text-sm font-bold text-[#191F28]">{c.visits}회 방문</div>
                  <div className="text-xs text-[#8B95A1]">{c.totalSpend.toLocaleString()}원</div>
                  <div className="text-xs text-[#B0B8C1]">최근 {c.lastVisit || '-'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 고객 추가 모달 */}
        {addOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-black text-[#191F28] mb-1">고객 추가</h3>
              <p className="text-xs text-[#8B95A1] mb-4">이름은 필수, 나머지는 선택입니다</p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="new-name" className="text-xs text-[#8B95A1] font-semibold block mb-1">이름 *</label>
                  <input id="new-name" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-4 py-2.5 border border-[#E5E8EB] rounded-xl text-sm focus:border-[#3182F6] focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="new-phone" className="text-xs text-[#8B95A1] font-semibold block mb-1">전화번호</label>
                  <input id="new-phone" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-2.5 border border-[#E5E8EB] rounded-xl text-sm focus:border-[#3182F6] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-[#8B95A1] font-semibold block mb-1">태그</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ALL_TAGS.map(t => (
                      <button key={t} onClick={() => setNewTag(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          newTag === t ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="new-memo" className="text-xs text-[#8B95A1] font-semibold block mb-1">메모</label>
                  <textarea id="new-memo" value={newMemo} onChange={e => setNewMemo(e.target.value)}
                    rows={2}
                    placeholder="선호하는 메뉴, 특이사항 등..."
                    className="w-full px-4 py-2 border border-[#E5E8EB] rounded-xl text-sm resize-none focus:border-[#3182F6] focus:outline-none" />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setAddOpen(false)} disabled={submitting}
                  className="flex-1 border border-[#E5E8EB] text-[#4E5968] py-3 rounded-xl text-sm font-bold hover:bg-[#F2F4F6] disabled:opacity-50">
                  취소
                </button>
                <button onClick={addCustomer} disabled={!newName.trim() || submitting}
                  className="flex-1 bg-[#3182F6] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40 transition-colors">
                  {submitting ? '추가 중…' : '추가하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메시지 발송 모달 */}
        {msgOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-black text-[#191F28] mb-1">단체 메시지 발송</h3>
              <p className="text-xs text-[#8B95A1] mb-3">선택한 {selected.length}명에게 발송됩니다</p>

              {/* 채널 선택 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setSendMode('kakao')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${sendMode === 'kakao' ? 'bg-[#FEE500] text-[#191F28]' : 'bg-[#F2F4F6] text-[#8B95A1]'}`}>
                  카카오톡 복사
                  <div className="text-[10px] opacity-70 font-normal">PC 카카오톡</div>
                </button>
                <button
                  onClick={() => setSendMode('sms')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${sendMode === 'sms' ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]'}`}>
                  SMS 직발송
                  <div className="text-[10px] opacity-70 font-normal">모바일 권장</div>
                </button>
              </div>

              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder={`안녕하세요, {고객명}님!\n이번 주 특별 이벤트를 알려드립니다.\n...`}
                rows={5}
                className="w-full px-4 py-3 border border-[#E5E8EB] rounded-xl text-sm resize-none focus:border-[#3182F6] focus:outline-none mb-2"
              />
              <p className="text-[11px] text-[#8B95A1] mb-3">{'{고객명}'} 자리에 실제 이름이 자동 치환됩니다</p>

              {/* 모드별 안내 */}
              <div className="mb-4 text-[11px] leading-relaxed bg-[#F8F9FB] border border-[#E5E8EB] rounded-lg px-3 py-2.5">
                {sendMode === 'kakao' && (
                  <p className="text-[#4E5968]">
                    <strong className="text-[#191F28]">Windows/Mac 호환</strong> — 고객별로 이름이 치환된 메시지가 <strong>클립보드에 복사</strong>되고
                    카카오톡 PC가 자동 실행됩니다. 상대방 대화창에 <kbd className="px-1 bg-white border border-[#E5E8EB] rounded">Ctrl+V</kbd> 로 붙여넣으세요.
                    <br />
                    <span className="text-[#8B95A1]">※ 카카오톡 PC가 설치되어 있어야 자동 실행됩니다</span>
                  </p>
                )}
                {sendMode === 'sms' && (
                  <p className="text-[#4E5968]">
                    <strong className="text-[#191F28]">모바일</strong>에서는 기본 메시지 앱이 열리며 수신자·본문이 자동 채워집니다.
                    <br />
                    <span className="text-[#8B95A1]">Windows 데스크톱: Phone Link(휴대폰 연결) 설치 시 SMS 발송 가능, 미설치 시 클립보드 복사로 대체</span>
                  </p>
                )}
              </div>

              {sendError && (
                <div className="mb-3 text-xs text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">{sendError}</div>
              )}

              {msgSent ? (
                <div className="text-center py-3 text-[#16A34A] font-bold text-sm">
                  {sendMode === 'kakao' ? '✓ 복사 완료 · 카카오톡에 붙여넣기(Ctrl+V)' : '✓ SMS 앱 실행 완료'}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setMsgOpen(false)}
                    className="flex-1 border border-[#E5E8EB] text-[#4E5968] py-3 rounded-xl text-sm font-bold hover:bg-[#F2F4F6]">
                    취소
                  </button>
                  <button onClick={sendMessage} disabled={!msgText.trim() || selected.length === 0}
                    className="flex-1 bg-[#3182F6] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40 transition-colors">
                    {sendMode === 'kakao' ? '복사 + 카카오톡 열기' : 'SMS 발송'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
