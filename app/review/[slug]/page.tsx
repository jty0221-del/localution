'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'

// ─────────────────────────────────────────────
// 업체 데이터 (실서비스에선 DB로 교체)
// ─────────────────────────────────────────────
type Store = {
  slug: string
  name: string
  category: string
  address: string
  // 기존 키워드 (하위 호환)
  keywords: string[]
  // 네이버 플레이스 상위노출 3단계 키워드 체계
  mainKeywords: string[]      // 대표 키워드 (업종+지역, 검색량 최상위)
  relatedKeywords: string[]   // 연관 키워드 (방문 목적·상황별)
  subKeywords: string[]       // 서브 키워드 (메뉴·분위기·특징별)
  naverUrl: string
  theme: { primary: string; accent: string; bg: string; text: string }
  greeting: string
  signatures: string[]
}

const STORES: Record<string, Store> = {
  'harang-cafe-001': {
    slug: 'harang-cafe-001',
    name: '하랑카페',
    category: '카페',
    address: '부천시 원미구 상동',
    // 기존 (하위 호환)
    keywords: ['부천 상동 카페', '분위기 좋은 카페', '디저트 맛집', '조용한 작업 카페'],
    // ── 3단계 키워드 체계
    mainKeywords: ['부천 상동 카페', '부천 카페', '상동 카페'],
    relatedKeywords: ['데이트 카페', '분위기 좋은 카페', '감성 카페', '혼카페', '작업 카페'],
    subKeywords: ['디저트 맛집', '수제 케이크', '아메리카노 맛집', '시그니처 라떼', '조용한 카페'],
    naverUrl: 'https://m.place.naver.com/restaurant/list?query=%ED%95%98%EB%9E%91%EC%B9%B4%ED%8E%98',
    theme: { primary: '#8B4513', accent: '#D2691E', bg: '#FFF8F0', text: '#3E1F0A' },
    greeting: '하랑카페를 방문해주셔서 감사해요',
    signatures: ['시그니처 라떼', '수제 디저트', '아메리카노'],
  },
  'demo-restaurant-001': {
    slug: 'demo-restaurant-001',
    name: '로컬루션 한식당',
    category: '한식당',
    address: '서울시 강남구',
    keywords: ['강남 맛집', '점심 맛집', '회식 장소', '가성비 한식'],
    mainKeywords: ['강남 한식당', '강남 맛집', '강남 점심 맛집'],
    relatedKeywords: ['회식 장소', '가족 외식', '데이트 맛집', '점심 특선'],
    subKeywords: ['가성비 한식', '김치찌개 맛집', '불고기 정식', '된장찌개'],
    naverUrl: 'https://m.place.naver.com/',
    theme: { primary: '#DC2626', accent: '#F59E0B', bg: '#FEF3C7', text: '#450A0A' },
    greeting: '든든한 한 끼 맛있게 드셨나요?',
    signatures: ['김치찌개', '불고기 정식', '된장찌개'],
  },
}

function getStore(slug: string): Store {
  if (STORES[slug]) return STORES[slug]
  const name = slug.split('-')[0] || '우리 매장'
  return {
    slug,
    name,
    category: '매장',
    address: '',
    keywords: ['맛있는 곳', '분위기 좋은 곳', '재방문 의사 있음'],
    mainKeywords: [name + ' 맛집'],
    relatedKeywords: ['분위기 좋은 곳', '친절한 곳'],
    subKeywords: ['추천 맛집', '재방문 확정'],
    naverUrl: 'https://m.place.naver.com/',
    theme: { primary: '#3182F6', accent: '#1B64DA', bg: '#EFF6FF', text: '#0A2463' },
    greeting: '방문해주셔서 감사합니다',
    signatures: ['대표 메뉴'],
  }
}

// ─────────────────────────────────────────────
type Photo = { id: string; cat: string; url: string; label: string }

export default function ReviewPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug || 'default'
  const store = getStore(slug)

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [gender, setGender] = useState<'F' | 'M' | '-'>('-')
  const [age, setAge] = useState<string>('30s')
  const [tone, setTone] = useState<string>('warm')
  const [drafting, setDrafting] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [draft, setDraft] = useState('')
  const [final, setFinal] = useState('')
  const [copied, setCopied] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadCat, setUploadCat] = useState<string>('food')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    let remaining = arr.length
    const buffer: Photo[] = []
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = () => {
        buffer.push({
          id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          cat: uploadCat,
          url: String(reader.result),
          label: f.name,
        })
        remaining -= 1
        if (remaining === 0) setPhotos(prev => [...prev, ...buffer])
      }
      reader.readAsDataURL(f)
    })
    e.target.value = ''
  }

  const openPicker = (cat: string) => {
    setUploadCat(cat)
    setTimeout(() => fileRef.current?.click(), 0)
  }

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const startGenerate = () => {
    setDrafting(true)
    setTimeout(() => {
      setDraft(buildReview(store, gender, age, tone, photos))
      setDrafting(false)
      setStep(3)
    }, 1800)
  }

  const polish = () => {
    setPolishing(true)
    setTimeout(() => {
      setFinal(polishText(draft))
      setPolishing(false)
      setStep(4)
    }, 1400)
  }

  const copyReview = async () => {
    try {
      await navigator.clipboard.writeText(final)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const el = document.createElement('textarea')
      el.value = final
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const openNaver = () => {
    window.open(store.naverUrl, '_blank')
  }

  const reset = () => {
    setStep(0)
    setPhotos([])
    setDraft('')
    setFinal('')
  }

  return (
    <div style={{ background: store.theme.bg, minHeight: '100vh', color: store.theme.text }}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFile} />

      {/* 헤더 */}
      <header className="px-5 pt-8 pb-6 text-white" style={{ background: 'linear-gradient(180deg, ' + store.theme.primary + ' 0%, ' + store.theme.accent + ' 100%)' }}>
        <div className="max-w-[520px] mx-auto">
          <div className="flex items-center gap-2 text-xs opacity-90 mb-1">
            <span>{store.category}</span>
            {store.address && (<><span>·</span><span>{store.address}</span></>)}
          </div>
          <h1 className="text-2xl font-black mb-1">{store.name}</h1>
          <p className="text-sm opacity-95">{store.greeting}</p>
          <div className="flex gap-1.5 mt-5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[520px] mx-auto px-5 py-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-xl font-black mb-2">1분만에 네이버 리뷰 작성</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                사장님을 위해 방문 후기를 AI가 대신 써드려요.<br />
                영수증과 사진만 올려주시면 끝!
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  { n: 1, t: '영수증 · 사진 업로드 (20초)' },
                  { n: 2, t: '나이대 · 말투 선택 (10초)' },
                  { n: 3, t: 'AI 리뷰 생성 + 다듬기 (20초)' },
                  { n: 4, t: '복사 → 네이버 붙여넣기 (10초)' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: store.theme.primary }}>{s.n}</span>
                    <span className="flex-1 pt-0.5 text-gray-700">{s.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold mb-2" style={{ color: store.theme.primary }}>AI가 자동으로 처리해드리는 것</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>· 영수증 OCR로 주문 메뉴 자동 인식</li>
                <li>· 음식·전경·서비스 사진 AI 분석</li>
                <li>· {store.name} 맞춤 SEO 키워드 자동 삽입</li>
                <li>· 네이버 플레이스 상위노출 키워드 3단계 반영</li>
                <li>· 성별·나이·말투 기반 자연스러운 문장</li>
                <li>· 방문 유도·재방문·추천 멘트 자동 포함</li>
                <li>· 맞춤법 · 어색한 표현 자동 다듬기</li>
              </ul>
            </div>
            <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: store.theme.primary }}>
              시작하기
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">사진을 올려주세요</h2>
              <p className="text-xs text-gray-600">여러 장 한번에 올릴 수 있어요. 카테고리별로 올려주시면 더 정확해요</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { cat: 'receipt', label: '영수증', desc: 'OCR 자동 인식' },
                { cat: 'food', label: '음식 사진', desc: '메뉴 파악' },
                { cat: 'interior', label: '매장 전경', desc: '분위기 감지' },
                { cat: 'service', label: '서비스', desc: '응대 포인트' },
                { cat: 'etc', label: '기타', desc: '자유 업로드' },
              ].map(c => {
                const count = photos.filter(p => p.cat === c.cat).length
                return (
                  <button key={c.cat} onClick={() => openPicker(c.cat)} className="p-4 rounded-xl border-2 border-dashed bg-white text-left transition-colors" style={{ borderColor: count > 0 ? store.theme.primary : '#E5E7EB' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm">{c.label}</span>
                      {count > 0 && (<span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: store.theme.primary }}>{count}</span>)}
                    </div>
                    <p className="text-[11px] text-gray-500">{c.desc}</p>
                  </button>
                )
              })}
            </div>

            {photos.length > 0 && (
              <div className="bg-white rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600 px-1">업로드된 사진 {photos.length}장</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center">×</button>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-[10px] text-white text-center">{catLabel(p.cat)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: store.theme.primary, color: store.theme.primary }}>이전</button>
              <button onClick={() => setStep(2)} disabled={photos.length === 0} className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-40" style={{ background: store.theme.primary }}>
                {photos.length === 0 ? '사진을 올려주세요' : '다음 (' + photos.length + '장)'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black mb-1">리뷰 스타일을 골라주세요</h2>
              <p className="text-xs text-gray-600">AI가 맞춤 리뷰를 작성합니다</p>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">성별 (선택)</label>
              <div className="grid grid-cols-3 gap-2">
                {[['F', '여성'], ['M', '남성'], ['-', '미표시']].map(([k, l]) => (
                  <button key={k} onClick={() => setGender(k as 'F' | 'M' | '-')} className="py-3 rounded-xl text-sm font-bold border-2 transition-colors" style={{
                    borderColor: gender === k ? store.theme.primary : '#E5E7EB',
                    background: gender === k ? store.theme.primary : '#ffffff',
                    color: gender === k ? '#ffffff' : '#4E5968',
                  }}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">나이대</label>
              <div className="grid grid-cols-5 gap-2">
                {['10s', '20s', '30s', '40s', '50s+'].map(a => (
                  <button key={a} onClick={() => setAge(a)} className="py-3 rounded-xl text-sm font-bold border-2 transition-colors" style={{
                    borderColor: age === a ? store.theme.primary : '#E5E7EB',
                    background: age === a ? store.theme.primary : '#ffffff',
                    color: age === a ? '#ffffff' : '#4E5968',
                  }}>{a === '50s+' ? '50+' : a.replace('s', '')}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">말투</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: 'warm', l: '따뜻하게', d: '감성적이고 다정한' },
                  { k: 'short', l: '심플하게', d: '핵심만 깔끔하게' },
                  { k: 'detail', l: '자세하게', d: '구체적인 경험 중심' },
                  { k: 'casual', l: '친근하게', d: '친구에게 말하듯' },
                ].map(t => (
                  <button key={t.k} onClick={() => setTone(t.k)} className="p-3 rounded-xl text-left border-2 transition-colors" style={{
                    borderColor: tone === t.k ? store.theme.primary : '#E5E7EB',
                    background: tone === t.k ? store.theme.bg : '#ffffff',
                  }}>
                    <div className="font-black text-sm" style={{ color: tone === t.k ? store.theme.primary : '#191F28' }}>{t.l}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{t.d}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: store.theme.primary, color: store.theme.primary }}>이전</button>
              <button onClick={startGenerate} disabled={drafting} className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-60" style={{ background: store.theme.primary }}>
                {drafting ? 'AI가 리뷰 작성 중...' : 'AI 리뷰 생성하기'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">AI 초안이 완성됐어요</h2>
              <p className="text-xs text-gray-600">내용을 직접 수정할 수도 있어요. 다 됐으면 자연스럽게 다듬어 드릴게요</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: store.theme.primary }}>1차 초안</span>
                <span className="text-[11px] text-gray-500">SEO 키워드 자동 주입</span>
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full min-h-[220px] text-sm leading-relaxed border-none outline-none resize-none bg-transparent"
              />
            </div>

            {/* ── 3단계 키워드 체계 표시 */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
              <p className="text-[11px] font-bold" style={{ color: store.theme.primary }}>포함된 네이버 플레이스 SEO 키워드</p>

              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1.5">대표 키워드 (상위노출 핵심)</p>
                <div className="flex flex-wrap gap-1.5">
                  {store.mainKeywords.map(k => (
                    <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold text-white" style={{ background: store.theme.primary }}>{k}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1.5">연관 키워드 (방문 상황·목적)</p>
                <div className="flex flex-wrap gap-1.5">
                  {store.relatedKeywords.map(k => (
                    <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: store.theme.bg, color: store.theme.primary, border: '1px solid ' + store.theme.accent }}>{k}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1.5">서브 키워드 (메뉴·분위기·특징)</p>
                <div className="flex flex-wrap gap-1.5">
                  {store.subKeywords.map(k => (
                    <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold text-gray-600 bg-gray-100">{k}</span>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">✓ 방문 유도 문구 · 친절함 · 재방문 의사 · 지인 추천 멘트 포함</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: store.theme.primary, color: store.theme.primary }}>이전</button>
              <button onClick={polish} disabled={polishing} className="flex-[2] py-4 rounded-2xl font-black text-white text-sm shadow-lg disabled:opacity-60" style={{ background: store.theme.primary }}>
                {polishing ? '다듬는 중...' : '자연스럽게 다듬기'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">리뷰 준비 완료</h2>
              <p className="text-xs text-gray-600">복사 후 네이버에 붙여넣기만 하면 끝!</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: store.theme.primary }}>최종본</span>
                <span className="text-[11px] text-gray-500">맞춤법 · 자연스러움 개선 완료</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{final}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyReview} className="py-4 rounded-2xl font-black text-sm border-2 shadow-sm" style={{ borderColor: store.theme.primary, color: store.theme.primary, background: '#ffffff' }}>
                {copied ? '✓ 복사 완료' : '리뷰 복사'}
              </button>
              <button onClick={openNaver} className="py-4 rounded-2xl font-black text-sm text-white shadow-lg" style={{ background: '#03C75A' }}>
                네이버 열기
              </button>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold mb-2" style={{ color: store.theme.primary }}>사용 방법</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
                <li>리뷰 복사 버튼 클릭</li>
                <li>네이버 열기 → {store.name} 검색 → 리뷰 작성</li>
                <li>네이버에서 영수증 인증 + 사진 첨부 (필수)</li>
                <li>빈 리뷰 칸에 붙여넣기 → 등록</li>
              </ol>
            </div>

            <button onClick={reset} className="w-full py-3 text-xs text-gray-500 underline">
              처음부터 다시 작성
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-[11px] text-gray-400">
        Powered by <span className="font-bold" style={{ color: store.theme.primary }}>로컬루션</span>
      </footer>

      {(drafting || polishing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm px-6">
          <div className="bg-white rounded-2xl p-6 max-w-[280px] w-full text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 animate-spin" style={{ borderColor: store.theme.bg, borderTopColor: store.theme.primary }} />
            <p className="font-black text-sm mb-1" style={{ color: store.theme.text }}>{drafting ? 'AI가 리뷰를 작성 중' : '자연스럽게 다듬는 중'}</p>
            <p className="text-[11px] text-gray-500">{drafting ? '사진 · 영수증을 분석하고 있어요' : '맞춤법과 어색한 표현을 개선해요'}</p>
          </div>
        </div>
      )}

      {copied && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="px-5 py-3 bg-[#191F28] text-white rounded-full text-xs font-bold shadow-2xl">
            ✓ 리뷰가 복사되었습니다
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Helper: 카테고리 라벨
// ─────────────────────────────────────────────
function catLabel(cat: string): string {
  if (cat === 'receipt') return '영수증'
  if (cat === 'food') return '음식'
  if (cat === 'interior') return '전경'
  if (cat === 'service') return '서비스'
  return '기타'
}

// ─────────────────────────────────────────────
// ★ 핵심 알고리즘 v3: AI 리뷰 생성
//
//  [말투 4종 완전 차별화]
//  warm   → 감성 스토리텔링, "~했어요/~이에요" 부드러운 어미
//  short  → 단문 나열, 핵심 팩트만, "~임/~음/~함" 스타일
//  detail → 격식체 "~습니다", 구체적 묘사, 항목별 서술
//  casual → 구어체, "진짜/대박/완전/ㅋㅋ", 친구 말투
//
//  [나이대 5종 완전 차별화]
//  10s  → SNS/인스타 중심, "각 나옴", 친구들
//  20s  → 데이트 or 혼자 작업, "취향 저격", 트렌디
//  30s  → 커플/소모임, "힐링", gender 반영
//  40s  → 가족/아이들, "편안한", 나들이
//  50s+ → 지인/동창 모임, "격조", "정성스러운"
//
//  [랜덤 변형] 각 파트 3~5개 문구 풀 → 방문자마다 다른 리뷰
//  [사진 강도] 음식 2장+→복수메뉴, 인테리어→공간묘사, 서비스→친절 강화
// ─────────────────────────────────────────────
function buildReview(store: Store, gender: string, age: string, tone: string, photos: Photo[]): string {
  const rnd = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)]

  const hasFood     = photos.some(p => p.cat === 'food')
  const hasInterior = photos.some(p => p.cat === 'interior')
  const hasService  = photos.some(p => p.cat === 'service')
  const foodCount   = photos.filter(p => p.cat === 'food').length

  const sigs    = store.signatures
  const sig     = rnd(sigs)
  const sig2    = rnd(sigs.filter(s => s !== sig).length > 0 ? sigs.filter(s => s !== sig) : sigs)
  const mainKw  = store.mainKeywords[0] || store.name
  const mainKw2 = rnd(store.mainKeywords)
  const relKw   = rnd(store.relatedKeywords)
  const relKw2  = rnd(store.relatedKeywords)
  const subKw   = rnd(store.subKeywords)
  const subKw2  = rnd(store.subKeywords)

  // ══ PART 1: 오프닝 (말투별 문체 완전 다름) ══
  const opening: Record<string, string[]> = {
    warm: [
      mainKw + '를 찾다가 우연히 발견했는데, 들어서는 순간부터 마음이 포근해지는 곳이에요. ',
      '오래 다닐 단골이 생겼어요. ' + mainKw + ' 검색하다 알게 된 ' + store.name + ', 첫 방문부터 마음에 쏙 들었어요. ',
      store.name + ', 처음 방문인데 ' + mainKw + ' 중에서 이렇게 감성적인 공간은 처음이에요. ',
    ],
    short: [
      mainKw + ' 검색 후 방문. ',
      '지인 추천으로 ' + mainKw + ' 방문. ',
      mainKw + ' 찾다 들름. 평점 보고 결정. ',
    ],
    detail: [
      mainKw + '로 검색하여 평점과 리뷰를 꼼꼼히 확인한 후 방문하게 된 ' + store.name + '입니다. ',
      '지인의 추천으로 ' + mainKw + ' 중 ' + store.name + '을 선택하여 방문하였으며, 사전에 메뉴와 분위기를 확인하고 왔습니다. ',
      mainKw + ' 관련 여러 곳을 비교 검토한 끝에 ' + store.name + '을 방문하게 되었습니다. ',
    ],
    casual: [
      mainKw + ' 찾다가 여기 발견했는데 진짜 대박이에요!! ',
      '친구가 ' + mainKw + ' 강추해서 반신반의하고 왔는데 완전 취향저격이에요!! ',
      '야 여기 진짜 대박임ㅋㅋ ' + mainKw + ' 검색하다 발견했는데, ',
    ],
  }

  // ══ PART 2: 메뉴 경험 (사진 수량 + 말투) ══
  const menuMulti = foodCount >= 2
  const menu: Record<string, string[]> = {
    warm: menuMulti ? [
      sig + '와 ' + sig2 + ' 둘 다 시켰는데, 각각의 매력이 달라서 없어지는 게 아쉬웠어요. ' + subKw + ' 답게 퀄리티가 제대로 느껴졌고, ',
      '메뉴 고르기가 너무 힘들어서 시그니처 두 개 다 시켰는데 둘 다 실망 없이 맛있었어요. ',
    ] : [
      sig + '를 주문했는데 ' + subKw + ' 답게 한 입에 반해버렸어요. 비주얼도 예쁘고 맛도 기대 이상이었어요. ',
      '메뉴판 보다가 ' + sig + '가 눈에 들어와 시켰는데, 시그니처 답게 정말 특별했어요. ',
      sig + ', 비주얼부터 너무 예쁜데 맛은 더 좋았어요. ' + subKw2 + ' 소문이 괜히 난 게 아니었어요. ',
    ],
    short: menuMulti ? [
      sig + ', ' + sig2 + ' 주문. 둘 다 맛있음. ' + subKw + ' 인증. ',
      '메뉴 여러 개 시킴. ' + subKw + ' 맞음. 가성비 좋음. ',
    ] : [
      sig + ' 주문. 맛있음. ' + subKw + ' 인증. ',
      subKw + ' 맞음. ' + sig + ' 강추. ',
      sig + ' 먹음. 맛 좋음. 비주얼 ok. ',
    ],
    detail: menuMulti ? [
      sig + '와 ' + sig2 + '를 함께 주문하였습니다. ' + sig + '의 경우 ' + subKw + '로서 완성도가 높았으며, ' + sig2 + ' 또한 재료의 신선함이 돋보였습니다. ',
      '두 가지 메뉴를 주문하여 비교한 결과, ' + subKw + ' 수준에 부합하는 품질이었습니다. 특히 ' + sig + '의 완성도가 인상적이었습니다. ',
    ] : [
      sig + '를 주문하였으며, ' + subKw + '로서의 완성도가 상당히 높았습니다. 재료의 신선도와 조화로운 맛이 인상적이었습니다. ',
      '대표 메뉴인 ' + sig + '를 주문하였고, ' + subKw2 + ' 기준에서도 충분히 경쟁력 있는 퀄리티였습니다. ',
      sig + '의 경우 ' + subKw + ' 면에서 이 지역 내 높은 수준을 보여주었습니다. ',
    ],
    casual: menuMulti ? [
      sig + '랑 ' + sig2 + ' 둘 다 시켰는데 완전 다 맛있어요ㅠㅠ 사진도 엄청 찍었어요ㅋㅋ ' + subKw + ' 진짜 맞음!! ',
      '여러 개 시켰는데 다 맛있어서 당황했어요!! ' + subKw + ' 이라는 말이 과언이 아니에요. ',
    ] : [
      sig + ' 먹었는데 완전 대박이에요!! ' + subKw + ' 소문 진짜였어요ㅋㅋ 비주얼부터 다름. ',
      '주변에서 ' + subKw + ' 라길래 기대했는데 기대 이상이에요!! ' + sig + ' 강추강추. ',
      sig + ' 시켰는데 와... 진짜 맛있어요ㅠㅠ ' + subKw2 + ' 완전 맞음ㅎㅎ ',
    ],
  }

  // ══ PART 3: 친절함 — 필수, 말투별 표현 완전 다름 ══
  const kindness: Record<string, string[]> = {
    warm: hasService ? [
      '사장님의 따뜻한 응대가 오래 기억에 남을 것 같아요. 처음 방문한 손님인데도 세심하게 챙겨주셔서 감동이었어요. ',
      '직원분이 먼저 챙겨주시는 세심함이 있어서 기분 좋은 시간을 보냈어요. 이런 친절함이 단골 만드는 것 같아요. ',
    ] : [
      '사장님이 따뜻하게 맞이해주셔서 처음 방문이었는데도 전혀 어색하지 않았어요. ',
      '직원분이 미소로 맞아주셔서 기분 좋게 시간을 보낼 수 있었어요. ',
      '사장님 친절함 덕분에 편안하게 즐기다 왔어요. ',
    ],
    short: hasService ? [
      '직원 응대 매우 친절. 서비스 수준 높음. ',
      '사장님 친절도 최상. 응대 좋음. ',
    ] : [
      '사장님 친절. 응대 좋음. ',
      '직원 응대 친절. ',
      '서비스 좋음. 친절함 인상적. ',
    ],
    detail: hasService ? [
      '직원 응대 수준이 상당히 높았습니다. 처음 방문하는 고객에게도 메뉴 설명을 상세히 해주시고 필요한 것을 먼저 확인해주시는 세심함이 돋보였습니다. ',
      '서비스 품질이 전반적으로 우수하였습니다. 주문부터 퇴장까지 불편함 없이 응대해주셨으며, 직원들의 친절도가 매우 높았습니다. ',
    ] : [
      '사장님의 친절한 응대가 인상 깊었습니다. 편안한 분위기를 조성해주셔서 방문 내내 만족스럽게 시간을 보낼 수 있었습니다. ',
      '직원분들의 서비스 마인드가 훌륭하여 전체적인 방문 경험의 만족도를 높여주었습니다. ',
      '응대 수준이 높아 서비스 면에서도 높은 만족감을 느꼈습니다. ',
    ],
    casual: hasService ? [
      '사장님 진짜 너무 친절해요ㅠㅠ 먼저 챙겨주시고 질문에도 다 답해주셔서 기분이 너무 좋았어요!! ',
      '직원분이 완전 친절해서 기분 업됐어요ㅎㅎ 이런 서비스는 처음이에요 진짜. ',
    ] : [
      '사장님 완전 친절해요!! 혼자 왔는데도 전혀 어색하지 않았어요ㅎㅎ ',
      '사장님이 너무 친절하게 맞아주셔서 기분 좋게 즐겼어요!! ',
      '여기 사장님 진짜 최고예요ㅠㅠ 친절함이 레전드임ㅋㅋ ',
    ],
  }

  // ══ PART 4: 분위기 (인테리어 사진 + 말투) ══
  const atmos: Record<string, string[]> = {
    warm: hasInterior ? [
      relKw + ' 로 이보다 더 완벽한 공간은 없을 것 같아요. 시간이 천천히 흐르는 것 같은 분위기예요. ',
      '공간 자체가 너무 감성적이에요. ' + relKw + ' 으로 딱 맞는 분위기고, 오래 머물러도 전혀 지루하지 않아요. ',
    ] : [
      relKw + ' 분위기가 물씬 풍기는 곳이에요. 들어서는 순간 편안해지는 느낌이었어요. ',
      '공간이 정말 아늑해서 ' + relKw + ' 로 자주 올 것 같아요. ',
      relKw + ' 답게 공간 전체에서 정성이 느껴졌어요. ',
    ],
    short: hasInterior ? [
      '분위기 ' + relKw + ' 그 자체. 인테리어 감성 있음. ',
      relKw + ' 완벽. 공간 깔끔하고 좋음. ',
    ] : [
      relKw + ' 딱 맞음. 분위기 좋음. ',
      '공간 좋음. ' + relKw + ' 추천. ',
      '분위기 조용하고 쾌적. ' + relKw + '. ',
    ],
    detail: hasInterior ? [
      '매장 인테리어는 ' + relKw + '에 최적화된 구성으로, 조명과 공간 배치가 세련되게 이루어져 있었습니다. 소음 차단도 잘 되어 있어 쾌적한 환경이었습니다. ',
      '내부 공간은 ' + relKw + ' 콘셉트에 맞게 일관된 톤으로 꾸며져 있으며, 좌석 간격도 적당하여 프라이버시가 보장되었습니다. ',
    ] : [
      relKw + '으로서 전반적인 공간 구성이 만족스러웠습니다. 특히 조용한 환경이 집중하기에 좋았습니다. ',
      '분위기가 ' + relKw + ' 목적에 부합하였으며, 청결함과 쾌적함도 높은 수준이었습니다. ',
      relKw + ' 관점에서 공간의 완성도가 상당히 높았습니다. ',
    ],
    casual: hasInterior ? [
      relKw + ' 로 진짜 이 집 분위기 너무 감성터짐ㅠㅠ 사진 찍기에도 너무 좋아요!! ',
      '분위기가 완전 ' + relKw + ' 그 자체예요ㅋㅋ 인테리어 너무 예뻐서 사진 엄청 찍었어요. ',
    ] : [
      '분위기도 완전 ' + relKw + ' 딱이에요!! 오래 있어도 전혀 안 질려요. ',
      relKw + ' 찾으시는 분들 여기 완전 정답이에요!! ',
      '공간 분위기 완전 ' + relKw + '!! 여기 앉아있는 것만으로도 힐링돼요ㅠㅠ ',
    ],
  }

  // ══ PART 5: 나이대별 동반자·상황 완전 차별화 ══
  const companionByAge: Record<string, Record<string, string[]>> = {
    '10s': {
      warm:   ['친구들이랑 왔는데 인스타 사진 잔뜩 찍고 갔어요. 또래끼리 오기 정말 좋은 곳이에요. '],
      short:  ['친구들이랑 방문. 인스타 각 잘 나옴. '],
      detail: ['10대들이 방문하기에 가격 부담이 없으며, 인스타그램 촬영 포인트가 여럿 있어 또래 친구들과 오기 좋은 환경이었습니다. '],
      casual: ['친구들이랑 왔는데 인스타 각 완전 나와요ㅋㅋ 다음에 또 오자고 난리났어요ㅎㅎ '],
    },
    '20s': {
      warm:   ['혼자 작업하러 왔는데 집중도 잘 되고, 데이트 장소로도 너무 좋을 것 같았어요. 20대 취향을 정확히 저격하는 곳이에요. '],
      short:  ['혼자 작업·데이트 코스 둘 다 가능. 20대 취향 저격. '],
      detail: ['20대 방문객들을 위한 공간으로, 혼자 방문하여 작업하기에도, 동반자와 함께 데이트 코스로 방문하기에도 적합한 환경이었습니다. '],
      casual: ['혼자 왔는데 작업하기 완전 좋아요!! 데이트 코스로 와도 완전 좋을 것 같아요ㅎㅎ 20대 취향 저격 확실. '],
    },
    '30s': {
      warm: [
        gender === 'F'
          ? '남자친구랑 왔는데 둘 다 너무 만족해서 자주 올 것 같아요. ' + relKw2 + ' 로 이보다 완벽한 곳은 없어요. '
          : gender === 'M'
          ? '여자친구랑 왔는데 엄청 좋아했어요. ' + relKw2 + ' 로 완벽한 선택이었어요. '
          : '소중한 사람과 오기 딱 좋은 곳이에요. ' + relKw2 + ' 로 주말마다 오고 싶어요. ',
      ],
      short: [
        gender === 'F'
          ? '남자친구랑 방문. 둘 다 만족. ' + relKw2 + ' 완벽. '
          : gender === 'M'
          ? '여자친구랑 방문. 완전 성공. ' + relKw2 + ' 딱. '
          : relKw2 + ' 최적. 커플 추천. ',
      ],
      detail: [
        gender === 'F'
          ? '남자친구와 함께 방문하였으며, 두 사람 모두 매우 만족스러운 경험을 했습니다. ' + relKw2 + ' 목적으로 방문하기에 최적화된 공간이었습니다. '
          : gender === 'M'
          ? '여자친구와 함께 방문하였고, 전반적으로 높은 만족도를 보였습니다. ' + relKw2 + '으로서 완성도가 높은 공간이었습니다. '
          : relKw2 + ' 목적의 방문으로, 동반자 모두 매우 만족스러운 결과였습니다. ',
      ],
      casual: [
        gender === 'F'
          ? '남자친구랑 왔는데 완전 좋아했어요ㅎㅎ ' + relKw2 + ' 로 완전 정답이에요!! '
          : gender === 'M'
          ? '여자친구랑 왔는데 엄청 좋아하더라구요ㅋㅋ ' + relKw2 + ' 로 강추해요!! '
          : relKw2 + ' 로 진짜 최고예요!! 커플들 무조건 와보세요. ',
      ],
    },
    '40s': {
      warm:   ['가족들이랑 왔는데 아이들도 편안하게 즐길 수 있는 분위기예요. 가족 나들이 장소로 이보다 더 좋을 수 없어요. '],
      short:  ['가족 나들이로 방문. 아이들 좋아함. 가족 모두 만족. '],
      detail: ['가족 단위 방문을 위한 공간으로, 어린 자녀들도 편안하게 이용할 수 있는 환경이 갖추어져 있었습니다. 가족 나들이 코스로 적극 추천드립니다. '],
      casual: ['가족이랑 왔는데 아이들도 너무 좋아했어요ㅋㅋ 가족 나들이 코스로 진짜 완벽이에요!! '],
    },
    '50s+': {
      warm:   ['오래된 지인들과 함께 방문했는데, 조용하고 격조 있는 분위기가 천천히 대화 나누기에 딱이었어요. 품격 있는 공간이에요. '],
      short:  ['지인 모임으로 방문. 조용하고 품격 있음. 대화 나누기 최적. '],
      detail: ['지인들과의 모임 장소로 방문하였습니다. 조용하고 품격 있는 분위기가 편안한 대화를 나누기에 최적이었으며, 서비스 수준도 기대에 부응하였습니다. '],
      casual: ['지인들이랑 왔는데 분위기 너무 좋아요!! 조용하고 격조 있어서 대화 나누기 딱이에요ㅎㅎ '],
    },
  }

  // ══ PART 6: 방문 유도 — 필수, 말투별 강도 다름 ══
  const urge: Record<string, string[]> = {
    warm: [
      mainKw2 + ' 고민 중이신 분들, 한 번만 와보시면 단골 되실 거예요. ',
      mainKw2 + ' 찾고 계신다면 망설이지 마시고 꼭 한번 방문해보세요. 후회 없으실 거예요. ',
      '이 근처에서 ' + mainKw2 + ' 찾으신다면 여기가 정답이에요. ',
    ],
    short: [
      mainKw2 + ' 찾으신다면 여기 강추. ',
      mainKw2 + ' 최강. 무조건 방문 권장. ',
      mainKw2 + ' = 여기. ',
    ],
    detail: [
      mainKw2 + ' 기준으로 가격 대비 품질이 상당히 우수하여, 이 지역에서 손꼽히는 매장이라고 생각합니다. ',
      '전반적인 경험을 종합했을 때 ' + mainKw2 + ' 중 최상위권에 해당하는 매장으로 판단됩니다. ',
      mainKw2 + '을 검토 중이신 분들께 적극 추천드릴 수 있는 곳입니다. ',
    ],
    casual: [
      mainKw2 + ' 찾으시는 분들 무조건 여기예요!! 한 번 오면 계속 오고 싶어질 거예요ㅋㅋ ',
      mainKw2 + ' 고민이면 그냥 여기로 오세요!! 후회 없어요 진짜!! ',
      '여기 알고도 안 오면 진짜 손해예요!! ' + mainKw2 + ' 중에 여기가 최고예요. ',
    ],
  }

  // ══ PART 7: 재방문 + 지인 추천 클로징 — 필수 ══
  const closing: Record<string, string[]> = {
    warm: [
      '다음에 꼭 또 들를 것 같고, 소중한 분들께 강력 추천하고 싶은 곳이에요.',
      '재방문 의사 100%예요. 주변 지인들한테 입이 닳도록 추천할 것 같아요.',
      '자주 오고 싶은 곳이 생겼어요. 아직 안 와보신 분들께 꼭 추천드려요.',
    ],
    short: [
      '재방문 확정. 주변 전부 추천.',
      '재방문 의사 있음. 지인 추천 예정.',
      '또 올 예정. 강추.',
    ],
    detail: [
      '종합적인 만족도를 기준으로 재방문 의사가 매우 높으며, 지인들에게도 적극 추천드릴 예정입니다.',
      '전체적인 경험에 높은 만족감을 느꼈으며, 향후 재방문 및 주변 인원들에게 추천할 의향이 충분합니다.',
      '서비스·메뉴·분위기 세 가지 모두 높은 수준을 유지하고 있어, 재방문과 추천을 망설임 없이 결정하였습니다.',
    ],
    casual: [
      '진짜 자주 올 것 같아요!! 주변 사람들한테 다 알려줄 거예요 강추강추!!',
      '이미 친구들한테 다 공유했어요ㅋㅋ 다음에 또 올게요!!',
      '재방문 확정이고 주변에 다 자랑할 것 같아요!! 너무 좋아서 기분 좋게 집에 갔어요ㅎㅎ',
    ],
  }

  // ── 나이대 + 말투 조합으로 동반자 문구 선택
  const ageData  = companionByAge[age]  || companionByAge['30s']
  const ageTone  = ageData[tone]        || ageData['warm']
  const companion = rnd(ageTone)

  return (
    rnd(opening[tone]  || opening.warm)  +
    rnd(menu[tone]     || menu.warm)     +
    rnd(kindness[tone] || kindness.warm) +
    rnd(atmos[tone]    || atmos.warm)    +
    companion                            +
    rnd(urge[tone]     || urge.warm)     +
    rnd(closing[tone]  || closing.warm)
  )
}

// ─────────────────────────────────────────────
// Helper: 맞춤법 / 자연스러움 다듬기
// ─────────────────────────────────────────────
function polishText(raw: string): string {
  let out = raw.trim()
  while (out.indexOf('  ') >= 0) out = out.split('  ').join(' ')
  while (out.indexOf('..') >= 0) out = out.split('..').join('.')
  out = out.split(' ,').join(',').split(' .').join('.')
  out = out.split(', ,').join(',')
  out = out.split('이이').join('이').split('가가').join('가')
  out = out.split('요. 요.').join('요.')
  if (out.length > 0) {
    const last = out[out.length - 1]
    if (last !== '!' && last !== '.' && last !== '~') out = out + '.'
  }
  return out
}
