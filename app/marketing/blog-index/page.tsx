'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'

interface BlogIndex {
  ok: boolean
  blogId: string
  blogName: string
  description: string
  category: string
  latestPostDate: string
  postCount: number
  visitorToday: number
  visitorTotal: number
  neighborCount: number
  index: {
    score: number
    grade: string
    gradeColor: string
    factors: { vScore: number; nScore: number; pScore: number; uScore: number }
  }
  blogUrl: string
  error?: string
}

function gradeLabel(grade: string) {
  return { S: '최상위 블로그', A: '상위 블로그', B: '중상위 블로그', C: '중위 블로그', D: '하위 블로그' }[grade] || ''
}
function fmtNum(n: number) {
  if (!n) return '—'
  if (n >= 10000) return (n / 10000).toFixed(1) + '만'
  return n.toLocaleString()
}

// 업종별 카테고리 매핑
const CATEGORY_MAP: Record<string, string[]> = {
  '음식·맛집': ['맛집', '음식', '요리', '레스토랑', '카페', '술집', '베이커리', 'food', 'restaurant'],
  '뷰티·미용': ['뷰티', '미용', '헤어', '네일', '피부', '화장품', '스킨케어', 'beauty', 'hair', 'nail'],
  '건강·의료': ['건강', '의료', '병원', '한의원', '다이어트', '운동', '헬스', 'health', 'medical'],
  '여행·관광': ['여행', '관광', '호텔', '펜션', '투어', 'travel', 'trip'],
  '교육': ['교육', '학원', '강의', '공부', 'education', 'study'],
  '패션·쇼핑': ['패션', '쇼핑', '옷', '의류', 'fashion', 'shopping'],
  '생활·인테리어': ['인테리어', '생활', '집꾸미기', '홈', 'interior', 'home'],
  '육아·가족': ['육아', '아기', '아이', '가족', '임신', 'baby', 'parenting'],
  '경제·비즈니스': ['비즈니스', '마케팅', '창업', '재테크', '투자', 'business', 'marketing'],
  'IT·기술': ['IT', '개발', '프로그래밍', '앱', '컴퓨터', 'tech', 'developer'],
}

function detectCategory(category: string, blogName: string, description: string): string {
  const text = (category + ' ' + blogName + ' ' + description).toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) return cat
  }
  return category || '일반'
}

export default function BlogIndexPage() {
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [data, setData]     = useState<BlogIndex | null>(null)
  const [history, setHistory] = useState<BlogIndex[]>([])

  async function fetchIndex() {
    const url = input.trim()
    if (!url) return
    setLoading(true); setError(null); setData(null)
    try {
      const r = await fetch('/api/marketing/blog-index?url=' + encodeURIComponent(url))
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status)
      setData(j)
      setHistory(prev => [j, ...prev.filter(h => h.blogId !== j.blogId)].slice(0, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0">
        <PageHeader icon="📊" title="블로그 지수조회"
          subtitle="네이버 블로그 링크를 입력하면 방문자·이웃·최신화·블로그 지수를 분석합니다"
          variant="sky" />

        <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">

          {/* 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5 mb-4">
            <p className="text-sm font-bold text-[#191F28] mb-3">블로그 URL 입력</p>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchIndex()}
                placeholder="https://blog.naver.com/아이디"
                className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
              />
              <button onClick={fetchIndex} disabled={loading || !input.trim()}
                className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold hover:bg-[#1B64DA] disabled:opacity-40 transition-colors whitespace-nowrap">
                {loading ? '조회 중…' : '분석하기'}
              </button>
            </div>
            <p className="text-[11px] text-[#8B95A1] mt-2">예: blog.naver.com/아이디 · 아이디만 입력도 가능</p>
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-sm text-[#E11D48] mb-4">{error}</div>
          )}

          {/* 결과 */}
          {data && (
            <div className="space-y-3">
              {/* 블로그 기본 정보 */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#EFF6FF] shrink-0">📝</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-black text-[#191F28]">{data.blogName}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0369A1] font-semibold border border-[#BAE6FD]">
                        {detectCategory(data.category, data.blogName, data.description)}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mt-0.5">@{data.blogId}</p>
                    {data.description && <p className="text-xs text-[#4E5968] mt-1 line-clamp-2">{data.description}</p>}
                    <a href={data.blogUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#3182F6] hover:underline">
                      블로그 바로가기 ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* 블로그 지수 */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-[#191F28]">블로그 지수</p>
                  <span className="text-[11px] text-[#8B95A1]">0~100점 기준</span>
                </div>
                <div className="flex items-center gap-5">
                  {/* 등급 원 */}
                  <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center shrink-0"
                    style={{ background: data.index.gradeColor + '18', border: '3px solid ' + data.index.gradeColor }}>
                    <span className="text-2xl font-black" style={{ color: data.index.gradeColor }}>{data.index.grade}</span>
                    <span className="text-[10px] font-semibold" style={{ color: data.index.gradeColor }}>{data.index.score}점</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#191F28]">{gradeLabel(data.index.grade)}</p>
                    {/* 점수 바 */}
                    <div className="mt-2 bg-[#F2F4F6] rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: data.index.score + '%', background: data.index.gradeColor }} />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {[
                        { label: '방문자', score: data.index.factors.vScore, max: 40 },
                        { label: '이웃',   score: data.index.factors.nScore, max: 30 },
                        { label: '글 수',  score: data.index.factors.pScore, max: 20 },
                        { label: '최신화', score: data.index.factors.uScore, max: 10 },
                      ].map(f => (
                        <div key={f.label} className="text-center">
                          <div className="text-[10px] text-[#8B95A1] mb-0.5">{f.label}</div>
                          <div className="text-[11px] font-bold text-[#191F28]">{f.score}<span className="text-[#C9D0D8] font-normal">/{f.max}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '누적 방문자', value: fmtNum(data.visitorTotal), icon: '👁', color: '#3182F6', bg: '#EFF6FF' },
                  { label: '이웃 수',     value: fmtNum(data.neighborCount), icon: '🤝', color: '#12B76A', bg: '#ECFDF5' },
                  { label: '전체 글 수',  value: data.postCount ? data.postCount + '개+' : '—', icon: '📄', color: '#7C3AED', bg: '#F5F3FF' },
                  { label: '최근 포스팅', value: data.latestPostDate || '—', icon: '🗓', color: '#F59E0B', bg: '#FFFBEB' },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: item.bg }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[11px] text-[#8B95A1] font-medium">{item.label}</p>
                      <p className="text-base font-black mt-0.5" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#C9D0D8] text-center">
                * 블로그 지수는 공개된 정보 기반 자체 알고리즘 추정값입니다 · 네이버 공식 지표와 다를 수 있음
              </p>
            </div>
          )}

          {/* 최근 조회 이력 */}
          {!data && history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4">
              <p className="text-xs font-bold text-[#8B95A1] mb-3">최근 조회</p>
              <div className="space-y-2">
                {history.map(h => (
                  <button key={h.blogId} onClick={() => { setInput(h.blogUrl); setData(h) }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: h.index.gradeColor + '18', color: h.index.gradeColor }}>
                      {h.index.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#191F28] truncate">{h.blogName}</p>
                      <p className="text-[11px] text-[#8B95A1]">@{h.blogId} · {h.index.score}점</p>
                    </div>
                    <span className="text-[11px] text-[#3182F6]">다시보기</span>
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
