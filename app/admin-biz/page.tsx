'use client';

import { useState } from 'react';
import {
  Calculator, FileText, Calendar, Clock, Users,
  TrendingUp, AlertCircle, Check, Download, Send,
  Plus, ChevronLeft, ChevronRight, Zap, Bell,
  CreditCard, Wallet, ClipboardList
} from 'lucide-react';

// ── 더미 데이터 ──────────────────────────────────────────────
const salesData = {
  thisMonth: 4820000,
  lastMonth: 4320000,
  unpaid: 320000,
  expenses: 1250000,
};

const calendarData: Record<number, { sales: number; type: 'high' | 'mid' | 'low' | 'none' }> = {
  1: { sales: 180000, type: 'mid' },
  2: { sales: 0, type: 'none' },
  3: { sales: 220000, type: 'high' },
  4: { sales: 150000, type: 'mid' },
  5: { sales: 90000, type: 'low' },
  6: { sales: 310000, type: 'high' },
  7: { sales: 280000, type: 'high' },
  8: { sales: 0, type: 'none' },
  9: { sales: 195000, type: 'mid' },
  10: { sales: 165000, type: 'mid' },
  11: { sales: 120000, type: 'low' },
  12: { sales: 340000, type: 'high' },
  13: { sales: 290000, type: 'high' },
  14: { sales: 250000, type: 'high' },
  15: { sales: 0, type: 'none' },
  16: { sales: 175000, type: 'mid' },
  17: { sales: 140000, type: 'mid' },
  18: { sales: 85000, type: 'low' },
  19: { sales: 320000, type: 'high' },
  20: { sales: 275000, type: 'high' },
  21: { sales: 230000, type: 'high' },
  22: { sales: 0, type: 'none' },
  23: { sales: 185000, type: 'mid' },
  24: { sales: 155000, type: 'mid' },
  25: { sales: 110000, type: 'low' },
  26: { sales: 295000, type: 'high' },
  27: { sales: 260000, type: 'high' },
  28: { sales: 0, type: 'none' },
  29: { sales: 145000, type: 'mid' },
  30: { sales: 200000, type: 'mid' },
};

const invoices = [
  { id: 'INV-2026-004', client: '하랑마케팅', amount: 550000, date: '2026-04-01', status: '발행완료', due: '2026-04-30' },
  { id: 'INV-2026-003', client: '부천 꽃집', amount: 330000, date: '2026-03-01', status: '입금완료', due: '2026-03-31' },
  { id: 'INV-2026-002', client: '신중동 카페', amount: 220000, date: '2026-03-01', status: '미수금', due: '2026-03-31' },
  { id: 'INV-2026-001', client: '소사구 식당', amount: 440000, date: '2026-02-01', status: '입금완료', due: '2026-02-28' },
];

const employees = [
  { name: '김알바', role: '파트타임', checkIn: '09:02', checkOut: '18:05', status: '퇴근', wage: 12000 },
  { name: '이직원', role: '정규직', checkIn: '08:58', checkOut: '-', status: '근무중', wage: 0 },
  { name: '박알바', role: '파트타임', checkIn: '-', checkOut: '-', status: '휴무', wage: 0 },
];

const govSupports = [
  { title: '소상공인 경영안정자금', deadline: '2026-04-30', amount: '최대 5,000만원', status: '신청가능', category: '자금' },
  { title: '부천시 청년창업 지원금', deadline: '2026-05-15', amount: '최대 2,000만원', status: '신청가능', category: '창업' },
  { title: '고용유지 지원금', deadline: '2026-04-20', amount: '월 최대 180만원', status: '마감임박', category: '고용' },
];

export default function AdminBizPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'invoice' | 'employee' | 'support'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [currentMonth] = useState('2026년 4월');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const growthRate = (((salesData.thisMonth - salesData.lastMonth) / salesData.lastMonth) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#0f0f13]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-none">정산 · 행정</h1>
            <p className="text-gray-500 text-xs mt-1">매출 관리 · 세금계산서 · 근태</p>
          </div>
          {salesData.unpaid > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/20 rounded-xl">
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-red-400 text-xs font-bold">미수금 {salesData.unpaid.toLocaleString()}원</span>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
          {[
            { id: 'calendar', label: '매출 캘린더', icon: Calendar },
            { id: 'invoice', label: '세금계산서', icon: FileText },
            { id: 'employee', label: '근태 관리', icon: Users },
            { id: 'support', label: '지원금 봇', icon: Bell },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-4xl mx-auto">

        {/* ── 매출 캘린더 탭 ── */}
        {activeTab === 'calendar' && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">이번달 총 매출</p>
                    <p className="text-white font-black text-3xl">{salesData.thisMonth.toLocaleString()}<span className="text-lg text-gray-400 font-normal">원</span></p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-medium">지난달 대비 +{growthRate}%</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                    <Wallet size={24} className="text-violet-400" />
                  </div>
                </div>
              </div>

              <div className="bg-[#13131f] rounded-2xl border border-white/5 p-4">
                <p className="text-gray-500 text-xs mb-1">미수금</p>
                <p className="text-red-400 font-bold text-xl">{salesData.unpaid.toLocaleString()}<span className="text-sm font-normal">원</span></p>
                <p className="text-gray-600 text-xs mt-1">2건 미입금</p>
              </div>

              <div className="bg-[#13131f] rounded-2xl border border-white/5 p-4">
                <p className="text-gray-500 text-xs mb-1">이번달 지출</p>
                <p className="text-amber-400 font-bold text-xl">{salesData.expenses.toLocaleString()}<span className="text-sm font-normal">원</span></p>
                <p className="text-gray-600 text-xs mt-1">식자재·임대료 등</p>
              </div>
            </div>

            {/* 캘린더 */}
            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <button className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <ChevronLeft size={16} className="text-gray-400" />
                </button>
                <p className="text-white font-bold text-sm">{currentMonth}</p>
                <button className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>

              {/* 요일 */}
              <div className="grid grid-cols-7 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-500'}`}>{d}</div>
                ))}
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-7 gap-1">
                {/* 4월 1일은 화요일 → 앞에 2칸 비움 */}
                {[...Array(2)].map((_, i) => <div key={`empty-${i}`} />)}
                {Object.entries(calendarData).map(([day, data]) => {
                  const dayNum = parseInt(day);
                  const isSelected = selectedDay === dayNum;
                  const bgColor = data.type === 'high' ? 'bg-violet-500/30 border-violet-500/40' :
                    data.type === 'mid' ? 'bg-blue-500/20 border-blue-500/30' :
                    data.type === 'low' ? 'bg-white/5 border-white/10' :
                    'border-white/5';

                  return (
                    <button key={day} onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                      className={`rounded-xl p-1.5 border text-center transition-all ${bgColor} ${isSelected ? 'ring-2 ring-violet-500' : ''}`}>
                      <p className={`text-xs font-bold ${data.type !== 'none' ? 'text-white' : 'text-gray-600'}`}>{dayNum}</p>
                      {data.sales > 0 && (
                        <p className="text-xs text-violet-300 font-medium leading-none mt-0.5" style={{fontSize: '9px'}}>
                          {(data.sales / 10000).toFixed(0)}만
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 범례 */}
              <div className="flex items-center gap-3 mt-4 justify-center">
                {[
                  { color: 'bg-violet-500/30', label: '30만+' },
                  { color: 'bg-blue-500/20', label: '15만+' },
                  { color: 'bg-white/5', label: '15만 미만' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                    <span className="text-gray-500 text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 선택된 날짜 상세 */}
            {selectedDay && calendarData[selectedDay] && (
              <div className="rounded-2xl bg-[#13131f] border border-violet-500/20 p-4">
                <p className="text-violet-400 text-xs font-bold mb-2">4월 {selectedDay}일 상세</p>
                {calendarData[selectedDay].sales > 0 ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-xl">{calendarData[selectedDay].sales.toLocaleString()}원</p>
                      <p className="text-gray-500 text-xs mt-0.5">일 매출</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">목표 대비</p>
                      <p className="text-emerald-400 font-bold">{((calendarData[selectedDay].sales / 300000) * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">휴무일</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 세금계산서 탭 ── */}
        {activeTab === 'invoice' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="text-white font-bold text-sm">원클릭 세금계산서</h3>
              </div>
              <p className="text-gray-400 text-xs">국세청 연동 발행 → PDF 자동 변환 → 카카오/이메일 자동 전송</p>
            </div>

            <button onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              <Plus size={16} />새 세금계산서 발행
            </button>

            {showInvoiceForm && (
              <div className="rounded-2xl bg-[#13131f] border border-emerald-500/20 p-5 space-y-3">
                <h3 className="text-white font-bold text-sm mb-3">세금계산서 작성</h3>
                {[
                  { label: '공급받는자 (거래처명)', placeholder: '예: 하랑마케팅' },
                  { label: '사업자등록번호', placeholder: '000-00-00000' },
                  { label: '공급가액', placeholder: '예: 500000' },
                  { label: '이메일', placeholder: '전송받을 이메일 주소' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="text-xs text-gray-500 mb-1.5 block">{field.label}</label>
                    <input placeholder={field.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button className="py-3 rounded-xl border border-white/10 text-gray-400 text-sm">취소</button>
                  <button className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                    <Zap size={14} />간편 발행
                  </button>
                </div>
              </div>
            )}

            {/* 발행 내역 */}
            <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-white font-bold text-sm">발행 내역</p>
              </div>
              <div className="divide-y divide-white/5">
                {invoices.map(inv => (
                  <div key={inv.id} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{inv.client}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          inv.status === '입금완료' ? 'bg-emerald-500/20 text-emerald-400' :
                          inv.status === '미수금' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>{inv.status}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{inv.id} · 마감 {inv.due}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm">{inv.amount.toLocaleString()}원</p>
                      <div className="flex gap-1 mt-1 justify-end">
                        <button className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded-lg flex items-center gap-1 transition-all">
                          <Download size={10} />PDF
                        </button>
                        <button className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded-lg flex items-center gap-1 transition-all">
                          <Send size={10} />전송
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 근태 관리 탭 ── */}
        {activeTab === 'employee' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-blue-400" />
                <h3 className="text-white font-bold text-sm">근태 & 계약 관리</h3>
              </div>
              <p className="text-gray-400 text-xs">출퇴근 기록 · 모바일 근로계약서 · 급여 자동 계산</p>
            </div>

            {/* 오늘 현황 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '출근', value: '2명', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: '근무중', value: '1명', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: '휴무', value: '1명', color: 'text-gray-400', bg: 'bg-white/5' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 border border-white/5 text-center`}>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* 직원 목록 */}
            <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-white font-bold text-sm">오늘 출퇴근 현황</p>
                <p className="text-gray-500 text-xs">2026.04.12</p>
              </div>
              <div className="divide-y divide-white/5">
                {employees.map((emp, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-400">
                      {emp.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{emp.name}</p>
                        <span className="text-xs text-gray-500">{emp.role}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock size={10} />출근 {emp.checkIn}
                        </span>
                        {emp.checkOut !== '-' && (
                          <span className="text-gray-500 text-xs">퇴근 {emp.checkOut}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-xl font-medium ${
                        emp.status === '근무중' ? 'bg-blue-500/20 text-blue-400' :
                        emp.status === '퇴근' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-white/5 text-gray-500'
                      }`}>{emp.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 이번달 급여 예상 */}
            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={15} className="text-amber-400" />
                <h3 className="text-white font-bold text-sm">이번달 급여 예상</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: '김알바', hours: '52시간', wage: 12000, total: 624000 },
                  { name: '이직원', hours: '160시간', wage: 15000, total: 2400000 },
                ].map((emp, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-400">
                      {emp.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{emp.name}</p>
                      <p className="text-gray-500 text-xs">{emp.hours} · 시급 {emp.wage.toLocaleString()}원</p>
                    </div>
                    <p className="text-amber-400 font-bold text-sm">{emp.total.toLocaleString()}원</p>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-3 flex justify-between">
                  <p className="text-gray-400 text-sm">총 급여</p>
                  <p className="text-white font-black text-lg">3,024,000원</p>
                </div>
              </div>
            </div>

            {/* 근로계약서 버튼 */}
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              <ClipboardList size={16} />모바일 근로계약서 작성
            </button>
          </>
        )}

        {/* ── 지원금 봇 탭 ── */}
        {activeTab === 'support' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={16} className="text-amber-400" />
                <h3 className="text-white font-bold text-sm">정부지원금 알림 봇</h3>
              </div>
              <p className="text-gray-400 text-xs">부천시·정부 맞춤 지원금 자동 알림 & 신청 대행 연결</p>
            </div>

            {/* AI 추천 */}
            <div className="rounded-2xl bg-[#13131f] border border-violet-500/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-violet-400" />
                <p className="text-white font-bold text-sm">AI 맞춤 추천</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                하랑마케팅 카페 기준으로 <span className="text-violet-300 font-medium">3개 지원금</span>을 신청할 수 있어요.
                이번 달 마감이 임박한 고용유지 지원금을 먼저 확인해보세요!
              </p>
            </div>

            {/* 지원금 목록 */}
            <div className="space-y-3">
              {govSupports.map((support, i) => (
                <div key={i} className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          support.category === '자금' ? 'bg-emerald-500/20 text-emerald-400' :
                          support.category === '창업' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-violet-500/20 text-violet-400'
                        }`}>{support.category}</span>
                        {support.status === '마감임박' && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium animate-pulse">마감임박!</span>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm">{support.title}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <p className="text-gray-500 text-xs">지원금액</p>
                      <p className="text-emerald-400 font-bold text-sm mt-0.5">{support.amount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <p className="text-gray-500 text-xs">신청 마감</p>
                      <p className="text-white font-bold text-sm mt-0.5">{support.deadline}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all">
                      자세히 보기
                    </button>
                    <button className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                      <Check size={12} />신청하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
