'use client'

// ============================================================
// /settlement — 정산·매출·세금계산서 통합 (Phase 1 placeholder)
//   · 매출 캘린더 (기본 월간 뷰)
//   · 미수금 / 매입처 정산 현황
//   · 세금계산서 / 카드매출 / 현금영수증
//   · 추후 홈택스 연동 예정
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import {
  Coins, Calendar as CalendarIcon, FileText, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, AlertCircle, ArrowRight,
  CreditCard, Banknote, Receipt, PiggyBank,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type DailySales = {
  date: string         // 'YYYY-MM-DD'
  card: number
  cash: number
  delivery: number
  total: number
  isHoliday?: boolean
  note?: string
}

// 데모 데이터 (실제 데이터 연동 전까지)
function generateDemoData(year: number, month: number): DailySales[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result: DailySales[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    const dow = dt.getDay()
    const isWeekend = dow === 0 || dow === 6
    const base = isWeekend ? 850000 : 620000
    const variance = (d * 7919) % 200000 - 100000
    const card = Math.round((base + variance) * 0.55 / 1000) * 1000
    const cash = Math.round((base + variance) * 0.15 / 1000) * 1000
    const delivery = Math.round((base + variance) * 0.30 / 1000) * 1000
    result.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      card, cash, delivery, total: card + cash + delivery,
      isHoliday: dow === 0,
    })
  }
  return result
}

const KRW = (n: number) => n.toLocaleString('ko-KR') + '원'
const KRW_SHORT = (n: number) => {
  if (n >= 10000) return Math.round(n / 1000) / 10 + '만'
  return Math.round(n / 1000) + 'k'
}

export default function SettlementPage() {
  const today = new Date()
  const [yr, setYr] = useState(today.getFullYear())
  const [mo, setMo] = useState(today.getMonth())
  const [data, setData] = useState<DailySales[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    setData(generateDemoData(yr, mo))
  }, [yr, mo])

  const totalSales = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data])
  const totalCard = useMemo(() => data.reduce((s, d) => s + d.card, 0), [data])
  const totalCash = useMemo(() => data.reduce((s, d) => s + d.cash, 0), [data])
  const totalDelivery = useMemo(() => data.reduce((s, d) => s + d.delivery, 0), [data])
  const avgDaily = data.length > 0 ? Math.round(totalSales / data.length) : 0

  // 요일별 평균
  const byDow = useMemo(() => {
    const sums = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    data.forEach(d => {
      const dow = new Date(d.date).getDay()
      sums[dow] += d.total
      counts[dow]++
    })
    return sums.map((s, i) => ({ dow: i, avg: counts[i] > 0 ? Math.round(s / counts[i]) : 0 }))
  }, [data])

  const selected = useMemo(() => data.find(d => d.date === selectedDate), [data, selectedDate])

  const prevMonth = () => {
    if (mo === 0) { setMo(11); setYr(y => y - 1) } else { setMo(m => m - 1) }
  }
  const nextMonth = () => {
    if (mo === 11) { setMo(0); setYr(y => y + 1) } else { setMo(m => m + 1) }
  }

  // 캘린더 그리드 (앞쪽 빈칸 + 일자)
  const firstDow = new Date(yr, mo, 1).getDay()
  const cells: (DailySales | null)[] = [
    ...Array(firstDow).fill(null),
    ...data,
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<Coins size={28} className="text-white" strokeWidth={2.5} />}
          title="정산·매출"
          subtitle="매출 캘린더 · 카드/현금/배달 분리 · 세금계산서 한눈에"
          variant="success"
        />

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

          {/* 베타 안내 */}
          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3 md:p-4 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-[#92400E] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-bold text-[#92400E] mb-0.5">데모 데이터 안내</p>
              <p className="text-[11px] md:text-xs text-[#92400E] leading-relaxed">
                현재는 예시 데이터입니다. 카드사 / 배민 / 요기요 / 쿠팡이츠 매출 자동 연동은 곧 추가됩니다.
                홈택스 세금계산서 원클릭 발행도 준비 중이에요.
              </p>
            </div>
          </div>

          {/* 핵심 지표 4카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            <SummaryCard
              icon={<TrendingUp size={14} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#10B981] to-[#059669]"
              label="이번 달 매출"
              value={KRW(totalSales)}
              sub={`일평균 ${KRW(avgDaily)}`}
            />
            <SummaryCard
              icon={<CreditCard size={14} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#3182F6] to-[#1B64DA]"
              label="카드 매출"
              value={KRW(totalCard)}
              sub={totalSales > 0 ? Math.round(totalCard / totalSales * 100) + '%' : '0%'}
            />
            <SummaryCard
              icon={<Banknote size={14} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#F59E0B] to-[#D97706]"
              label="현금"
              value={KRW(totalCash)}
              sub={totalSales > 0 ? Math.round(totalCash / totalSales * 100) + '%' : '0%'}
            />
            <SummaryCard
              icon={<Receipt size={14} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#7C3AED] to-[#6D28D9]"
              label="배달앱 매출"
              value={KRW(totalDelivery)}
              sub={totalSales > 0 ? Math.round(totalDelivery / totalSales * 100) + '%' : '0%'}
            />
          </div>

          {/* 캘린더 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-[#3182F6]" strokeWidth={2.5} />
                <h2 className="text-sm md:text-base font-bold text-[#191F28]">{yr}년 {mo + 1}월</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#F2F4F6]" aria-label="이전 달">
                  <ChevronLeft size={16} className="text-[#4E5968]" strokeWidth={2.5} />
                </button>
                <button onClick={() => { const d = new Date(); setYr(d.getFullYear()); setMo(d.getMonth()) }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#3182F6] bg-[#EFF6FF] hover:bg-[#DBEAFE]">
                  오늘
                </button>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#F2F4F6]" aria-label="다음 달">
                  <ChevronRight size={16} className="text-[#4E5968]" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-[#F2F4F6]">
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-bold py-2 ${i === 0 ? 'text-[#DC2626]' : i === 6 ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell) return <div key={i} className="aspect-square md:aspect-auto md:min-h-[80px] bg-[#FAFBFC] border-b border-r border-[#F2F4F6]" />
                const day = parseInt(cell.date.slice(8), 10)
                const dow = new Date(cell.date).getDay()
                const isToday = cell.date === today.toISOString().slice(0, 10)
                const isSelected = cell.date === selectedDate
                const intensity = avgDaily > 0 ? Math.min(1, cell.total / (avgDaily * 1.5)) : 0
                const bgColor = `rgba(49, 130, 246, ${intensity * 0.15})`
                return (
                  <button
                    key={cell.date}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`aspect-square md:aspect-auto md:min-h-[80px] p-1 md:p-2 text-left border-b border-r border-[#F2F4F6] hover:bg-[#EFF6FF] transition-colors ${isSelected ? 'ring-2 ring-[#3182F6] ring-inset' : ''}`}
                    style={{ background: isSelected ? '#EFF6FF' : bgColor }}
                  >
                    <div className={`text-[11px] md:text-xs font-bold mb-0.5 ${dow === 0 ? 'text-[#DC2626]' : dow === 6 ? 'text-[#3182F6]' : 'text-[#191F28]'} ${isToday ? 'inline-flex w-5 h-5 md:w-6 md:h-6 items-center justify-center bg-[#3182F6] text-white rounded-full' : ''}`}>
                      {day}
                    </div>
                    <div className="text-[9px] md:text-[10px] text-[#191F28] font-bold leading-tight hidden md:block">
                      {KRW_SHORT(cell.total)}
                    </div>
                    <div className="text-[9px] md:text-[10px] text-[#3182F6] font-bold leading-tight block md:hidden">
                      {Math.round(cell.total / 10000)}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 선택 일자 상세 */}
            {selected && (
              <div className="bg-[#FAFBFF] border-t border-[#E5E8EB] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#191F28]">{selected.date} 상세</h3>
                  <button onClick={() => setSelectedDate(null)} className="text-xs text-[#8B95A1] hover:text-[#4E5968]">
                    닫기
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <DetailCard label="카드" value={selected.card} color="#3182F6" />
                  <DetailCard label="현금" value={selected.cash} color="#F59E0B" />
                  <DetailCard label="배달" value={selected.delivery} color="#7C3AED" />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm font-bold border-t border-[#E5E8EB] pt-2.5">
                  <span className="text-[#191F28]">합계</span>
                  <span className="text-[#10B981]">{KRW(selected.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 요일별 평균 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm md:text-base font-bold text-[#191F28] mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#10B981]" strokeWidth={2.5} />
              요일별 평균 매출
            </h2>
            <div className="grid grid-cols-7 gap-1.5">
              {['일','월','화','수','목','금','토'].map((d, i) => {
                const item = byDow[i]
                const max = Math.max(...byDow.map(b => b.avg), 1)
                const ratio = item.avg / max
                return (
                  <div key={d} className="flex flex-col items-center">
                    <div className="text-[10px] text-[#8B95A1] mb-1">{d}</div>
                    <div className="w-full h-20 bg-[#F2F4F6] rounded-md overflow-hidden flex flex-col-reverse">
                      <div
                        className="bg-gradient-to-t from-[#3182F6] to-[#7C3AED]"
                        style={{ height: `${ratio * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-bold text-[#191F28] mt-1">
                      {Math.round(item.avg / 10000)}만
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 빠른 링크 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickLink
              icon={<FileText size={16} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#3182F6] to-[#1B64DA]"
              title="세금계산서 발행"
              desc="홈택스 연동 (준비 중)"
              href="#"
              disabled
            />
            <QuickLink
              icon={<PiggyBank size={16} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#7C3AED] to-[#6D28D9]"
              title="미수금 관리"
              desc="안 받은 돈 추적"
              href="#"
              disabled
            />
            <QuickLink
              icon={<Coins size={16} className="text-white" strokeWidth={2.5} />}
              iconBg="from-[#F59E0B] to-[#D97706]"
              title="급여 자동 계산"
              desc="근태 → 급여명세서"
              href="#"
              disabled
            />
          </div>

        </main>
        <Footer />
      </div>
    </div>
  )
}

function SummaryCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <span className="text-[10px] md:text-[11px] font-semibold text-[#8B95A1] truncate">{label}</span>
      </div>
      <p className="text-base md:text-lg font-black text-[#191F28] truncate">{value}</p>
      <p className="text-[10px] md:text-[11px] text-[#8B95A1] mt-0.5">{sub}</p>
    </div>
  )
}

function DetailCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: color + '12' }}>
      <p className="text-[10px] font-bold mb-0.5" style={{ color }}>{label}</p>
      <p className="text-xs font-bold text-[#191F28]">{KRW(value)}</p>
    </div>
  )
}

function QuickLink({ icon, iconBg, title, desc, href, disabled }: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string; href: string; disabled?: boolean
}) {
  const inner = (
    <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 transition-colors ${disabled ? 'opacity-60' : 'hover:bg-[#FAFBFF]'}`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-[#191F28] truncate">{title}</p>
          {disabled && <span className="text-[9px] font-bold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded-full flex-shrink-0">준비중</span>}
        </div>
        <p className="text-[11px] text-[#8B95A1] truncate">{desc}</p>
      </div>
      {!disabled && <ArrowRight size={14} className="text-[#8B95A1] flex-shrink-0" strokeWidth={2.5} />}
    </div>
  )
  if (disabled) return <div>{inner}</div>
  return <Link href={href}>{inner}</Link>
}
