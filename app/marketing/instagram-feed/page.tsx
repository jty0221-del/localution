'use client'

// ============================================================
// /marketing/instagram-feed — 인스타그램 피드 자동 발행
//   · 매장 사진 업로드 → AI 캡션 + 해시태그 자동 생성
//   · 즉시 발행 / 예약 발행
//   · 스레드·카드뉴스와 동일 발행 채널 패턴
// ============================================================
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import {
  Instagram, Upload, Sparkles, Hash, Calendar, Send, Image as ImageIcon,
  AlertCircle, X, Plus, ArrowRight, Lightbulb, Camera,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type FeedDraft = {
  caption: string
  hashtags: string[]
  scheduledAt: string | null
  imageDataUrls: string[]
}

const STORAGE_KEY = 'localution.instagram_feed_drafts'
const MAX_IMAGES = 10
const MAX_CAPTION = 2200
const TONE_OPTIONS = [
  { id: 'casual', label: '편안한', desc: '동네 단골에게 말하듯' },
  { id: 'inspirational', label: '감성', desc: '은은한 무드로' },
  { id: 'energetic', label: '에너지', desc: '활기차게' },
  { id: 'professional', label: '전문', desc: '메뉴/서비스 강조' },
] as const

export default function InstagramFeedPage() {
  const [images, setImages] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [tone, setTone] = useState<typeof TONE_OPTIONS[number]['id']>('casual')
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [drafts, setDrafts] = useState<FeedDraft[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { setDrafts(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch {}
    }
  }, [])

  function addImage(file: File) {
    if (images.length >= MAX_IMAGES) return
    const reader = new FileReader()
    reader.onload = () => setImages(prev => [...prev, reader.result as string])
    reader.readAsDataURL(file)
  }
  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function generateCaption() {
    if (generating) return
    setGenerating(true)
    try {
      // 베타: 클라이언트 mock 생성. AI 연동 시 /api/instagram/caption 호출
      await new Promise(r => setTimeout(r, 1500))
      const moods: Record<string, { caption: string; tags: string[] }> = {
        casual: {
          caption: `오늘도 우리 매장 들러주신 손님들 덕분에 행복한 하루였어요${topic ? '\n\n' + topic : ''}\n\n언제든 편하게 오세요. 늘 같은 마음으로 준비할게요.`,
          tags: ['#동네맛집', '#단골카페', '#일상', '#소소한행복'],
        },
        inspirational: {
          caption: `평범한 하루를 특별하게 만드는 작은 순간들${topic ? '\n\n' + topic : ''}\n\n조용히 머물다 가실 수 있는 공간이 되겠습니다.`,
          tags: ['#감성카페', '#무드', '#오늘의기분', '#힐링'],
        },
        energetic: {
          caption: `오늘 진짜 핫한 메뉴 공개합니다${topic ? '\n\n' + topic : ''}\n\n다 드시고 가시면 후회 안 할 거예요. 빨리 와서 직접 느껴보세요!`,
          tags: ['#신메뉴', '#오픈런', '#핫플레이스', '#오늘뭐먹지'],
        },
        professional: {
          caption: `매일 새벽 직접 준비한 신선한 재료로${topic ? ' ' + topic : ''} 정성을 담아 만들어 드립니다.\n\n작은 디테일까지 신경 쓴 한 잔/한 접시, 직접 느껴보세요.`,
          tags: ['#수제', '#국내산', '#정성', '#사장님맛집'],
        },
      }
      const m = moods[tone]
      setCaption(m.caption)
      setHashtags(m.tags)
    } finally {
      setGenerating(false)
    }
  }

  function addHashtag(tag: string) {
    const clean = tag.replace(/^#?/, '#').replace(/\s+/g, '')
    if (clean.length < 2 || hashtags.includes(clean)) return
    setHashtags(prev => [...prev, clean])
  }
  function removeHashtag(t: string) {
    setHashtags(prev => prev.filter(x => x !== t))
  }

  function saveDraft() {
    const draft: FeedDraft = { caption, hashtags, scheduledAt: scheduledAt || null, imageDataUrls: images }
    const next = [draft, ...drafts].slice(0, 10)
    setDrafts(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    alert('초안 저장됨')
  }

  const charCount = caption.length + hashtags.join(' ').length

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<Instagram size={28} className="text-white" strokeWidth={2.5} />}
          title="인스타그램 피드 자동"
          subtitle="사진 업로드 → AI 캡션 + 해시태그 자동 생성 → 즉시 또는 예약 발행"
          variant="pink"
        />

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

          {/* 베타 안내 */}
          <div className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] to-[#FCE7F3] p-3 md:p-4 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-[#7C3AED] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-bold text-[#7C3AED] mb-0.5">인스타그램 피드 자동 발행 베타</p>
              <p className="text-[11px] md:text-xs text-[#7C3AED]/90 leading-relaxed">
                현재는 캡션 / 해시태그 자동 생성 + 초안 저장이 가능합니다.
                메타 비즈니스 API 직접 발행 연동은 곧 추가됩니다.
                지금은 초안을 복사 → 인스타그램 앱에서 붙여넣기로 게시하세요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 md:gap-6">
            {/* 메인 작성 영역 */}
            <div className="space-y-4 md:space-y-6">
              {/* 1) 사진 업로드 */}
              <Section
                step="1"
                title="사진 업로드"
                desc={`최대 ${MAX_IMAGES}장 — 정사각형 1:1 또는 세로 4:5 권장`}
              >
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6] group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-[#E5E8EB] hover:border-[#EC4899] hover:bg-[#FCE7F3]/30 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Plus size={20} className="text-[#8B95A1] mb-1" strokeWidth={2.5} />
                      <span className="text-[10px] text-[#8B95A1] font-bold">사진 추가</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) addImage(f)
                          e.target.value = ''
                        }} />
                    </label>
                  )}
                </div>
              </Section>

              {/* 2) 캡션 자동 생성 */}
              <Section
                step="2"
                title="AI 캡션 + 해시태그"
                desc="톤을 선택하고 주제를 1줄로 입력하세요"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block">톤</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {TONE_OPTIONS.map(t => (
                        <button key={t.id}
                          onClick={() => setTone(t.id)}
                          className={`py-2 px-2 rounded-lg border text-left transition-colors ${tone === t.id ? 'border-[#EC4899] bg-[#FCE7F3]' : 'border-[#E5E8EB] hover:bg-[#F8F9FA]'}`}>
                          <p className="text-xs font-bold text-[#191F28]">{t.label}</p>
                          <p className="text-[9px] text-[#8B95A1] truncate">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">주제 (선택)</label>
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                      placeholder="예: 신메뉴 출시, 단골 감사 이벤트, 매장 인테리어 리뉴얼"
                      className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#EC4899]" />
                  </div>
                  <button onClick={generateCaption} disabled={generating}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 shadow-sm">
                    {generating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} strokeWidth={2.5} />
                        AI 캡션 생성
                      </>
                    )}
                  </button>
                </div>
              </Section>

              {/* 3) 캡션 / 해시태그 편집 */}
              <Section step="3" title="편집" desc={`${charCount} / ${MAX_CAPTION}자`}>
                <textarea value={caption} onChange={e => setCaption(e.target.value)}
                  placeholder="여기에 캡션이 자동 생성됩니다..."
                  className="w-full px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-sm focus:outline-none focus:border-[#EC4899] resize-y min-h-[140px] leading-relaxed" />
                <div className="mt-3">
                  <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block flex items-center gap-1">
                    <Hash size={11} strokeWidth={2.5} /> 해시태그 ({hashtags.length}개)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {hashtags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] px-2 py-1 rounded-lg">
                        {t}
                        <button onClick={() => removeHashtag(t)} className="hover:text-[#5B21B6]">
                          <X size={10} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input type="text"
                    placeholder="태그 직접 추가 (Enter)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHashtag(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded-lg text-xs focus:outline-none focus:border-[#EC4899]" />
                </div>
              </Section>

              {/* 4) 발행 */}
              <Section step="4" title="발행" desc="즉시 또는 예약">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#4E5968] mb-1 block flex items-center gap-1">
                      <Calendar size={11} strokeWidth={2.5} /> 예약 시간 (비워두면 초안만 저장)
                    </label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#EC4899]" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={saveDraft} disabled={!caption.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#E5E8EB] text-[#4E5968] rounded-xl text-sm font-bold hover:bg-[#F8F9FA] disabled:opacity-40">
                      초안 저장
                    </button>
                    <button disabled
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white rounded-xl text-sm font-bold opacity-60 cursor-not-allowed">
                      <Send size={14} strokeWidth={2.5} />
                      바로 발행 (준비중)
                    </button>
                  </div>
                  <p className="text-[10px] text-[#8B95A1] leading-relaxed">
                    바로 발행은 메타 비즈니스 API 연동 후 활성화됩니다. 지금은 캡션 복사 → 인스타 앱에서 붙여넣기로 사용하세요.
                  </p>
                </div>
              </Section>
            </div>

            {/* 우측 사이드 */}
            <div className="space-y-3 md:space-y-4">
              {/* 미리보기 */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-4">
                <div className="px-4 py-3 border-b border-[#F2F4F6]">
                  <h3 className="text-sm font-bold text-[#191F28]">미리보기</h3>
                </div>
                <div className="p-3">
                  {images[0] ? (
                    <div className="aspect-square rounded-xl overflow-hidden bg-[#F2F4F6] mb-2">
                      <img src={images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-xl bg-[#F2F4F6] flex items-center justify-center mb-2">
                      <Camera size={32} className="text-[#D1D5DB]" strokeWidth={2} />
                    </div>
                  )}
                  <p className="text-xs text-[#191F28] whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {caption || '캡션이 여기에 미리보기로 나타납니다.'}
                  </p>
                  {hashtags.length > 0 && (
                    <p className="text-xs text-[#3182F6] mt-1.5">
                      {hashtags.join(' ')}
                    </p>
                  )}
                </div>
              </div>

              {/* 도움말 */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#191F28] mb-2 flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-[#F59E0B]" strokeWidth={2.5} /> 인스타 발행 팁
                </h3>
                <ul className="space-y-1.5 text-xs text-[#4E5968]">
                  <li>· 첫 사진은 매장 분위기가 잘 드러나는 컷으로</li>
                  <li>· 캡션 첫 1-2줄이 핵심 (그 이후는 더보기)</li>
                  <li>· 해시태그는 7-15개 사이가 효과적</li>
                  <li>· 평일 오후 12-2시 / 저녁 6-9시 발행 유리</li>
                </ul>
              </div>

              {/* 다른 채널 발행 */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#191F28] mb-2">다른 채널도 함께</h3>
                <div className="space-y-1.5">
                  <Link href="/marketing/threads" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#F8F9FA] text-xs font-bold text-[#4E5968]">
                    <span className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center">
                      <span className="text-white text-[8px] font-black">@</span>
                    </span>
                    스레드 자동 발행
                    <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
                  </Link>
                  <Link href="/marketing/card-news" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#F8F9FA] text-xs font-bold text-[#4E5968]">
                    <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
                      <ImageIcon size={11} className="text-white" strokeWidth={2.5} />
                    </span>
                    카드뉴스 캐러셀
                    <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
                  </Link>
                  <Link href="/marketing/reels" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#F8F9FA] text-xs font-bold text-[#4E5968]">
                    <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#F59E0B] to-[#EC4899] flex items-center justify-center">
                      <span className="text-white text-[8px] font-black">RE</span>
                    </span>
                    릴스 대본
                    <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

function Section({ step, title, desc, children }: { step: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white text-[11px] font-black flex items-center justify-center">{step}</span>
        <h2 className="text-sm md:text-base font-bold text-[#191F28]">{title}</h2>
        {desc && <span className="text-[11px] text-[#8B95A1] ml-auto truncate">{desc}</span>}
      </div>
      {children}
    </section>
  )
}
