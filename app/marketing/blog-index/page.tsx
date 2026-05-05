'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { BarChart3, Zap, FileText, Eye, TrendingUp, Users, type LucideIcon } from 'lucide-react'

interface DailyVisit { date: string; count: number }
interface BlogData {
 ok: boolean; source: 'blai' | 'naver'; blaiReady?: boolean
 blogId: string; blogName: string; description: string; category: string
 latestPostDate: string; postCount: number
 visitorToday: number; visitorTotal: number; neighborCount: number
 visitorDaily: DailyVisit[]
 index: { score: number; grade: string; gradeColor: string; factors: { vScore:number; nScore:number; pScore:number; uScore:number } }
 blogUrl: string; error?: string
}

const LS_KEY = 'localution.blog_index_history_v2'
interface HistoryEntry extends BlogData { checkedAt: string }

function loadHistory(): Record<string, HistoryEntry[]> {
 if (typeof window === 'undefined') return {}
 try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveHistory(blogId: string, entry: HistoryEntry) {
 try {
 const all = loadHistory()
 if (!all[blogId]) all[blogId] = []
 all[blogId] = [entry, ...all[blogId].filter(e => e.checkedAt !== entry.checkedAt)].slice(0, 60)
 localStorage.setItem(LS_KEY, JSON.stringify(all))
 } catch {}
}

function fmtNum(n: number) {
 if (!n) return '—'
 if (n >= 10000) return (n / 10000).toFixed(1) + '만'
 return n.toLocaleString()
}
function gradeLabel(g: string) {
 return { S:'최상위 블로거', A:'파워블로거', B:'중상위 블로거', C:'일반 블로거', D:'신규/저활동' }[g] || ''
}

const CAT_MAP: Record<string, string[]> = {
 '음식·맛집':['맛집','음식','요리','카페','레스토랑','food'],
 '뷰티·미용':['뷰티','미용','헤어','네일','피부','beauty','hair'],
 '건강·의료':['건강','의료','병원','운동','헬스','diet'],
 '여행·관광':['여행','관광','호텔','펜션','travel'],
 '교육':['교육','학원','강의','공부','education'],
 '패션·쇼핑':['패션','쇼핑','옷','fashion'],
 '생활·인테리어':['인테리어','생활','홈','interior'],
 '육아·가족':['육아','아기','아이','육아','baby'],
 '경제·비즈니스':['비즈니스','마케팅','창업','투자','business'],
 'IT·기술':['IT','개발','프로그래밍','tech'],
}
function detectCat(cat: string, name: string, desc: string) {
 const t = (cat+' '+name+' '+desc).toLowerCase()
 for (const [k,v] of Object.entries(CAT_MAP)) if (v.some(w=>t.includes(w))) return k
 return cat || '일반'
}

// 방문자 그래프 (미니 바 차트)
function VisitorGraph({ daily, today }: { daily: DailyVisit[]; today: number }) {
 const data = daily.length > 0 ? daily : []
 if (data.length === 0 && today === 0) {
 return (
 <div className="flex flex-col items-center justify-center h-20 text-[#C9D0D8] text-xs">
 <p>방문자 그래프는 조회를 반복하면 쌓입니다</p>
 <p className="text-[10px] mt-0.5">매일 조회 시 30일 트렌드 차트 자동 생성</p>
 </div>
 )
 }
 const max = Math.max(...data.map(d => d.count), today, 1)
 return (
 <div className="flex flex-col gap-1">
 <div className="flex items-end gap-0.5 h-16">
 {data.slice(-30).map((d, i) => {
 const h = Math.max(3, Math.round((d.count / max) * 60))
 return (
 <div key={i} className="flex-1 flex flex-col justify-end" title={d.date + ': ' + d.count.toLocaleString() + '명'}>
 <div className="w-full rounded-t-sm bg-[#3182F6]/60 hover:bg-[#3182F6] transition-colors" style={{ height: h + 'px' }} />
 </div>
 )
 })}
 {today > 0 && (
 <div className="flex-1 flex flex-col justify-end" title={'오늘: ' + today.toLocaleString() + '명'}>
 <div className="w-full rounded-t-sm bg-[#F04452]" style={{ height: Math.max(3, Math.round((today / max) * 60)) + 'px' }} />
 </div>
 )}
 </div>
 <div className="flex justify-between text-[9px] text-[#C9D0D8]">
 <span>{data[0]?.date?.slice(5) || ''}</span>
 <span className="text-[#F04452] font-semibold">오늘 {today > 0 ? today.toLocaleString() : '—'}</span>
 </div>
 </div>
 )
}

export default function BlogIndexPage() {
 const [input, setInput] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string|null>(null)
 const [data, setData] = useState<BlogData|null>(null)
 const [recentList, setRecentList] = useState<{blogId:string;blogName:string;grade:string;gradeColor:string;score:number}[]>([])
 const [graphData, setGraphData] = useState<DailyVisit[]>([])

 const doFetch = useCallback(async (urlOrId: string) => {
 const val = urlOrId.trim()
 if (!val) return
 setLoading(true); setError(null); setData(null)
 try {
 const r = await fetch('/api/marketing/blog-index?url=' + encodeURIComponent(val))
 const j: BlogData = await r.json()
 if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status)

 // 히스토리에 저장 + 이전 방문자 데이터 병합
 const checkedAt = new Date().toISOString()
 const entry: HistoryEntry = { ...j, checkedAt }
 saveHistory(j.blogId, entry)

 // 저장된 히스토리에서 일일 방문자 그래프 데이터 생성
 const all = loadHistory()
 const hist = all[j.blogId] || []
 const merged: DailyVisit[] = j.visitorDaily.length > 0
 ? j.visitorDaily
 : hist.map(h => ({
 date: h.checkedAt.slice(0, 10),
 count: h.visitorToday || h.visitorTotal || 0,
 })).filter(d => d.count > 0).reverse()
 setGraphData(merged)

 setData(j)
 setRecentList(prev => [
 { blogId: j.blogId, blogName: j.blogName, grade: j.index.grade, gradeColor: j.index.gradeColor, score: j.index.score },
 ...prev.filter(p => p.blogId !== j.blogId)
 ].slice(0, 8))
 } catch (e) {
 setError(e instanceof Error ? e.message : '오류 발생')
 } finally {
 setLoading(false)
 }
 }, [])

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-4 md:pt-0">
 <PageHeader icon={<BarChart3 size={28} className="text-white" strokeWidth={2.5} />} title="블로그 지수조회"
 subtitle="방문자 · 이웃 · 최신화 · 지수를 한눈에 — 조회 반복 시 방문자 그래프 자동 축적"
 variant="sky" />

 <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-4">

 {/* 입력 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <p className="text-sm font-bold text-[#191F28] mb-3">블로그 URL 또는 아이디</p>
 <div className="flex gap-2">
 <input value={input} onChange={e => setInput(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && doFetch(input)}
 placeholder="blog.naver.com/아이디 또는 아이디만 입력"
 className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]" />
 <button onClick={() => doFetch(input)} disabled={loading || !input.trim()}
 className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold hover:bg-[#1B64DA] disabled:opacity-40 transition-colors whitespace-nowrap">
 {loading ? '분석 중…' : '분석하기'}
 </button>
 </div>
 </div>

 {/* BLAI 연동 준비 배너 */}
 {data?.blaiReady && (
 <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
 <Zap size={16} className="text-[#92400E]" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <p className="text-xs font-bold text-[#92400E]">더 정확한 데이터: 블라이(BLAI) API 연동</p>
 <p className="text-[11px] text-[#B45309] mt-0.5">blai.co.kr에서 API Key 발급 후 .env.local에 BLAI_API_KEY 추가하면 공식 지수·일일방문자 데이터로 전환됩니다</p>
 </div>
 <a href="https://blai.co.kr" target="_blank" rel="noopener noreferrer"
 className="shrink-0 text-[11px] text-[#D97706] font-semibold hover:underline">발급 →</a>
 </div>
 )}

 {error && <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-sm text-[#E11D48]">{error}</div>}

 {data && (
 <div className="space-y-3">

 {/* 블로그 헤더 */}
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 flex items-start gap-4">
 <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
 <FileText size={22} className="text-[#3182F6]" strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-base font-black text-[#191F28]">{data.blogName}</p>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0369A1] font-semibold border border-[#BAE6FD]">
 {detectCat(data.category, data.blogName, data.description)}
 </span>
 {data.source === 'blai' && (
 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold">BLAI</span>
 )}
 </div>
 <p className="text-[12px] text-[#8B95A1] mt-0.5">@{data.blogId}</p>
 {data.description && <p className="text-xs text-[#4E5968] mt-1 line-clamp-2">{data.description}</p>}
 <a href={data.blogUrl} target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#3182F6] hover:underline">블로그 바로가기 ↗</a>
 </div>
 </div>

 {/* 지수 + 방문자 그래프 나란히 */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

 {/* 블로그 지수 */}
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
 <p className="text-xs font-bold text-[#8B95A1] mb-3">블로그 지수</p>
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0"
 style={{ background: data.index.gradeColor+'18', border:'3px solid '+data.index.gradeColor }}>
 <span className="text-xl font-black" style={{ color:data.index.gradeColor }}>{data.index.grade}</span>
 <span className="text-[10px] font-bold" style={{ color:data.index.gradeColor }}>{data.index.score}점</span>
 </div>
 <div className="flex-1">
 <p className="text-sm font-bold text-[#191F28]">{gradeLabel(data.index.grade)}</p>
 <div className="mt-1.5 bg-[#F2F4F6] rounded-full h-2 overflow-hidden">
 <div className="h-full rounded-full" style={{ width:data.index.score+'%', background:data.index.gradeColor }} />
 </div>
 <div className="mt-2 grid grid-cols-4 gap-0.5">
 {[['방문자',data.index.factors.vScore,40],['이웃',data.index.factors.nScore,30],['글수',data.index.factors.pScore,20],['최신화',data.index.factors.uScore,10]].map(([l,s,m])=>(
 <div key={String(l)} className="text-center">
 <div className="text-[9px] text-[#8B95A1]">{l}</div>
 <div className="text-[11px] font-bold text-[#191F28]">{s}<span className="text-[#C9D0D8] font-normal">/{m}</span></div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* 방문자 그래프 */}
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
 <div className="flex items-center justify-between mb-3">
 <p className="text-xs font-bold text-[#8B95A1]">방문자 트렌드</p>
 <div className="flex items-center gap-2 text-[10px]">
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#3182F6]/60 inline-block"/>과거</span>
 <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F04452] inline-block"/>오늘</span>
 </div>
 </div>
 <VisitorGraph daily={graphData} today={data.visitorToday} />
 </div>
 </div>

 {/* 통계 카드 4개 */}
 <div className="grid grid-cols-2 gap-3">
 {([
 { label:'일일 방문자', value: data.visitorToday ? fmtNum(data.visitorToday)+'명' : '—', Icon: Eye, color:'#F04452', bg:'#FFF1F2', sub:'오늘 기준' },
 { label:'누적 방문자', value: fmtNum(data.visitorTotal)+(data.visitorTotal?'명':''), Icon: TrendingUp, color:'#3182F6', bg:'#EFF6FF', sub:'전체 누적' },
 { label:'이웃 수', value: fmtNum(data.neighborCount)+(data.neighborCount?'명':''), Icon: Users, color:'#12B76A', bg:'#ECFDF5', sub:'서로이웃 포함' },
 { label:'전체 글 수', value: data.postCount ? data.postCount+'개+' : '—', Icon: FileText, color:'#7C3AED', bg:'#F5F3FF', sub:'RSS 기준' },
 ] as { label: string; value: string; Icon: LucideIcon; color: string; bg: string; sub: string }[]).map(item => (
 <div key={item.label} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:item.bg, color:item.color }}>
 <item.Icon size={18} strokeWidth={2.5} />
 </div>
 <div>
 <p className="text-[11px] text-[#8B95A1]">{item.label}</p>
 <p className="text-base font-black" style={{ color:item.color }}>{item.value}</p>
 <p className="text-[10px] text-[#C9D0D8]">{item.sub}</p>
 </div>
 </div>
 ))}
 </div>

 {/* 최근 포스팅 */}
 {data.latestPostDate && (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] px-4 py-3 flex items-center gap-3">
 <span className="text-lg"></span>
 <div>
 <p className="text-xs text-[#8B95A1]">최근 포스팅</p>
 <p className="text-sm font-bold text-[#191F28]">{data.latestPostDate}</p>
 </div>
 </div>
 )}

 <p className="text-[11px] text-[#C9D0D8] text-center">
 * 공개된 정보 기반 추정 · 네이버 공식 지표와 다를 수 있음 · 매일 조회 시 그래프가 쌓입니다
 </p>
 </div>
 )}

 {/* 최근 조회 목록 */}
 {!data && recentList.length > 0 && (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
 <p className="text-xs font-bold text-[#8B95A1] mb-3">최근 조회</p>
 <div className="space-y-1.5">
 {recentList.map(h => (
 <button key={h.blogId} onClick={() => { setInput('blog.naver.com/'+h.blogId); doFetch(h.blogId) }}
 className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors text-left">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
 style={{ background:h.gradeColor+'18', color:h.gradeColor }}>{h.grade}</div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-[#191F28] truncate">{h.blogName}</p>
 <p className="text-[11px] text-[#8B95A1]">@{h.blogId} · {h.score}점</p>
 </div>
 <span className="text-[11px] text-[#3182F6]">다시조회</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 <Footer />
 </main>
 </div>
 )
}
