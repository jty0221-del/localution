'use client'

// ============================================================
// QR 분석 리포트 (2-F)
//   · /api/qr/stats 데이터를 recharts 로 시각화
//   · KPI 인포그래픽 + 라인차트 + 파이차트 + 시간대 히트맵
//   · 자동 인사이트 텍스트 + PDF/이미지 다운로드 (window.print)
//   · 모바일 최적화 — 카드 1열, 차트 반응형
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Eye, Sparkles, CheckCircle2,
  Download, Calendar, Smartphone, Monitor, Tablet,
  Lightbulb, Trophy, Activity, Users, Target,
  Flame, ThumbsUp, Star, type LucideIcon,
} from 'lucide-react'

const COLOR = {
  primary: '#3182F6',
  purple:  '#7C3AED',
  green:   '#059669',
  amber:   '#F59E0B',
  red:     '#DC2626',
  gray:    '#8B95A1',
}

type DailyRow = { date: string; scan: number; submit: number; ai: number }
type StatsResponse = {
  ok: boolean
  period: { days: number; since: string }
  counts: Record<string, number>
  funnel: { scan: number; ai_generated: number; submitted: number; scan_to_ai_rate: number; ai_to_submit_rate: number; overall_rate: number }
  unique_visitors: number
  devices: Record<string, number>
  daily: DailyRow[]
  recent: any[]
}

export default function QRReportPanel({ storeName }: { storeName?: string }) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/qr/stats?days=' + days, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!cancelled && j?.ok) setStats(j) })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days])

  // ── 지표 계산 (메모이제이션) ─────────────────────────
  const metrics = useMemo(() => {
    const f = stats?.funnel || { scan: 0, ai_generated: 0, submitted: 0, scan_to_ai_rate: 0, ai_to_submit_rate: 0, overall_rate: 0 }
    const daily = stats?.daily || []
    const halfIdx = Math.floor(daily.length / 2)
    const firstHalf = daily.slice(0, halfIdx).reduce((s, d) => s + d.scan + d.submit, 0)
    const secondHalf = daily.slice(halfIdx).reduce((s, d) => s + d.scan + d.submit, 0)
    const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0

    const totalEvents = Object.values(stats?.counts || {}).reduce((s, n) => s + (n as number), 0)
    const peakDay = daily.reduce((max, d) => (d.scan > max.scan ? d : max), { date: '-', scan: 0, submit: 0, ai: 0 } as DailyRow)
    return { ...f, trend, totalEvents, peakDay }
  }, [stats])

  // ── 디바이스 파이 데이터 ─────────────────────────
  const deviceData = useMemo(() => {
    const d = stats?.devices || { mobile: 0, tablet: 0, desktop: 0 }
    return [
      { name: '모바일', value: d.mobile || 0, color: COLOR.primary, icon: Smartphone },
      { name: '태블릿', value: d.tablet || 0, color: COLOR.purple, icon: Tablet },
      { name: 'PC',     value: d.desktop || 0, color: COLOR.green, icon: Monitor },
    ].filter(x => x.value > 0)
  }, [stats])

  // ── 시간대 분포 (recent 활동에서 시간대 집계) ─────────────────────────
  const hourlyData = useMemo(() => {
    const rows = stats?.recent || []
    const hours: number[] = new Array(24).fill(0)
    for (const r of rows) {
      const h = new Date(r.created_at).getHours()
      if (!isNaN(h)) hours[h] += 1
    }
    return hours.map((v, h) => ({ hour: h + '시', count: v }))
  }, [stats])

  // ── 자동 인사이트 ─────────────────────────
  const insights = useMemo(() => {
    if (!stats) return []
    const list: { Icon: LucideIcon; text: string; tone: 'good' | 'warn' | 'info' }[] = []
    const m = metrics
    if (m.scan === 0) {
      list.push({ Icon: Sparkles, text: '아직 스캔 활동이 없어요. QR을 매장에 비치하고 손님께 안내해보세요', tone: 'info' })
      return list
    }
    if (m.overall_rate >= 30) list.push({ Icon: Flame, text: `전체 전환율 ${m.overall_rate}% — 우수해요 (업계 평균 15-20%)`, tone: 'good' })
    else if (m.overall_rate >= 15) list.push({ Icon: ThumbsUp, text: `전체 전환율 ${m.overall_rate}% — 양호한 수준입니다`, tone: 'good' })
    else list.push({ Icon: Lightbulb, text: `전체 전환율 ${m.overall_rate}% — 리워드 강화 또는 QR 위치 개선을 고려해보세요`, tone: 'warn' })

    if (m.trend > 10) list.push({ Icon: TrendingUp, text: `최근 활동이 ${m.trend}% 증가하고 있어요`, tone: 'good' })
    else if (m.trend < -10) list.push({ Icon: TrendingDown, text: `최근 활동이 ${Math.abs(m.trend)}% 감소했어요. 재방문 이벤트를 진행해보세요`, tone: 'warn' })

    if (m.peakDay.scan > 0) list.push({ Icon: Star, text: `${m.peakDay.date.slice(5)}일이 가장 활발했어요 (스캔 ${m.peakDay.scan}회)`, tone: 'info' })

    const mobilePct = stats.devices.mobile && metrics.totalEvents
      ? Math.round((stats.devices.mobile / Object.values(stats.devices).reduce((a, b) => a + b, 0)) * 100)
      : 0
    if (mobilePct >= 80) list.push({ Icon: Smartphone, text: `모바일 사용자가 ${mobilePct}% — QR 위주 마케팅이 효과적이에요`, tone: 'info' })

    return list
  }, [stats, metrics])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full mb-3" />
        <p className="text-sm text-[#8B95A1]">분석 리포트 준비 중…</p>
      </div>
    )
  }

  if (!stats || metrics.scan === 0) {
    return (
      <div className="bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] rounded-2xl p-12 text-center border border-[#E5E8EB]">
        <Activity className="w-12 h-12 text-[#C9CDD2] mx-auto mb-3" />
        <h3 className="font-bold text-[#191F28] mb-1">아직 분석할 데이터가 없어요</h3>
        <p className="text-sm text-[#8B95A1] mb-4">QR을 매장에 비치하면 자동으로 데이터가 수집돼요.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-xs text-[#4E5968] border border-[#E5E8EB]">
          <Lightbulb size={12} className="text-[#F59E0B]" />
          QR 인쇄물은 업체 설정 탭 하단의 추천 상품을 활용하세요
        </div>
      </div>
    )
  }

  return (
    <div ref={reportRef} className="space-y-6">
      {/* 헤더 — 기간선택 + 다운로드 */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
            <Activity size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-black text-[#191F28] leading-tight">QR 분석 리포트</h2>
            <p className="text-[11px] text-[#8B95A1]">{storeName ? storeName + ' · ' : ''}최근 {days}일 활동 분석</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  days === d ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1]'
                }`}>{d}일</button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#191F28] text-white text-xs font-bold hover:bg-[#333D4B] transition-colors">
            <Download size={12} strokeWidth={2.5} /> 리포트 저장
          </button>
        </div>
      </div>

      {/* 인쇄 시 표시되는 헤더 */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-black text-[#191F28]">QR 분석 리포트</h1>
        <p className="text-sm text-[#4E5968]">
          {storeName} · 최근 {days}일 ({stats.period.since.slice(0, 10)} ~ {new Date().toISOString().slice(0, 10)})
        </p>
      </div>

      {/* ── KPI 4개 인포그래픽 카드 ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="총 스캔" value={metrics.scan} sub={`고유 방문자 ${stats.unique_visitors}명`} color={COLOR.primary} trend={metrics.trend} />
        <KpiCard icon={Sparkles} label="AI 리뷰 생성" value={metrics.ai_generated} sub={`전환율 ${metrics.scan_to_ai_rate}%`} color={COLOR.purple} />
        <KpiCard icon={CheckCircle2} label="실제 등록" value={metrics.submitted} sub={`전환율 ${metrics.ai_to_submit_rate}%`} color={COLOR.green} />
        <KpiCard icon={Target} label="전체 전환율" value={metrics.overall_rate + '%'} sub="스캔 → 등록" color={COLOR.amber} />
      </div>

      {/* ── 자동 인사이트 ──────────────────────────── */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-5 border border-[#FCD34D]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-[#D97706]" strokeWidth={2.5} />
            <h3 className="font-black text-[#92400E] text-sm">AI 인사이트</h3>
          </div>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <ins.Icon size={14} className="flex-shrink-0" strokeWidth={2.5} />
                <p className={`leading-relaxed ${ins.tone === 'good' ? 'text-[#065F46]' : ins.tone === 'warn' ? 'text-[#92400E]' : 'text-[#1E40AF]'}`}>
                  {ins.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 일별 활동 추이 (라인 차트) ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#3182F6]" strokeWidth={2.5} />
          <h3 className="font-black text-[#191F28]">일별 활동 추이</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradScan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradSubmit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.green} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLOR.green} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8B95A1' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#8B95A1' }} />
              <Tooltip
                contentStyle={{ background: '#191F28', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="scan" name="스캔" stroke={COLOR.primary} strokeWidth={2} fill="url(#gradScan)" />
              <Area type="monotone" dataKey="ai" name="AI 생성" stroke={COLOR.purple} strokeWidth={2} fill="transparent" />
              <Area type="monotone" dataKey="submit" name="등록" stroke={COLOR.green} strokeWidth={2} fill="url(#gradSubmit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 디바이스 분포 + 시간대 ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 디바이스 도넛 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#7C3AED]" strokeWidth={2.5} />
            <h3 className="font-black text-[#191F28]">디바이스 분포</h3>
          </div>
          {deviceData.length === 0 ? (
            <p className="text-sm text-[#8B95A1] text-center py-8">데이터 없음</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                      {deviceData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#191F28', border: 'none', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {deviceData.map((d, i) => {
                  const total = deviceData.reduce((s, x) => s + x.value, 0)
                  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                  const Icon = d.icon
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: d.color + '15' }}>
                        <Icon size={14} style={{ color: d.color }} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#191F28]">{d.name}</p>
                        <p className="text-[10px] text-[#8B95A1]">{d.value}회 · {pct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 시간대별 활동 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-[#F59E0B]" strokeWidth={2.5} />
            <h3 className="font-black text-[#191F28]">시간대별 활동</h3>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#8B95A1' }} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: '#8B95A1' }} />
                <Tooltip
                  contentStyle={{ background: '#191F28', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }} />
                <Bar dataKey="count" name="활동" fill={COLOR.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#8B95A1] text-center mt-1">최근 활동 기준 시간대 분포</p>
        </div>
      </div>

      {/* ── 퍼널 (스캔 → AI → 등록) ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-[#F59E0B]" strokeWidth={2.5} />
          <h3 className="font-black text-[#191F28]">전환 퍼널</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'QR 스캔', value: metrics.scan, max: metrics.scan, color: COLOR.primary, icon: Eye },
            { label: 'AI 리뷰 생성', value: metrics.ai_generated, max: metrics.scan, color: COLOR.purple, icon: Sparkles, dropRate: metrics.scan - metrics.ai_generated },
            { label: '실제 등록', value: metrics.submitted, max: metrics.scan, color: COLOR.green, icon: CheckCircle2, dropRate: metrics.ai_generated - metrics.submitted },
          ].map((step, i) => {
            const pct = step.max > 0 ? Math.round((step.value / step.max) * 100) : 0
            const Icon = step.icon
            return (
              <div key={i}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: step.color + '15' }}>
                    <Icon size={14} style={{ color: step.color }} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#191F28]">{step.label}</span>
                    <span className="text-sm font-black" style={{ color: step.color }}>{step.value}</span>
                  </div>
                </div>
                <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden ml-11">
                  <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: step.color, minWidth: step.value > 0 ? '4px' : 0 }} />
                </div>
                <div className="flex items-center justify-between ml-11 mt-1">
                  <span className="text-[10px] text-[#8B95A1]">{pct}%</span>
                  {i > 0 && step.dropRate !== undefined && step.dropRate > 0 && (
                    <span className="text-[10px] text-[#DC2626]">−{step.dropRate}명 이탈</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 플랫폼별 등록 분포 ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-[#059669]" strokeWidth={2.5} />
          <h3 className="font-black text-[#191F28]">플랫폼별 리뷰 등록</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'submitted_naver', l: '네이버', color: '#03C75A' },
            { k: 'submitted_google', l: '구글', color: '#4285F4' },
            { k: 'submitted_kakao', l: '카카오', color: '#FEE500' },
          ].map(p => {
            const v = stats.counts[p.k] || 0
            const pct = metrics.submitted > 0 ? Math.round((v / metrics.submitted) * 100) : 0
            return (
              <div key={p.k} className="text-center p-4 rounded-xl border-2" style={{ borderColor: p.color + '30', background: p.color + '08' }}>
                <div className="w-9 h-9 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ background: p.color === '#FEE500' ? '#FEF3C7' : p.color + '20' }}>
                  <CheckCircle2 size={18} style={{ color: p.color === '#FEE500' ? '#A16207' : p.color }} strokeWidth={2.5} />
                </div>
                <p className="text-xs font-bold text-[#191F28]">{p.l}</p>
                <p className="text-2xl font-black mt-1" style={{ color: p.color === '#FEE500' ? '#A16207' : p.color }}>{v}</p>
                <p className="text-[10px] text-[#8B95A1]">{pct}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 인쇄용 푸터 */}
      <div className="hidden print:block text-center pt-6 border-t border-[#E5E8EB]">
        <p className="text-[10px] text-[#8B95A1]">
          본 리포트는 로컬루션 (localution.co.kr) 에서 자동 생성되었습니다 · {new Date().toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 인쇄 CSS */}
      <style jsx global>{`
        @media print {
          body { background: white; }
          aside, nav, header, footer, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .shadow-sm { box-shadow: none !important; border: 1px solid #E5E8EB !important; }
        }
      `}</style>
    </div>
  )
}

// ─── KPI 카드 ───────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: number | string; sub: string; color: string; trend?: number
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10" style={{ background: color, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
          <Icon size={14} style={{ color }} strokeWidth={2.5} />
        </div>
        <p className="text-[11px] text-[#8B95A1] font-medium">{label}</p>
      </div>
      <p className="text-2xl font-black text-[#191F28] leading-none mb-1">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#8B95A1]">{sub}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
