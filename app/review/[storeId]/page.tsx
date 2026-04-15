'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'

// ─────────────────────────────────────────────
// 통합 팔레트 (화이트 / 블랙 / 블루)
// ─────────────────────────────────────────────
const BLUE = '#3182F6'
const BLUE_DARK = '#1B64DA'
const BLUE_BG = '#EFF6FF'
const BLACK = '#191F28'
const GRAY = '#8B95A1'
const BORDER = '#E5E8EB'

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
    greeting: '든든한 한 끼 맛있게 드셨나요?',
    signatures: ['김치찌개', '불고기 정식', '된장찌개'],
  },
}

function getStore(storeId: string): Store {
  if (STORES[storeId]) return STORES[storeId]
  const name = storeId.split('-')[0] || '우리 매장'
  return {
    slug: storeId,
    name,
    category: '매장',
    address: '',
    keywords: ['맛있는 곳', '분위기 좋은 곳', '재방문 의사 있음'],
    naverUrl: 'https://m.place.naver.com/',
    greeting: '방문해주셔서 감사합니다',
    signatures: ['대표 메뉴'],
  }
}

// ─────────────────────────────────────────────
type Photo = { id: string; cat: 'receipt' | 'photo'; url: string; label: string }
type LengthKey = 'short' | 'mid' | 'long'

export default function ReviewPage() {
  const params = useParams<{ storeId: string }>()
  const storeId = params?.storeId || 'default'
  const store = getStore(storeId)

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [gender, setGender] = useState<'F' | 'M' | '-'>('-')
  const [age, setAge] = useState<string>('30s')
  const [tone, setTone] = useState<string>('warm')
  const [length, setLength] = useState<LengthKey>('mid')
  const [drafting, setDrafting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [draft, setDraft] = useState('')
  const [final, setFinal] = useState('')
  const [copied, setCopied] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadCat, setUploadCat] = useState<'receipt' | 'photo'>('receipt')

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

  const openPicker = (cat: 'receipt' | 'photo') => {
    setUploadCat(cat)
    setTimeout(() => fileRef.current?.click(), 0)
  }

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const startGenerate = () => {
    setDrafting(true)
    setTimeout(() => {
      setDraft(buildReview(store, gender, age, tone, length, photos))
      setDrafting(false)
      setStep(3)
    }, 1800)
  }

  const advance = () => {
    setAdvancing(true)
    setTimeout(() => {
      setFinal(draft.trim())
      setAdvancing(false)
      setStep(4)
    }, 600)
  }

  const copyAndGoNaver = async () => {
    try {
      await navigator.clipboard.writeText(final)
    } catch {
      const el = document.createElement('textarea')
      el.value = final
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    setTimeout(() => window.open(store.naverUrl, '_blank'), 350)
  }

  const reset = () => {
    setStep(0)
    setPhotos([])
    setDraft('')
    setFinal('')
  }

  return (
    <div style={{ background: '#F7F8FA', minHeight: '100vh', color: BLACK }}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFile} />

      {/* 헤더 */}
      <header className="px-5 pt-8 pb-6 text-white" style={{ background: 'linear-gradient(180deg, ' + BLUE + ' 0%, ' + BLUE_DARK + ' 100%)' }}>
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
              <p className="text-sm leading-relaxed" style={{ color: GRAY }}>
                사장님을 위해 방문 후기를 AI가 대신 써드려요.<br />
                영수증과 사진만 올려주시면 끝!
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  { n: 1, t: '영수증 · 사진 업로드 (20초)' },
                  { n: 2, t: '나이대 · 말투 · 길이 선택 (10초)' },
                  { n: 3, t: 'AI 리뷰 생성 + 직접 수정 (20초)' },
                  { n: 4, t: '복사 → 네이버 붙여넣기 (10초)' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: BLUE }}>{s.n}</span>
                    <span className="flex-1 pt-0.5" style={{ color: '#4E5968' }}>{s.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>AI가 자동으로 처리해드리는 것</p>
              <ul className="text-xs space-y-1" style={{ color: '#4E5968' }}>
                <li>· 영수증 OCR로 주문 메뉴 · 방문 매장 자동 인식</li>
                <li>· 사진 AI 분석 (음식 · 서비스 · 전경 자동 구분)</li>
                <li>· {store.name} 맞춤 SEO 키워드 자동 삽입</li>
                <li>· 나이 · 말투 · 길이 기반 자연스러운 문장</li>
                <li>· AI 티 안 나는 구어체 블로거 스타일</li>
              </ul>
            </div>
            <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
              시작하기
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">영수증과 사진을 올려주세요</h2>
              <p className="text-xs" style={{ color: GRAY }}>영수증 1장 + 사진 몇 장이면 AI가 알아서 분석해요</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { cat: 'receipt', label: '영수증', desc: 'OCR로 메뉴 자동 인식', icon: '🧾' },
                { cat: 'photo', label: '사진', desc: '음식 · 서비스 · 전경 등', icon: '📸' },
              ] as Array<{ cat: 'receipt' | 'photo'; label: string; desc: string; icon: string }>).map(c => {
                const count = photos.filter(p => p.cat === c.cat).length
                const active = count > 0
                return (
                  <button key={c.cat} onClick={() => openPicker(c.cat)} className="p-5 rounded-2xl border-2 border-dashed bg-white text-left transition-colors" style={{ borderColor: active ? BLUE : BORDER }}>
                    <div className="text-2xl mb-1">{c.icon}</div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm" style={{ color: BLACK }}>{c.label}</span>
                      {active && (<span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BLUE }}>{count}</span>)}
                    </div>
                    <p className="text-[11px]" style={{ color: GRAY }}>{c.desc}</p>
                  </button>
                )
              })}
            </div>

            {photos.length > 0 && (
              <div className="bg-white rounded-2xl p-3 space-y-2 shadow-sm">
                <p className="text-xs font-bold px-1" style={{ color: '#4E5968' }}>업로드된 파일 {photos.length}장</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center">×</button>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-[10px] text-white text-center">{p.cat === 'receipt' ? '영수증' : '사진'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
              <button onClick={() => setStep(2)} disabled={photos.length === 0} className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-40" style={{ background: BLUE }}>
                {photos.length === 0 ? '파일을 올려주세요' : '다음 (' + photos.length + '장)'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black mb-1">리뷰 스타일을 골라주세요</h2>
              <p className="text-xs" style={{ color: GRAY }}>AI가 맞춤 리뷰를 작성합니다</p>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">성별 (선택)</label>
              <div className="grid grid-cols-3 gap-2">
                {[['F', '여성'], ['M', '남성'], ['-', '미표시']].map(([k, l]) => (
                  <button key={k} onClick={() => setGender(k as 'F' | 'M' | '-')} className="py-3 rounded-xl text-sm font-bold border-2 transition-colors" style={{
                    borderColor: gender === k ? BLUE : BORDER,
                    background: gender === k ? BLUE : '#ffffff',
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
                    borderColor: age === a ? BLUE : BORDER,
                    background: age === a ? BLUE : '#ffffff',
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
                    borderColor: tone === t.k ? BLUE : BORDER,
                    background: tone === t.k ? BLUE_BG : '#ffffff',
                  }}>
                    <div className="font-black text-sm" style={{ color: tone === t.k ? BLUE : BLACK }}>{t.l}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{t.d}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block">리뷰 길이</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { k: 'short', l: '짧음', d: '150자 이내' },
                  { k: 'mid', l: '중간', d: '250자 이내' },
                  { k: 'long', l: '길게', d: '400자 이내' },
                ] as Array<{ k: LengthKey; l: string; d: string }>).map(x => (
                  <button key={x.k} onClick={() => setLength(x.k)} className="p-3 rounded-xl text-center border-2 transition-colors" style={{
                    borderColor: length === x.k ? BLUE : BORDER,
                    background: length === x.k ? BLUE_BG : '#ffffff',
                  }}>
                    <div className="font-black text-sm" style={{ color: length === x.k ? BLUE : BLACK }}>{x.l}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{x.d}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
              <button onClick={startGenerate} disabled={drafting} className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-60" style={{ background: BLUE }}>
                {drafting ? 'AI가 리뷰 작성 중...' : 'AI 리뷰 생성하기'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">AI 초안이 완성됐어요</h2>
              <p className="text-xs" style={{ color: GRAY }}>내용을 직접 수정할 수도 있어요. 다 됐으면 아래 다음 버튼을 눌러주세요</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: BLUE }}>AI 초안</span>
                <span className="text-[11px]" style={{ color: GRAY }}>{draft.length}자 · 직접 수정 가능</span>
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full min-h-[240px] text-sm leading-relaxed border-none outline-none resize-none bg-transparent"
                style={{ color: BLACK }}
              />
            </div>

            <div className="bg-white rounded-xl p-3" style={{ border: '1px solid ' + BORDER }}>
              <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>포함된 SEO 키워드</p>
              <div className="flex flex-wrap gap-1.5">
                {store.keywords.map(k => (
                  <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: BLUE_BG, color: BLUE }}>{k}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
              <button onClick={advance} disabled={advancing || draft.trim().length === 0} className="flex-[2] py-4 rounded-2xl font-black text-white text-sm shadow-lg disabled:opacity-60" style={{ background: BLUE }}>
                {advancing ? '준비 중...' : '다음'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black mb-1">리뷰 준비 완료</h2>
              <p className="text-xs" style={{ color: GRAY }}>아래 버튼 한 번이면 복사 + 네이버 이동까지 끝나요</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: BLUE }}>최종본</span>
                <span className="text-[11px]" style={{ color: GRAY }}>{final.length}자</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: BLACK }}>{final}</p>
            </div>

            <button onClick={copyAndGoNaver} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
              {copied ? '✓ 복사 완료 · 네이버로 이동 중' : '리뷰 복사하고 네이버로 이동'}
            </button>

            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid ' + BORDER }}>
              <p className="text-xs font-bold mb-2" style={{ color: BLUE }}>사용 방법</p>
              <ol className="text-xs space-y-1 list-decimal pl-4" style={{ color: '#4E5968' }}>
                <li>리뷰 복사 버튼 클릭</li>
                <li>네이버 업체 확인 및 리뷰작성</li>
                <li>네이버에서 영수증 인증 + 사진첨부 (필수)</li>
                <li>빈 리뷰 칸에 붙여넣기 → 등록</li>
              </ol>
            </div>

            <button onClick={reset} className="w-full py-3 text-xs underline" style={{ color: GRAY }}>
              처음부터 다시 작성
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-[11px]" style={{ color: GRAY }}>
        Powered by <span className="font-bold" style={{ color: BLUE }}>로컬루션</span>
      </footer>

      {(drafting || advancing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm px-6">
          <div className="bg-white rounded-2xl p-6 max-w-[280px] w-full text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 animate-spin" style={{ borderColor: BLUE_BG, borderTopColor: BLUE }} />
            <p className="font-black text-sm mb-1" style={{ color: BLACK }}>{drafting ? 'AI가 리뷰를 작성 중' : '마무리 중'}</p>
            <p className="text-[11px]" style={{ color: GRAY }}>{drafting ? '영수증과 사진을 분석하고 있어요' : '잠시만 기다려주세요'}</p>
          </div>
        </div>
      )}

      {copied && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="px-5 py-3 bg-[#191F28] text-white rounded-full text-xs font-bold shadow-2xl">
            ✓ 복사 완료 · 네이버 이동 중
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Helper: 안티 AI 리뷰 생성기
// - 거창한 형용사 금지 (혁신적, 경이로운, 단연코…)
// - 기승전결/안녕하세요 금지
// - 다나까 단조로움 금지 → 구어체 섞기 (거든요, 잖아요, 더라고요)
// - 번역체 금지 (~에 있어서, ~하는 것은 중요합니다)
// - 이모지 패턴/볼드 키워드 금지
// ─────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildReview(store: Store, gender: string, age: string, tone: string, length: LengthKey, photos: Photo[]): string {
  const sig1 = pick(store.signatures)
  const remaining = store.signatures.filter(s => s !== sig1)
  const sig2 = remaining.length > 0 ? pick(remaining) : sig1
  const kw1 = store.keywords[0] || ''
  const kw2 = store.keywords[1] || kw1
  const area = store.address ? store.address.split(' ').slice(-1)[0] : ''
  const hasReceipt = photos.some(p => p.cat === 'receipt')
  const hasPhoto = photos.some(p => p.cat === 'photo')

  // ─────────────────────────────────────────
  // 사람 리뷰 역공학 원칙:
  //  1. 구체적 앵커 (동행·시간·가격·웨이팅 등)
  //  2. 짧고 툭툭 끊기는 호흡 (줄바꿈 활용)
  //  3. 감탄사 거의 없음 (ㅎㅎㅠㅠ 전체에 0~1회)
  //  4. 실용 정보 한 줄 (주차/웨이팅/가격)
  //  5. 작은 망설임/관찰 섞기
  //  6. AI 특유의 매끈한 연결 금지 → 문장 독립적으로
  //  7. 성별 차이는 "화려함"이 아니라 "초점의 차이"로
  //     - F: 분위기/사진/동행 감정
  //     - M: 실용성/맛 디테일/가성비
  // ─────────────────────────────────────────

  // 동행 풀 (성별·나이별로 자연스럽게)
  const companionF: Record<string, string[]> = {
    '10s': ['친구랑', '언니랑', '동생이랑'],
    '20s': ['친구랑', '남친이랑', '언니랑'],
    '30s': ['남편이랑', '친구랑', '동생이랑', '회사 언니랑'],
    '40s': ['남편이랑', '아이랑', '동네 친구랑'],
    '50s+': ['남편이랑', '친구분이랑', '딸이랑'],
  }
  const companionM: Record<string, string[]> = {
    '10s': ['친구랑', '형이랑'],
    '20s': ['여친이랑', '친구랑', '동기랑'],
    '30s': ['와이프랑', '회사 동료랑', '친구랑'],
    '40s': ['와이프랑', '애들이랑', '직장 동료랑'],
    '50s+': ['와이프랑', '지인이랑'],
  }
  const companionN = ['친구랑', '지인이랑', '가족이랑']

  const timePool = ['지난 주말에', '어제 저녁에', '저번 주에', '이번 주 초에', '며칠 전에', '오랜만에']
  const companion = gender === 'F'
    ? pick(companionF[age] || companionF['30s'])
    : gender === 'M'
      ? pick(companionM[age] || companionM['30s'])
      : pick(companionN)

  const t = pick(timePool)

  // ─────────────────────────────────────────
  // 핵심: 본론 사이사이에 사담·쓸데없는 말·미사여구를 끼워넣어
  //       "블로거 1줄1줄 구조"가 아닌 "수다" 톤으로 흘러가게 만든다.
  //       키워드는 마지막에 자연스럽게 녹이고, 단락 구분은 최소화.
  // ─────────────────────────────────────────

  // [오프닝] 시간 + 동행 + 매장 — 문장 끝에 살짝 꼬리 달기
  const openTail = [
    ' 다녀왔어요',
    ' 가봤어요',
    ' 들렀다 왔어요',
  ]
  const opening = t + ' ' + companion + ' ' + store.name + pick(openTail)

  // [배경 사담] "왜 갑자기 외식/카페 행차를 했나" — 본론과 관계없는 개인 배경
  const asidesF = [
    '요즘 일이 많아서 외식할 여유가 없었는데 오랜만에 시간이 좀 나서 나갔다 온 거예요',
    '한동안 집밥만 먹다 보니까 뭔가 답답해지길래',
    '날씨도 선선해졌고 괜히 기분 내고 싶어서',
    '진짜 몇 주 만에 제대로 외출한 거라 뭔가 설레기도 했고요',
    '요즘 컨디션이 영 별로라 기분전환 좀 할 겸',
    '평소에는 잘 안 가는 동네인데 이번엔 일부러 가본 거예요',
    (companion === '남편이랑' || companion === '와이프랑') ? '둘 다 주말에 밀린 빨래만 하고 있기 싫어서 그냥 나왔어요' : '이번엔 큰 약속 잡지 말고 가볍게 보자 해서 여기로 정했어요',
  ]
  const asidesM = [
    '원래 이런 데 잘 안 가는 편인데',
    '회사 근처도 아니라서 가볼 일이 없었는데 이번에 굳이 찾아간 거예요',
    '주말이라 딱히 할 일도 없고 해서 그냥 나왔어요',
    '평소엔 집에서 해결하는 편인데 그날은 이상하게 밖에서 먹고 싶더라고요',
    '가본 지 좀 됐길래 이번 기회에 한번 정리할 겸',
    '주차 가능한 데 찾다 보니 여기로 굳어졌어요',
  ]
  const asidesN = [
    '오랜만에 나와보니 뭔가 기분이 다르더라고요',
    '평소 잘 안 가는 동네라 겸사겸사 들렀어요',
  ]

  // [왜 여기?] 방문 동기 — 짧게 꼬리처럼
  const whyF = [
    '블로그 보다가 분위기가 괜찮아 보이길래 한참 전부터 찜해뒀던 곳이에요',
    '인스타에서 누가 올린 거 보고 저장만 해놨다가 드디어 써먹은 거예요',
    '지도 앱에서 평점 좀 있길래 그냥 별생각 없이 저장해뒀던 곳인데',
    '친구가 전에 여기 다녀왔다면서 괜찮다고 하길래 기억해뒀던 곳이거든요',
  ]
  const whyM = [
    '지도 평점 괜찮아 보이길래 큰 고민 없이 고른 거예요',
    '같이 간 사람이 가보자고 해서 따라간 거에 가깝고요',
    '평소 자주 보던 지도 앱에서 우연히 봐뒀던 곳이에요',
    '주차 가능하다고 돼 있어서 그 이유도 컸어요',
  ]
  const whyN = [
    '평점 괜찮길래 그냥 가본 거예요',
    '지나가다 간판 보고 그대로 들어갔어요',
  ]

  // [도착/공간] 실용 + 감각 섞은 수다
  const arrivalF = hasPhoto
    ? [
        '도착해보니 생각보다 가게가 아담해서 처음엔 살짝 당황했는데, 안쪽 창가 자리 잡으니까 햇빛이 적당히 들어와서 오히려 편했어요',
        '주차는 좀 애매한 편이라 근처 공영주차장 썼고, 자리는 안쪽 구석 잡아서 거기가 제일 아늑했어요',
        '평일이라 그런지 자리가 한두 개만 비어있었는데, 운 좋게 창가 자리 잡아서 바깥 풍경 보면서 얘기하다 보니 시간 가는 줄 몰랐어요',
        '들어갔을 때 조명이 너무 밝지도 어둡지도 않아서 눈이 편했고, 테이블 간격도 생각보다 여유가 있더라고요',
      ]
    : [
        '공간이 생각보다 아담해서 처음엔 살짝 걱정했는데 막상 앉아보니 괜찮았고, 안쪽이 더 조용하다고 해서 안쪽으로 안내받았어요',
        '골목 안쪽이라 찾는 데 약간 헤맸는데, 막상 들어가 보니 분위기가 꽤 차분해서 놀랐어요',
      ]
  const arrivalM = hasPhoto
    ? [
        '주차 공간이 좁아서 결국 근처 공영주차장에 세우고 걸어갔고, 평일 저녁이라 그런지 자리는 여유 있는 편이었어요',
        '테이블 간격이 넉넉한 편이라 옆자리 눈치 볼 일이 없었고, 구석 자리 잡아서 소음도 별로 없었어요',
        '평일 낮 시간이라 사람 많진 않았고, 창가 쪽 앉아서 바깥 보면서 잠깐 쉬다 나왔어요',
      ]
    : [
        '가게 자체는 작은 편이고 테이블 몇 개 정도 규모라 전반적으로 조용한 분위기였어요',
        '위치는 살짝 애매한데 찾는 데 크게 어렵진 않았고, 가게 안은 생각보다 정돈되어 있었어요',
      ]
  const arrivalN = [
    '도착해보니 분위기가 생각보다 차분했고, 자리도 적당히 있어서 크게 붐비지 않아 편했어요',
  ]

  // [주문/맛] 메뉴 + 개인적 취향 사담 섞기
  const orderF = hasReceipt
    ? [
        '이번엔 ' + sig1 + '이랑 ' + sig2 + ' 같이 시켰는데, ' + sig1 + ' 쪽이 제 취향에 더 가까웠어요. 이런 건 또 사람마다 갈리는 거라 뭐라 단정하긴 어렵긴 한데요',
        '메뉴판을 한참 고민하다가 결국 대표 메뉴 ' + sig1 + ' 골랐고, ' + companion + ' 따로 ' + sig2 + ' 시켜서 나눠 먹었는데 둘 다 평균 이상은 했어요',
        sig1 + '부터 먼저 시키고 ' + sig2 + ' 추가로 주문했는데, 솔직히 ' + sig2 + ' 기대 안 하다가 더 맛있어서 이게 조금 의외였어요',
      ]
    : [
        '대표 메뉴라는 ' + sig1 + ' 시켜봤는데, 첫 입에 확 끌리는 스타일은 아닌데 먹을수록 계속 손이 가는 타입이었어요',
        sig1 + ' 하나만 시켜서 천천히 먹어봤어요. 평범한 듯하면서도 또 뭔가 다른 맛이 있더라고요',
      ]
  const orderM = hasReceipt
    ? [
        sig1 + ' 주문했고, 양은 1인분 기준으로 부족하지 않았어요. 전반적으로 간이 세지 않아서 제 스타일엔 맞았고요',
        sig1 + '이랑 ' + sig2 + ' 각각 하나씩 시켰는데, 가격 대비 크게 부족한 점은 느끼지 못했어요',
        '대표 메뉴 ' + sig1 + ' 먼저 갔어요. 처음 먹어보는 맛은 아닌데 기본기는 확실히 잡혀 있는 편이에요',
      ]
    : [
        sig1 + ' 단품으로 시켜서 먹었고, 가성비는 나쁘지 않은 편이라고 느꼈어요',
        '기본 메뉴라는 ' + sig1 + ' 주문했는데, 특별히 튀지는 않지만 부족함도 없는 딱 기대치만큼의 맛이에요',
      ]
  const orderN = hasReceipt
    ? [sig1 + '이랑 ' + sig2 + ' 같이 시켜봤고 둘 다 무난했어요']
    : [sig1 + ' 먹어봤는데 생각보다 괜찮았어요']

  // [중간 사담] 본론과 살짝 빗겨난 개인적인 한마디
  const midAsideF = [
    '저 사실 원래 단 거 별로 안 좋아하는데 여기 건 이상하게 괜찮더라고요',
    '사장님이 중간에 한 번 더 필요한 거 없냐고 조용히 물어봐주신 것도 기억에 남아요',
    '원래는 이런 조용한 분위기보단 북적거리는 데 좋아했는데 요즘은 또 이런 데가 더 편해진 것 같아요',
    '옆 테이블 손님들도 낮게 얘기하고 있어서 전반적으로 공간이 참 안정적이었어요',
    '카페 투어 하는 친구가 여길 봤으면 아마 바로 좋아했을 것 같아요',
  ]
  const midAsideM = [
    '개인적으로 가성비 따지는 편인데 여긴 딱히 트집 잡을 부분이 없었어요',
    '혼자 왔으면 좀 뻘쭘했을 것 같은데 같이 와서 오히려 편했어요',
    '요즘 가격들 다 올라서 그런가 여긴 그나마 양심적인 편이라는 생각이 들더라고요',
    '원래 이런 메뉴 잘 안 시키는데 이번엔 그냥 분위기에 맞춰서 가봤어요',
  ]
  const midAsideN = [
    '크게 기대 안 하고 갔다가 결과적으로 나쁘지 않았어요',
  ]

  // [마무리] 키워드 녹인 재방문 의지 — 짧게
  const outroF: Record<string, string[]> = {
    warm: [
      (area ? area + ' 쪽에서 ' : '') + (kw2 || '분위기 좋은 곳') + ' 고민 중이라면 한 번쯤 가볼 만해요. 저는 다음에 ' + sig2 + ' 먹으러 또 올 생각이고요',
      (kw1 || '') + ' 찾다가 고른 건데 기대보다 괜찮았어요. 다음엔 ' + companion + ' 또 와보려고요',
      '생각보다 오래 앉아 있다가 나왔는데, ' + (kw2 || '') + ' 고민 중이면 후보에 올려두셔도 좋을 것 같아요',
    ],
    short: [
      '전체적으로 괜찮았어요. ' + (kw1 || '') + ' 생각나면 또 올 것 같아요',
      (kw2 || '') + ' 찾으시면 한번 가보세요',
    ],
    detail: [
      '정리하자면 ' + (kw1 || store.category) + ' 찾다가 고른 건데 결과적으로 괜찮은 선택이었어요. 맛이랑 분위기 중에 한쪽만 좋고 다른 쪽이 애매한 곳이 꽤 많은데 여긴 둘 다 적정선을 맞춰줘서 큰 불만은 없었고요, ' + (kw2 || '') + ' 고민 중이신 분들도 참고할 만한 곳이에요. 저는 다음에 ' + sig2 + ' 한 번 더 확인하러 올 생각이에요',
      '기대 반 걱정 반으로 갔다가 결론적으로는 만족이었어요. ' + (kw1 || '') + '이랑 ' + (kw2 || '') + ' 두 기준 다 밀리는 부분이 없었고, 무엇보다 오래 앉아 있어도 눈치 안 보이는 분위기라 그게 제일 좋았어요',
    ],
    casual: [
      (kw2 || '') + ' 찾다가 여기 왔는데 다시 올 만해요. ' + companion + ' 또 와볼 것 같아요',
      '생각보다 오래 있다가 나왔네요. ' + (kw1 || '') + ' 근처 오실 일 있으면 가볍게 들러보세요',
    ],
  }
  const outroM: Record<string, string[]> = {
    warm: [
      (area ? area + ' ' : '') + (kw2 || '') + ' 찾으시는 분들 한번 가볼 만한 곳입니다. 저는 다음에 ' + sig2 + ' 한 번 더 시도해볼 생각이에요',
      (kw1 || store.category) + ' 기준으로 봐도 무난한 선택이었고 조만간 한 번 더 방문할 생각 있습니다',
    ],
    short: [
      '전반적으로 무난합니다. ' + (kw1 || '') + ' 생각날 때 떠오를 곳이에요',
      (kw2 || '') + ' 괜찮았고 재방문 의사 있습니다',
    ],
    detail: [
      '정리하면 맛 공간 응대 셋 다 큰 불만 없이 마무리된 방문이었어요. ' + (kw1 || store.category) + '이나 ' + (kw2 || '') + ' 기준으로도 딱히 빠지는 부분은 없었고, 가성비 따지는 편인 저한테는 나쁘지 않은 선택이었습니다. 다음엔 ' + sig2 + ' 시도해볼 생각이에요',
      '몇 군데 비교해보고 고른 건데 결과적으로 여기가 무난했어요. ' + (kw1 || '') + ' 필요한 날 후보에 넣어둘 만한 곳입니다',
    ],
    casual: [
      '무난하게 잘 다녀왔어요. ' + (kw1 || '') + ' 근처면 한번 가볼 만합니다',
      (kw2 || '') + ' 찾으신다면 리스트에 올려둘 만해요',
    ],
  }
  const outroN: Record<string, string[]> = {
    warm: [(area ? area : '이 근처') + ' ' + (kw2 || '') + ' 찾는다면 가볼 만해요. 다음에 또 올 것 같아요'],
    short: [(kw2 || '') + ' 괜찮았어요. 재방문 의사 있어요'],
    detail: [(kw1 || store.category) + ' 기준에서 무난한 곳이에요. ' + (kw2 || '') + ' 고민 중이면 참고하시면 좋을 것 같아요'],
    casual: [(kw2 || '') + ' 찾으신다면 한번 가보세요. 무난하게 다녀왔어요'],
  }

  // [반말 혼잣말 풀] 존댓말 본문 중간에 툭 튀어나오는 반말 — 사람 특유의 내적 독백
  const banmalF = [
    '이거 진짜 내 스타일',
    '다시 와야지',
    '생각보다 괜찮다',
    '의외로 맘에 들었음',
    '다음에 또 올 듯',
    '아 여긴 좀 좋네',
    '기분 전환 딱이네',
    '오길 잘했다 진짜',
  ]
  const banmalM = [
    '나쁘지 않네',
    '이 정도면 충분하지',
    '또 와야겠다',
    '의외로 괜찮다',
    '무난함',
    '가성비는 챙기는 편',
    '한 번 더 와봐도 될 듯',
    '결론은 다시 옴',
  ]
  const banmalN = [
    '괜찮네',
    '무난함',
    '다시 올 듯',
    '생각보다 나쁘지 않다',
  ]

  // 반말 삽입 헬퍼 — 60% 확률로 한 문장 삽입
  const banmalPool = gender === 'F' ? banmalF : gender === 'M' ? banmalM : banmalN
  const injectBanmal = (): string => {
    if (Math.random() > 0.6) return ''
    return ' ' + pick(banmalPool) + '.'
  }

  // 성별 분기 조립
  const aside1 = gender === 'F' ? pick(asidesF) : gender === 'M' ? pick(asidesM) : pick(asidesN)
  const why = gender === 'F' ? pick(whyF) : gender === 'M' ? pick(whyM) : pick(whyN)
  const arrival = gender === 'F' ? pick(arrivalF) : gender === 'M' ? pick(arrivalM) : pick(arrivalN)
  const order = gender === 'F' ? pick(orderF) : gender === 'M' ? pick(orderM) : pick(orderN)
  const mid = gender === 'F' ? pick(midAsideF) : gender === 'M' ? pick(midAsideM) : pick(midAsideN)
  const outroMap = gender === 'F' ? outroF : gender === 'M' ? outroM : outroN
  const outro = pick(outroMap[tone] || outroMap.warm)

  // 길이별 단락 구성 — 한 단락으로 쭉 이어지는 수다 톤, 줄바꿈 최소화
  // 반말 혼잣말은 주문 뒤 or 마무리 앞에 가끔 툭 삽입
  let text = ''
  if (length === 'short') {
    // 짧음: 오프닝 + 주문 + (가끔 반말) + 마무리
    text = opening + '. ' + order + '.' + injectBanmal() + ' ' + outro + '.'
  } else if (length === 'mid') {
    // 중간: 오프닝 + 배경 사담 + 왜 왔는지 + 주문 + (가끔 반말) + 마무리
    text = opening + '. ' + aside1 + '. ' + why + '. ' + order + '.' + injectBanmal() + ' ' + outro + '.'
  } else {
    // 길게: 단락 1(오프닝+사담+동기+도착 + 가끔 반말)
    //       단락 2(주문+중간사담 + 가끔 반말 + 마무리)
    text = opening + '. ' + aside1 + '. ' + why + '. ' + arrival + '.' + injectBanmal()
      + '\n\n'
      + order + '. ' + mid + '.' + injectBanmal() + ' ' + outro + '.'
  }

  // 길이 가드 — 사담 섞이다 보니 약간 여유 둠. 문장 경계에서 자르기
  const limits: Record<LengthKey, number> = { short: 170, mid: 290, long: 460 }
  const max = limits[length]
  if (text.length > max) {
    const cut = text.slice(0, max)
    // 마침표 또는 "요" 기준으로 가장 가까운 경계 찾기
    const lastDot = cut.lastIndexOf('.')
    text = lastDot > 60 ? cut.slice(0, lastDot + 1) : cut
  }

  // 공백/중복 정리 (정규식 금지, 줄바꿈은 보존)
  while (text.indexOf('  ') >= 0) text = text.split('  ').join(' ')
  while (text.indexOf('..') >= 0) text = text.split('..').join('.')
  text = text.split(' ,').join(',').split(' .').join('.')
  text = text.split('. .').join('.')

  return text.trim()
}
