'use client'

// ============================================================
// /my/stamps — 손님 본인의 모든 매장 스탬프 카드 모음
// · 이모지 전면 제거 → lucide 아이콘 (2026-05-03)
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StampCardView from '../../components/StampCardView'
import { Award, MapPin, LogOut, Search } from 'lucide-react'

const LS_PHONE = 'localution.customer_phone'

export default function MyStampsPage() {
 const [phone, setPhone] = useState('')
 const [phoneInput, setPhoneInput] = useState('')
 const [cards, setCards] = useState<any[]>([])
 const [loading, setLoading] = useState(false)
 const [err, setErr] = useState('')

 useEffect(() => {
 try {
 const saved = localStorage.getItem(LS_PHONE)
 if (saved) {
 setPhone(saved)
 loadCards(saved)
 }
 } catch (_) {}
 }, [])

 function loadCards(p: string) {
 setLoading(true)
 setErr('')
 fetch(`/api/stamps/my?phone=${p}`)
 .then(r => r.json())
 .then(j => {
 if (!j.ok) {
 setErr(j.error || '조회 실패')
 return
 }
 setCards(j.cards || [])
 })
 .catch(() => setErr('네트워크 오류'))
 .finally(() => setLoading(false))
 }

 function handleSubmit() {
 const digits = phoneInput.replace(/[^0-9]/g, '')
 if (digits.length < 10) {
 setErr('전화번호 11자리를 입력해주세요')
 return
 }
 try { localStorage.setItem(LS_PHONE, digits) } catch (_) {}
 setPhone(digits)
 loadCards(digits)
 }

 function handleLogout() {
 try { localStorage.removeItem(LS_PHONE) } catch (_) {}
 setPhone('')
 setPhoneInput('')
 setCards([])
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] py-6 px-4">
 <div className="max-w-md mx-auto">

 <div className="mb-5 text-center">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center mx-auto mb-2 shadow-sm">
 <Award size={26} className="text-white" strokeWidth={2.5} />
 </div>
 <h1 className="text-2xl font-black text-[#191F28]">내 도장 카드</h1>
 <p className="text-xs text-[#8B95A1] mt-1">방문한 매장의 스탬프 카드 모음</p>
 </div>

 {!phone ? (
 <div className="bg-white rounded-2xl p-6 shadow-sm">
 <div className="flex items-center gap-2 mb-3">
 <Search size={14} className="text-[#3182F6]" strokeWidth={2.5} />
 <p className="text-sm font-bold text-[#191F28]">전화번호로 카드 조회</p>
 </div>
 <input
 type="tel"
 inputMode="numeric"
 value={phoneInput}
 onChange={e => setPhoneInput(e.target.value)}
 placeholder="010-1234-5678"
 className="w-full px-4 py-3 rounded-xl bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-base mb-2"
 onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
 />
 {err && <p className="text-xs text-[#DC2626] mb-2">{err}</p>}
 <button
 onClick={handleSubmit}
 disabled={loading}
 className="w-full py-3.5 rounded-xl bg-[#191F28] text-white font-bold disabled:opacity-50">
 {loading ? '조회 중...' : '내 카드 조회'}
 </button>
 </div>
 ) : loading ? (
 <div className="text-center py-12">
 <div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full mb-3" />
 <p className="text-sm text-[#8B95A1]">불러오는 중...</p>
 </div>
 ) : cards.length === 0 ? (
 <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] flex items-center justify-center mx-auto mb-3">
 <Award size={26} className="text-[#C9CDD2]" strokeWidth={2} />
 </div>
 <p className="text-sm font-bold text-[#191F28] mb-1">아직 카드가 없어요</p>
 <p className="text-xs text-[#8B95A1] mb-4">매장 QR을 스캔하면 여기에 자동 추가됩니다</p>
 <button onClick={handleLogout} className="text-xs text-[#3182F6] underline">다른 번호로 조회</button>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs px-1">
 <span className="text-[#8B95A1]">{cards.length}개의 카드 - {phone.slice(0,3)}-****-{phone.slice(-2)}</span>
 <button onClick={handleLogout} className="flex items-center gap-1 text-[#8B95A1] hover:text-[#191F28]">
 <LogOut size={10} strokeWidth={2.5} /> 로그아웃
 </button>
 </div>
 {cards.map((c) => (
 <Link key={c.collection_id} href={`/stamp/${c.store_slug}`} className="block">
 <div className="mb-1 px-1 flex items-center gap-1">
 <MapPin size={10} className="text-[#4E5968]" strokeWidth={2.5} />
 <p className="text-xs font-bold text-[#4E5968]">{c.store_name}</p>
 </div>
 <StampCardView
 card={{
 title: c.title,
 description: c.description,
 required_stamps: c.required_stamps,
 reward_text: c.reward_text,
 theme_color: c.theme_color,
 }}
 collection={{
 current_stamps: c.current_stamps,
 total_collected: c.total_collected,
 rewards_claimed: c.rewards_claimed,
 last_visit_at: c.last_visit_at,
 }}
 />
 </Link>
 ))}
 </div>
 )}

 </div>
 </div>
 )
}
