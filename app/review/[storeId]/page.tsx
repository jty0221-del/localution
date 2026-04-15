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
  const sig2 = pick(store.signatures.filter(s => s !== sig1).length > 0 ? store.signatures.filter(s => s !== sig1) : store.signatures)
  const kw1 = store.keywords[0] || ''
  const kw2 = store.keywords[1] || kw1
  const kw3 = store.keywords[2] || kw2
  const area = store.address ? store.address.split(' ').slice(-1)[0] : ''

  const hasReceipt = photos.some(p => p.cat === 'receipt')
  const hasPhoto = photos.some(p => p.cat === 'photo')

  // 자연스러운 도입부 풀
  const intros = [
    '주말에 시간 나서 ' + store.name + ' 다녀왔어요',
    '요즘 ' + (kw1 || store.category) + ' 찾고 있었는데 여기 좋다길래 ' + store.name + ' 가봤거든요',
    '퇴근하고 ' + store.name + ' 들렀어요',
    (area ? area + ' ' : '') + '쪽 볼 일 있어서 갔다가 ' + store.name + ' 발견했는데',
    '친구가 여기 괜찮다고 해서 ' + store.name + ' 와봤는데',
    '오랜만에 ' + store.name + ' 다녀왔는데',
  ]

  // 톤별 도입 연결
  const introTails: Record<string, string[]> = {
    warm: [' 생각보다 훨씬 좋았어요.', ' 진짜 기분 좋게 잘 먹고 왔어요.', ' 오길 잘했다 싶더라고요.'],
    short: ['.', ' 다녀옴.', '.'],
    detail: [' 처음 가본 곳인데 인상 깊었어요.', ' 평소에 이런 곳 잘 안 가는데 여긴 좀 다르더라고요.', ' 분위기부터 메뉴까지 하나하나 체크해봤어요.'],
    casual: [' 완전 취향 저격!', ' 진짜 괜찮았어요ㅎㅎ', ' 오래 찾던 곳 발견한 느낌!'],
  }

  // 메뉴/사진 관련 본문
  const foodParts = hasReceipt
    ? [
        '이번에 ' + sig1 + ' 시켰는데 양도 괜찮고 맛도 제 취향이었어요.',
        sig1 + '이랑 ' + sig2 + ' 주문했거든요. 둘 다 기대 이상이었어요.',
        sig1 + ' 먹어봤는데 생각보다 퀄리티 있더라고요.',
      ]
    : [
        sig1 + '이 괜찮다고 들어서 먹어봤는데 진짜 맛있었어요.',
        sig1 + ' 먹어봤는데 왜 여기 단골 생기는지 알 것 같아요.',
      ]

  const photoParts = hasPhoto
    ? [
        '매장도 깔끔하고 사진 찍기 좋더라고요.',
        '자리도 편하고 분위기가 차분해서 오래 있어도 괜찮았어요.',
        '인테리어가 깔끔해서 앉아만 있어도 기분 좋아지는 느낌이었어요.',
      ]
    : []

  const servicePool = [
    '사장님도 친절하시고 응대가 편했어요.',
    '직원분들도 신경 많이 써주시는 게 느껴졌어요.',
    '응대도 부담스럽지 않고 딱 적당했어요.',
  ]

  // 나이대별 자연스러운 한마디
  const ageLines: Record<string, string[]> = {
    '10s': ['친구들이랑 가기 딱 좋은 것 같아요.', '또래끼리 가면 좋아할 곳이에요.'],
    '20s': ['데이트하기도 좋고 친구랑 가기도 좋아요.', '감성 찾는 사람들한테 괜찮을 것 같아요.'],
    '30s': ['조용히 쉬고 싶을 때 가기 좋더라고요.', '바쁜 하루 끝에 여유 찾기 좋은 곳이에요.'],
    '40s': ['가족끼리 가도 편하게 있을 수 있어요.', '부담 없이 쉬다 오기 좋아요.'],
    '50s+': ['어른들 모시고 가도 괜찮은 곳이에요.', '편하게 한 끼 하기 좋더라고요.'],
  }

  // 마무리 (톤별 · 구어체 섞기)
  const outros: Record<string, string[]> = {
    warm: [
      '여기 분들은 ' + (kw2 || '분위기 좋은 곳') + ' 찾을 때 한번 가보시면 좋을 것 같아요. 저는 또 올 것 같아요.',
      (kw1 || '') + ' 생각나면 여기 떠오를 것 같아요. 조만간 또 가려고요.',
      '오래 기억에 남을 곳이에요. 주변에도 추천하고 싶어요.',
    ],
    short: [
      (kw2 || '분위기 좋음') + '. 재방문 의사 있어요.',
      '만족. ' + (kw1 || '') + '.',
      (kw1 || '') + ' · ' + (kw2 || '') + ' 추천.',
    ],
    detail: [
      '전체적으로 보면 ' + (kw2 || '만족도 높은 곳') + '이라고 할 수 있어요. ' + (kw3 || '') + '까지 생각해보면 괜찮은 선택인 것 같고, 다음에 또 와보려고 해요.',
      (kw1 || '') + ' 찾는 분들한테 소개하고 싶은 곳이에요. 가격이나 퀄리티 대비 만족스러웠고, 재방문할 마음이 확실히 생겼어요.',
    ],
    casual: [
      (kw2 || '분위기 좋은 곳') + ' 찾는 사람들 여기 완전 추천이에요! 저는 또 갈 거거든요ㅎㅎ',
      (kw1 || '') + ' 근처 계신 분들 한번 가보세요, 후회 안 해요!',
      '진짜 괜찮았어요. 다음에 또 올 거예요.',
    ],
  }

  const intro = pick(intros) + pick(introTails[tone] || introTails.warm)
  const foodLine = pick(foodParts)
  const photoLine = photoParts.length > 0 ? ' ' + pick(photoParts) : ''
  const serviceLine = ' ' + pick(servicePool)
  const ageLine = ' ' + pick(ageLines[age] || ageLines['30s'])
  const outro = ' ' + pick(outros[tone] || outros.warm)

  // 길이별 조합
  let text = ''
  if (length === 'short') {
    // 150자 이내 - 도입 + 핵심 + 짧은 마무리
    text = intro + ' ' + foodLine + outro
  } else if (length === 'mid') {
    // 250자 이내 - 도입 + 메뉴 + 분위기/응대 중 1개 + 마무리
    text = intro + ' ' + foodLine + photoLine + ageLine + outro
  } else {
    // 400자 이내 - 다 섞기
    text = intro + ' ' + foodLine + photoLine + serviceLine + ageLine + outro
  }

  // 길이 가드 (문장 경계에서 자르기)
  const limits: Record<LengthKey, number> = { short: 150, mid: 250, long: 400 }
  const max = limits[length]
  if (text.length > max) {
    const cut = text.slice(0, max)
    const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('요'))
    text = lastDot > 50 ? cut.slice(0, lastDot + 1) : cut
  }

  // 공백/중복 정리 (정규식 금지)
  while (text.indexOf('  ') >= 0) text = text.split('  ').join(' ')
  while (text.indexOf('..') >= 0) text = text.split('..').join('.')
  text = text.split(' ,').join(',').split(' .').join('.')

  return text.trim()
}
