'use client'

// ============================================================
// 사장님용 스탬프 카드 에디터 — 세련화 v2 (2026-05-03)
// · 이모지 전면 제거 → lucide 아이콘 + 그라데이션 박스
// · 아이콘 emoji / 배경 패턴 선택 옵션 제거 (단순화)
// · 손님 스캔 QR 코드 자동 생성 + 다운로드
// · 손님 수동 추가 (이름 + 전화번호 입력)
// · CSV 내보내기 + PDF 인쇄 (브라우저 print)
// · /customers 자동 동기화 안내
// ============================================================
import { useEffect, useState } from 'react'
import {
 Save, Users, Gift, Sparkles, Phone, MessageCircle,
 Award, QrCode, Download, FileSpreadsheet, Printer,
 UserPlus, ExternalLink, Check, Smartphone, X, Plus,
} from 'lucide-react'
import StampCardView from './StampCardView'
import QRImage from './QRImage'
import StampNotifyDialog from './StampNotifyDialog'

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
 owner_name: '',
 owner_phone: '',
 required_stamps: 10,
 reward_text: '음료 1잔 무료',
 theme_color: '#3182F6',
 milestones: [] as Array<{ at: number; reward: string }>,
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
 const [previewStamps, setPreviewStamps] = useState(0) // 미리보기 도장 수 (사장님이 시뮬레이션)
 const [adjustingId, setAdjustingId] = useState<string | null>(null) // 적립 조정 중인 손님 id
 const [manualErr, setManualErr] = useState('')
 const [downloadingQR, setDownloadingQR] = useState(false)
 const [showNotify, setShowNotify] = useState(false)

 useEffect(() => {
 fetch('/api/stamps/setup', { credentials: 'include' })
 .then(r => r.json())
 .then(j => {
 if (j.ok) {
 if (j.card) {
 setCard({
 title: j.card.title,
 description: j.card.description || '',
 owner_name: j.card.owner_name || '',
 owner_phone: j.card.owner_phone || '',
 required_stamps: j.card.required_stamps,
 reward_text: j.card.reward_text,
 theme_color: j.card.theme_color,
 milestones: Array.isArray(j.card.milestones) ? j.card.milestones : [],
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

 // 도장 +/- 조정 (적립/취소)
 async function handleAdjust(collectionId: string, delta: 1 | -1) {
 if (adjustingId) return
 setAdjustingId(collectionId)
 // optimistic UI 업데이트
 setCustomers(prev => prev.map(c => {
 if (c.id !== collectionId) return c
 const next = Math.max(0, Math.min(card.required_stamps, (c.current_stamps || 0) + delta))
 return { ...c, current_stamps: next }
 }))
 try {
 const r = await fetch('/api/stamps/adjust', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ collection_id: collectionId, delta }),
 })
 const j = await r.json()
 if (!j.ok) {
 // 실패 시 재조회
 await loadCustomers()
 alert('적립 조정 실패: ' + (j.message || j.error || 'unknown'))
 } else {
 // 통계도 갱신
 const r2 = await fetch('/api/stamps/setup', { credentials: 'include' })
 const j2 = await r2.json()
 if (j2.ok && j2.stats) setStats(j2.stats)
 }
 } catch (e) {
 await loadCustomers()
 } finally {
 setAdjustingId(null)
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
 <StampCardView card={card} collection={{ current_stamps: previewStamps, total_collected: previewStamps, rewards_claimed: 0 }} />
 {/* 미리보기 시뮬레이터 */}
 <div className="flex items-center justify-between mt-2 p-2.5 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
 <p className="text-[11px] text-[#4E5968] font-bold flex items-center gap-1">
 <Sparkles size={11} className="text-[#7C3AED]" strokeWidth={2.5} />
 도장 시뮬레이션
 </p>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setPreviewStamps(s => Math.max(0, s - 1))}
 disabled={previewStamps === 0}
 className="w-7 h-7 rounded-lg bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-black">
 −
 </button>
 <span className="text-sm font-black text-[#191F28] w-12 text-center">
 {previewStamps} / {card.required_stamps}
 </span>
 <button
 onClick={() => setPreviewStamps(s => Math.min(card.required_stamps, s + 1))}
 disabled={previewStamps >= card.required_stamps}
 className="w-7 h-7 rounded-lg bg-[#3182F6] text-white hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-black">
 +
 </button>
 <button
 onClick={() => setPreviewStamps(0)}
 className="ml-1 px-2 py-1 rounded-md bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold hover:bg-[#FECACA]">
 초기화
 </button>
 </div>
 </div>
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
 <div
 className="bg-white border-2 border-[#191F28] rounded-xl shadow-md flex-shrink-0 flex items-center justify-center"
 style={{ width: 204, height: 204 }}>
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

 {/* 사장님 연락처 (선택) — 카드에 표시되어 손님이 문의 가능 */}
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">사장님 이름 (선택)</label>
 <input
 value={card.owner_name}
 onChange={e => setCard({ ...card, owner_name: e.target.value.slice(0, 30) })}
 placeholder="홍길동"
 className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
 />
 </div>
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">매장 연락처 (선택)</label>
 <input
 type="tel"
 value={card.owner_phone}
 onChange={e => setCard({ ...card, owner_phone: e.target.value.slice(0, 20) })}
 placeholder="010-1234-5678"
 className="w-full px-3 py-2.5 rounded-lg bg-[#F2F4F6] border-2 border-transparent focus:border-[#3182F6] focus:bg-white outline-none text-sm"
 />
 </div>
 </div>

 {/* 통합 보상 단계 — 모든 회수 + 보상을 한 리스트로 */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="text-[11px] font-bold text-[#4E5968]">보상 단계</label>
 <button
 onClick={() => {
 // 모든 단계 = milestones + (required_stamps, reward_text)
 const allStages = [
 ...card.milestones.map(m => ({ at: m.at, reward: m.reward })),
 { at: card.required_stamps, reward: card.reward_text },
 ].sort((a, b) => a.at - b.at)

 // 새 단계 추가 = 가장 높은 회수 + 5
 const lastAt = allStages[allStages.length - 1]?.at || 0
 const newAt = Math.min(30, lastAt + 5)

 // 새 단계 = milestones 에 추가, required_stamps 는 가장 높은 회수로 자동 설정
 const newAllStages = [...allStages, { at: newAt, reward: '' }].sort((a, b) => a.at - b.at)
 const newRequired = newAllStages[newAllStages.length - 1].at
 const newRewardText = newAllStages[newAllStages.length - 1].reward
 const newMilestones = newAllStages.slice(0, -1)

 setCard({
 ...card,
 required_stamps: newRequired,
 reward_text: newRewardText,
 milestones: newMilestones,
 })
 }}
 disabled={card.milestones.length >= 9}
 className="flex items-center gap-1 text-[10px] font-bold text-[#3182F6] hover:underline disabled:opacity-50">
 <Plus size={10} strokeWidth={2.5} /> 단계 추가
 </button>
 </div>
 <p className="text-[10px] text-[#8B95A1] mb-2 leading-relaxed">
 예: 5회=군만두 무료, 10회=탕수육 무료, 15회=사이드 무료, 20회=코스 요리.<br/>
 가장 높은 회수가 <strong>최종 보상</strong> = 사이클 리셋 시점.
 </p>
 <div className="space-y-1.5">
 {(() => {
 // 전체 단계 통합 리스트
 const allStages = [
 ...card.milestones.map((m, idx) => ({ at: m.at, reward: m.reward, originIdx: idx, isFinal: false })),
 { at: card.required_stamps, reward: card.reward_text, originIdx: -1, isFinal: true },
 ].sort((a, b) => a.at - b.at)
 const finalIdx = allStages.length - 1

 const updateStage = (i: number, patch: { at?: number; reward?: string }) => {
 const next = allStages.map((s, idx) => idx === i ? { ...s, ...patch } : s)
 // re-sort
 next.sort((a, b) => a.at - b.at)
 // 가장 큰 at = required_stamps + reward_text
 const newRequired = next[next.length - 1].at
 const newRewardText = next[next.length - 1].reward
 const newMilestones = next.slice(0, -1).map(s => ({ at: s.at, reward: s.reward }))
 setCard({
 ...card,
 required_stamps: newRequired,
 reward_text: newRewardText,
 milestones: newMilestones,
 })
 }

 const removeStage = (i: number) => {
 if (allStages.length <= 1) return // 최소 1개는 유지
 const next = allStages.filter((_, idx) => idx !== i)
 next.sort((a, b) => a.at - b.at)
 const newRequired = next[next.length - 1].at
 const newRewardText = next[next.length - 1].reward
 const newMilestones = next.slice(0, -1).map(s => ({ at: s.at, reward: s.reward }))
 setCard({
 ...card,
 required_stamps: newRequired,
 reward_text: newRewardText,
 milestones: newMilestones,
 })
 }

 return allStages.map((s, i) => (
 <div key={i}
 className={`flex items-center gap-1.5 p-2 rounded-lg border-2 ${
 i === finalIdx
 ? 'bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] border-[#FCD34D]'
 : 'bg-[#F8FAFB] border-[#E5E8EB]'
 }`}>
 <select
 value={s.at}
 onChange={e => updateStage(i, { at: parseInt(e.target.value, 10) })}
 className="text-xs px-2 py-1 rounded bg-white border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6]">
 {Array.from({ length: 30 }, (_, n) => n + 1).map(n => (
 <option key={n} value={n}>{n}회</option>
 ))}
 </select>
 <input
 value={s.reward}
 onChange={e => updateStage(i, { reward: e.target.value.slice(0, 60) })}
 placeholder="예: 군만두 무료"
 className="flex-1 text-xs px-2 py-1 rounded bg-white border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6]"
 />
 {i === finalIdx && (
 <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-[#92400E] text-white">
 <Gift size={9} strokeWidth={3} /> 최종
 </span>
 )}
 {allStages.length > 1 && (
 <button
 onClick={() => removeStage(i)}
 className="w-7 h-7 rounded bg-[#FEE2E2] hover:bg-[#FECACA] flex items-center justify-center">
 <X size={12} className="text-[#991B1B]" strokeWidth={2.5} />
 </button>
 )}
 </div>
 ))
 })()}
 </div>

 {/* 보상 프리셋 빠른 입력 */}
 <div className="mt-2 flex flex-wrap gap-1">
 <span className="text-[10px] text-[#8B95A1] mr-1">최종 보상 빠른 선택:</span>
 {REWARD_PRESETS.slice(0, 4).map(r => (
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
 <div className="text-center py-6 px-4">
 <p className="text-xs text-[#8B95A1] mb-2">아직 적립한 손님이 없어요.</p>
 <p className="text-[11px] text-[#3182F6] leading-relaxed">
 카드 저장 = 디자인 등록만 됨.<br/>
 손님이 QR 스캔 + 전화번호 입력하거나, 사장님이 "수동 추가" 클릭해야 적립 손님 카운트에 추가됩니다.
 </p>
 </div>
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
 <div className="flex items-center gap-2 flex-shrink-0">
 {/* +/- 적립 조정 버튼 */}
 <div className="flex items-center gap-1">
 <button
 onClick={() => handleAdjust(c.id, -1)}
 disabled={adjustingId === c.id || c.current_stamps <= 0}
 title="도장 1개 차감 (취소 적립)"
 className="w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-black text-sm">
 −
 </button>
 <button
 onClick={() => handleAdjust(c.id, 1)}
 disabled={adjustingId === c.id || c.current_stamps >= card.required_stamps}
 title="도장 1개 추가 (적립)"
 className="w-7 h-7 rounded-lg bg-[#3182F6] text-white hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-black text-sm">
 +
 </button>
 </div>
 <div className="text-right">
 <p className="text-sm font-black text-[#3182F6]">{c.current_stamps}<span className="text-[10px] text-[#8B95A1] ml-0.5">/{card.required_stamps}</span></p>
 <p className="text-[10px] text-[#8B95A1]">
 {c.days_since_last_visit === 0 ? '오늘' :
 c.days_since_last_visit === 1 ? '어제' :
 (c.days_since_last_visit ?? 0) + '일 전'}
 </p>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* 재방문 알림 발송 */}
 <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
 <div className="flex items-start gap-3 mb-3">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
 <MessageCircle size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-bold text-[#191F28] mb-1">재방문 알림 발송</p>
 <p className="text-xs text-[#4E5968] leading-relaxed">
 일정 기간 안 온 단골 손님께 SMS/카톡으로 재방문 알림을 보낼 수 있어요.<br/>
 7일/14일/30일 이상 휴면 손님 자동 추출 → 일괄 선택 → 발송.
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => setShowNotify(true)}
 className="py-2.5 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] text-white text-xs font-bold flex items-center justify-center gap-1.5">
 <MessageCircle size={12} strokeWidth={2.5} /> 휴면 손님 알림 보내기
 </button>
 <a
 href="/customers"
 className="py-2.5 rounded-xl bg-white border border-[#BFDBFE] text-[#3182F6] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#EFF6FF]">
 <ExternalLink size={12} strokeWidth={2.5} /> 전체 고객관리
 </a>
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

 {/* 재방문 알림 다이얼로그 */}
 <StampNotifyDialog open={showNotify} onClose={() => setShowNotify(false)} />
 </div>
 )
}
