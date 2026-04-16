'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

type Tag = 'VIP' | '단골' | '신규' | '휴면' | '블랙리스트'

interface Customer {
  id: string
  name: string
  phone: string
  visits: number
  totalSpend: number
  lastVisit: string
  tags: Tag[]
  memo: string
}

const TAG_COLORS: Record<Tag, { bg: string; text: string }> = {
  'VIP':     { bg: '#EFF6FF', text: '#3182F6' },
  '단골':    { bg: '#F0FDF4', text: '#16A34A' },
  '신규':    { bg: '#FEFCE8', text: '#CA8A04' },
  '휴면':    { bg: '#F2F4F6', text: '#8B95A1' },
  '블랙리스트': { bg: '#FFF1F2', text: '#E11D48' },
}

const MOCK: Customer[] = [
  { id: '1', name: '김민준', phone: '010-1234-5678', visits: 18, totalSpend: 243000, lastVisit: '2026-04-14', tags: ['VIP', '단골'],  memo: '아메리카노 디카페인 선호' },
  { id: '2', name: '이서연', phone: '010-2345-6789', visits: 9,  totalSpend: 87000,  lastVisit: '2026-04-10', tags: ['단골'],         memo: '' },
  { id: '3', name: '박지호', phone: '010-3456-7890', visits: 2,  totalSpend: 19000,  lastVisit: '2026-04-12', tags: ['신규'],         memo: '첫 방문 쿠폰 사용' },
  { id: '4', name: '최유진', phone: '010-4567-8901', visits: 1,  totalSpend: 12000,  lastVisit: '2026-02-20', tags: ['휴면'],         memo: '' },
  { id: '5', name: '정수빈', phone: '010-5678-9012', visits: 22, totalSpend: 318000, lastVisit: '2026-04-13', tags: ['VIP'],          memo: '매주 월·금 방문, 케이크 주문 단골' },
  { id: '6', name: '강태양', phone: '010-6789-0123', visits: 0,  totalSpend: 0,      lastVisit: '2026-01-05', tags: ['블랙리스트'],   memo: '노쇼 3회 기록' },
]

const ALL_TAGS: Tag[] = ['VIP', '단골', '신규', '휴면', '블랙리스트']

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK)
  const [filterTag, setFilterTag] = useState<Tag | '전체'>('전체')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)

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

  const sendMessage = () => {
    setMsgSent(true)
    setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(''); setSelected([]) }, 2000)
  }

  const stats = {
    total:   customers.length,
    vip:     customers.filter(c => c.tags.includes('VIP')).length,
    regular: customers.filter(c => c.tags.includes('단골')).length,
    dormant: customers.filter(c => c.tags.includes('휴면')).length,
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6 min-w-0">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#191F28]">고객 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">단골·VIP·신규 고객을 한눈에 관리하세요</p>
          </div>
          <button
            onClick={() => setMsgOpen(true)}
            disabled={selected.length === 0}
            className="flex items-center gap-2 bg-[#3182F6] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#1B64DA] disabled:opacity-40 transition-colors shadow-sm">
            💬 단체 메시지 ({selected.length}명)
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
            <span className="text-xs font-bold text-[#8B95A1]">고객 {filtered.length}명</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#8B95A1]">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm">검색 결과가 없습니다</div>
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.name[0]}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#191F28] text-sm">{c.name}</span>
                    {c.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: TAG_COLORS[tag].bg, color: TAG_COLORS[tag].text }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#8B95A1]">{c.phone}</div>
                  {c.memo && <div className="text-xs text-[#4E5968] mt-0.5 truncate">📝 {c.memo}</div>}
                </div>

                {/* 통계 */}
                <div className="text-right flex-shrink-0 hidden md:block">
                  <div className="text-sm font-bold text-[#191F28]">{c.visits}회 방문</div>
                  <div className="text-xs text-[#8B95A1]">{c.totalSpend.toLocaleString()}원</div>
                  <div className="text-xs text-[#B0B8C1]">최근 {c.lastVisit}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 메시지 발송 모달 */}
        {msgOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-black text-[#191F28] mb-1">단체 메시지 발송</h3>
              <p className="text-xs text-[#8B95A1] mb-4">선택한 {selected.length}명에게 발송됩니다</p>

              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder={`안녕하세요, {고객명}님!\n이번 주 특별 이벤트를 알려드립니다.\n...`}
                rows={5}
                className="w-full px-4 py-3 border border-[#E5E8EB] rounded-xl text-sm resize-none focus:border-[#3182F6] focus:outline-none mb-2"
              />
              <p className="text-xs text-[#8B95A1] mb-4">{'{고객명}'} 자리에 실제 이름이 들어갑니다</p>

              {msgSent ? (
                <div className="text-center py-3 text-[#16A34A] font-bold text-sm">✓ 발송 완료!</div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setMsgOpen(false)}
                    className="flex-1 border border-[#E5E8EB] text-[#4E5968] py-3 rounded-xl text-sm font-bold hover:bg-[#F2F4F6]">
                    취소
                  </button>
                  <button onClick={sendMessage} disabled={!msgText.trim()}
                    className="flex-1 bg-[#3182F6] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40 transition-colors">
                    발송하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
