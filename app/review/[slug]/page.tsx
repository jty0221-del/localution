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
  keywords: string[]
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
    keywords: ['부천 상동 카페', '분위기 좋은 카페', '디저트 맛집', '조용한 작업 카페'],
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
                <li>· 성별·나이·말투 기반 자연스러운 문장</li>
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

            <div className="bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-[11px] font-bold mb-2" style={{ color: store.theme.primary }}>포함된 SEO 키워드</p>
              <div className="flex flex-wrap gap-1.5">
                {store.keywords.map(k => (
                  <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: store.theme.bg, color: store.theme.primary }}>{k}</span>
                ))}
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
// Helper: Mock AI 리뷰 생성
// 실제 서비스에선 OpenAI/Gemini 연동
// ─────────────────────────────────────────────
function buildReview(store: Store, gender: string, age: string, tone: string, photos: Photo[]): string {
  const sig = store.signatures[Math.floor(Math.random() * store.signatures.length)]
  const kw1 = store.keywords[0] || '맛집'
  const kw2 = store.keywords[Math.min(1, store.keywords.length - 1)] || '분위기 좋은 곳'
  const hasFood = photos.some(p => p.cat === 'food')
  const hasInterior = photos.some(p => p.cat === 'interior')
  const hasService = photos.some(p => p.cat === 'service')
  const hasReceipt = photos.some(p => p.cat === 'receipt')

  const addrPrefix = store.address ? store.address + ' 근처에서 ' : ''

  const intros: Record<string, string> = {
    warm: addrPrefix + '우연히 발견한 ' + store.name + '. ' + kw1 + ' 찾다가 들렀는데 정말 좋았어요. ',
    short: store.name + ' 다녀옴. ' + kw1 + ' 추천. ',
    detail: (store.address ? store.address + '에서 ' : '') + kw1 + ' 검색하다 평점 보고 방문한 ' + store.name + '입니다. ',
    casual: store.name + ' 와봤는데 진짜 괜찮았어요! ' + kw1 + '이라길래 기대하고 갔는데, ',
  }

  const foodPart = hasFood
    ? sig + '를 주문했는데 비주얼도 좋고 맛도 기대 이상이었어요. '
    : sig + '가 특히 맛있었고, '

  const interiorPart = hasInterior
    ? '매장 분위기가 차분해서 오래 머물러도 편했습니다. '
    : ''

  const servicePart = hasService
    ? '사장님 응대도 친절해서 기분 좋게 먹고 나왔어요. '
    : ''

  const receiptNote = hasReceipt ? '' : ''

  const ageNote =
    age === '10s' ? '또래 친구들이랑 오기 딱 좋은 곳 같아요. ' :
    age === '20s' ? '2030 취향 저격이에요. ' :
    age === '30s' ? '조용히 쉬다 가기 좋네요. ' :
    age === '40s' ? '가족과 함께 와도 편한 곳입니다. ' :
    age === '50s+' ? '어르신들과 오기에도 부담 없는 곳이에요. ' : ''

  const outros: Record<string, string> = {
    warm: ageNote + kw2 + ' 찾으시는 분들께 추천하고 싶은 곳이에요. 다음에도 또 들를 것 같습니다.',
    short: ageNote + '재방문 의사 있음. ' + kw2 + '.',
    detail: ageNote + '전체적으로 만족도가 높았고 ' + kw2 + '으로도 충분히 경쟁력 있는 매장이었습니다. 재방문 의사 확실합니다.',
    casual: ageNote + kw2 + ' 이 근처에서 찾으시는 분들 한번 가보세요 강추합니다!',
  }

  return (intros[tone] || intros.warm) + foodPart + interiorPart + servicePart + receiptNote + (outros[tone] || outros.warm)
}

// ─────────────────────────────────────────────
// Helper: Mock 맞춤법 / 자연스러움 다듬기
// ─────────────────────────────────────────────
function polishText(raw: string): string {
  let out = raw.trim()
  while (out.indexOf('  ') >= 0) out = out.split('  ').join(' ')
  while (out.indexOf('..') >= 0) out = out.split('..').join('.')
  out = out.split(' ,').join(',').split(' .').join('.')
  out = out.split(', ,').join(',')
  return out
}
