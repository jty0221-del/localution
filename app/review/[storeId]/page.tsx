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
  // 성별 분기 내러티브
  //  - F: 호들갑 · 수다스러움 · ㅠㅠㅎㅎ · 느낌표 · 과장 감탄사
  //  - M: 부드럽게 써보려고 노력한 티 · 약간 담백/서툼 · 짧은 호흡 · 이모지 없음
  //  - -: 중립 내러티브 (기본)
  // ─────────────────────────────────────────

  // ===== 여성 호들갑 풀 =====
  const F_scene1 = [
    '주말에 친구랑 약속 잡았다가 여기 ' + store.name + ' 왔는데 진짜ㅠㅠ 완전 제 취향이었어요!!',
    '요즘 ' + (kw1 || store.category) + ' 핫한 곳 찾고 있었는데 여기 소문 듣고 바로 ' + store.name + ' 달려왔어요ㅎㅎ',
    '친구가 여기 꼭 가봐야 된다고 난리길래 ' + store.name + ' 다녀왔는데요~ 결론부터 말하면 진짜 너무 좋았어요ㅠㅠㅠ',
    '오랜만에 셀프 힐링 좀 해볼까 해서 ' + store.name + ' 왔잖아요~ 근데 기대 이상이었어요!!',
    (area ? area + ' ' : '') + '쪽 놀러 왔다가 ' + store.name + ' 들렀는데 완전 대박ㅠㅠ 처음부터 끝까지 만족이었어요!',
  ]
  const F_scene2 = hasPhoto
    ? [
        '들어가자마자 분위기 미쳤어요ㅠㅠ 사진부터 막 찍었잖아요ㅎㅎ',
        '공간이 너무 예뻐서 앉기 전부터 핸드폰 먼저 꺼냈어요ㅋㅋㅋ',
        '인테리어 진짜 취향 저격이에요~ 구석구석 예쁘더라구요!',
        '자리마다 분위기가 달라서 어디 앉을지 한참 고민했어요ㅎㅎ',
      ]
    : [
        '들어가자마자 느낌부터 좋았어요~ 뭔가 기분 좋아지는 공간이더라구요!',
        '위치도 딱 찾기 좋아서 편했어요ㅎㅎ',
        '안쪽으로 들어가니까 더 아늑해서 놀랐어요ㅠㅠ',
      ]
  const F_scene3 = hasReceipt
    ? [
        '저 이번에 ' + sig1 + '이랑 ' + sig2 + ' 시켰는데요~ 둘 다 진짜진짜 맛있었어요ㅠㅠ 특히 ' + sig1 + ' 완전 제 취향!!',
        sig1 + ' 먼저 먹어봤는데 한 입 먹자마자 "헉" 했어요ㅠㅠ 진짜 맛있더라구요~',
        '대표 메뉴 ' + sig1 + ' 먹어봐야 된다길래 시켰는데요!! 소문대로 진짜 맛있었어요ㅎㅎ 다음엔 ' + sig2 + '도 꼭 먹어볼 거예요~',
      ]
    : [
        sig1 + ' 시켜봤어요~ 첫입부터 "오~?" 하면서 계속 먹었잖아요ㅎㅎ 진짜 맛있었어요ㅠㅠ',
        sig1 + ' 유명하다길래 기대하고 먹었는데요 기대 이상이었어요!! 완전 만족~',
      ]
  const F_scene4 = [
    '사장님 너무너무 친절하셔서 완전 기분 좋게 먹고 왔어요ㅠㅠ',
    '직원분들도 응대가 다정해서 편했어요~ 이런 거 되게 중요하잖아요ㅎㅎ',
    '사장님이 메뉴 설명도 해주시고 진짜 세심하셔서 감동이었어요ㅠㅠ',
  ]
  const F_scene5: Record<string, string[]> = {
    '10s': ['친구들이랑 오면 완전 좋아할 것 같아요!! 사진도 엄청 잘 나와요ㅎㅎ', '또래끼리 수다 떨기 딱이에요ㅠㅠ 진짜 강추!'],
    '20s': ['데이트 코스로도 완전 찰떡이고 친구랑 와도 좋아요ㅎㅎ', '2030이면 여기 진짜 좋아할 거예요ㅠㅠ 감성 터져요~'],
    '30s': ['바쁜 일상 중에 힐링하러 오기 딱 좋아요ㅠㅠ 저도 또 올 거예요!', '조용히 쉬고 싶을 때 생각날 곳이에요~ 완전 내 스타일!'],
    '40s': ['가족이랑 와도 너무 편해요~ 엄마랑 같이 와도 좋아하실 것 같아요ㅎㅎ', '부담 없이 편하게 쉬기 좋아요ㅠㅠ 재방문 확정!'],
    '50s+': ['어른들 모시고 와도 좋을 분위기예요~ 부담 없어서 딱이에요ㅎㅎ', '편하게 한 끼 하기 정말 좋은 곳이에요!'],
  }
  const F_outro: Record<string, string[]> = {
    warm: [
      (area ? area + ' ' : '') + (kw2 || '분위기 좋은 곳') + ' 찾는 분들 여기 진짜 완전 강추예요ㅠㅠ!! 저 다음 주에 또 올 거예요ㅎㅎ',
      '진짜 오길 잘했다 싶었어요ㅠㅠ ' + (kw1 || store.category) + ' 찾으시면 무조건 여기 가세요!!',
      '여기 리스트에 바로 추가했어요ㅋㅋ ' + (kw1 || '') + ' 생각나면 또 올 거예요ㅠㅠ',
    ],
    short: [
      '완전 만족ㅠㅠ ' + (kw2 || '') + ' 찾으시면 여기요!!',
      (kw1 || '') + ' 강추강추~ 또 올 거예요ㅎㅎ',
      '진짜 맛있었어요ㅠㅠ ' + (kw2 || '') + ' 추천해요!',
    ],
    detail: [
      (kw1 || store.category) + ' 진심으로 여기 진짜 잘 왔다 싶었어요ㅠㅠ 분위기·맛·응대 다 챙기는 곳 찾기 쉽지 않잖아요~ 근데 여기가 딱이었어요!! ' + (kw2 || '') + ' 찾는 분들 한번 꼭 가보세요~',
      '사진만 보고 갔다가 실물이 더 좋아서 당황했잖아요ㅋㅋ ' + (kw1 || '') + '·' + (kw2 || '') + ' 다 기대해도 되는 곳이에요!! 저 진짜 자주 올 것 같아요ㅠㅠ',
    ],
    casual: [
      (kw2 || '') + ' 찾는 사람들 여기 완전 내 스타일일걸요ㅎㅎ!! 진짜 강추~',
      '여기 한번만 와봐요ㅠㅠ 진짜 반할 거예요!! ' + (kw1 || '') + ' 강추~',
      '저 완전 단골 될 예정이에요ㅋㅋㅋ ' + (kw1 || '') + ' 근처 오면 무조건 여기!!',
    ],
  }

  // ===== 남성 (부드럽게 써보려고 노력한 티) 풀 =====
  // 특징: 담백한 ~어요/~네요 기본, 가끔 "~더라구요" 조심스럽게 시도, 느낌표 최소, 이모지 없음, 문장 짧고 단정
  const M_scene1 = [
    '주말에 시간이 나서 ' + store.name + ' 방문해봤어요.',
    '평소 ' + (kw1 || store.category) + ' 쪽 관심이 있어서 ' + store.name + ' 한번 가봤어요.',
    (area ? area + ' ' : '') + '근처에 볼 일이 있어서 겸사겸사 ' + store.name + ' 들렀어요.',
    '지인 추천으로 ' + store.name + ' 찾아가봤어요.',
    '퇴근길에 ' + store.name + ' 들러봤어요. 오래 전부터 궁금했던 곳이에요.',
  ]
  const M_scene2 = hasPhoto
    ? [
        '안으로 들어가니 생각보다 공간이 넓고 깔끔했어요.',
        '자리 간격도 여유롭고 조명이 차분해서 편하게 앉을 수 있었어요.',
        '첫인상이 단정해서 마음에 들더라구요.',
        '공간 구성이 정돈된 느낌이라 기분 좋게 앉았어요.',
      ]
    : [
        '위치가 찾기 어렵지 않아서 좋았어요.',
        '평일 저녁이었는데 자리도 여유 있어서 편했어요.',
        '처음 와보는 곳이었지만 분위기가 어색하지 않았어요.',
      ]
  const M_scene3 = hasReceipt
    ? [
        '메뉴판을 보고 ' + sig1 + '이랑 ' + sig2 + ' 주문했어요. 둘 다 만족스러웠어요.',
        '대표 메뉴라는 ' + sig1 + ' 먼저 먹어봤어요. 양도 괜찮고 맛이 담백해서 좋았어요.',
        sig1 + ' 시켜봤는데 생각보다 깊이가 있는 맛이에요. 추천해줄 만하네요.',
      ]
    : [
        sig1 + ' 주문했어요. 평이 좋은 이유가 있더라구요.',
        sig1 + '이 유명하다고 해서 시켜봤어요. 기대만큼 괜찮았어요.',
      ]
  const M_scene4 = [
    '사장님 응대가 편안해서 부담 없이 식사할 수 있었어요.',
    '직원분들도 필요한 때만 조용히 도와주셔서 편했어요.',
    '주문이나 안내가 간결해서 좋았어요. 이런 부분이 생각보다 중요하더라구요.',
  ]
  const M_scene5: Record<string, string[]> = {
    '10s': ['또래 친구들과 와도 어색하지 않을 분위기예요.', '가볍게 들르기 좋은 곳이에요.'],
    '20s': ['혼자 와도, 누구와 와도 편하게 있을 수 있는 곳이에요.', '요즘 감성에 맞는 무난한 분위기라 좋았어요.'],
    '30s': ['일 끝나고 조용히 시간 보내기 좋은 곳이에요.', '하루 마무리로 들르기 적당한 분위기였어요.'],
    '40s': ['가족과 와도 부담 없는 곳이에요.', '편하게 한 끼 하기 좋은 분위기였어요.'],
    '50s+': ['어른을 모시고 와도 무난한 곳이에요.', '조용히 머물기에 좋은 공간이에요.'],
  }
  const M_outro: Record<string, string[]> = {
    warm: [
      (area ? area + ' 근처' : '이 동네') + '에서 ' + (kw2 || '괜찮은 곳') + ' 찾으신다면 한번 가보실 만해요. 저도 조만간 다시 방문할 생각이에요.',
      '기분 좋게 잘 다녀왔어요. ' + (kw1 || store.category) + ' 찾는 분들께 조심스럽게 추천드려요.',
      (kw1 || '') + ' 생각날 때 한 번씩 떠오를 것 같아요. 다음에 또 와볼 생각이에요.',
    ],
    short: [
      (kw2 || '') + ' 무난하게 괜찮았어요. 재방문 의사 있어요.',
      (kw1 || '') + ' 추천할 만합니다.',
      '담백하게 잘 먹고 왔어요. ' + (kw1 || '') + '.',
    ],
    detail: [
      '전반적으로 ' + (kw1 || store.category) + ' 기준으로 부족함 없는 곳이에요. ' + (kw2 || '') + ' 찾으시는 분들께도 나쁘지 않을 것 같아요. 저는 다시 방문할 생각입니다.',
      '맛·분위기·응대 셋 다 무난하게 챙긴 곳이에요. ' + (kw1 || '') + '·' + (kw2 || '') + ' 기대하시는 분들한테 조심스럽게 권해드리고 싶어요.',
    ],
    casual: [
      (kw2 || '') + ' 찾으신다면 한번 가보세요. 저는 다음에 또 와볼 것 같아요.',
      '가볍게 다녀오기 괜찮은 곳이에요. ' + (kw1 || '') + ' 근처 오시면 들러보세요.',
      '무난하게 잘 다녀왔어요. ' + (kw1 || '') + ' 생각나면 또 올 것 같아요.',
    ],
  }

  // ===== 중립(-) 풀 =====
  const N_scene1 = [
    '주말에 시간 나서 ' + store.name + ' 다녀왔어요.',
    '요즘 ' + (kw1 || store.category) + ' 찾고 있다가 ' + store.name + ' 가봤어요.',
    (area ? area + ' ' : '') + '쪽에 일 있어서 간 김에 ' + store.name + ' 들렀어요.',
    '지인 추천으로 ' + store.name + ' 찾아가봤어요.',
  ]
  const N_scene2 = hasPhoto
    ? ['들어가자마자 공간이 깔끔하고 편안했어요.', '자리도 적당히 여유 있어서 기분 좋게 앉았어요.', '분위기가 차분해서 오래 있기 좋았어요.']
    : ['위치가 찾기 쉬워서 편했어요.', '처음이었는데 분위기가 부담 없이 편했어요.']
  const N_scene3 = hasReceipt
    ? [sig1 + '이랑 ' + sig2 + ' 시켰어요. 둘 다 괜찮았어요.', '대표 메뉴 ' + sig1 + ' 먹어봤어요. 기대만큼 만족스러웠어요.']
    : [sig1 + ' 시켜봤어요. 생각보다 맛있었어요.', sig1 + '이 유명하다길래 먹어봤는데 괜찮았어요.']
  const N_scene4 = ['응대도 편하고 부담스럽지 않았어요.', '사장님이 친절하셔서 기분 좋게 다녀왔어요.']
  const N_scene5: Record<string, string[]> = {
    '10s': ['친구들이랑 가볍게 오기 좋아요.'],
    '20s': ['데이트하기도, 혼자 오기도 좋은 곳이에요.'],
    '30s': ['조용히 시간 보내기 좋은 곳이에요.'],
    '40s': ['가족과 와도 편한 곳이에요.'],
    '50s+': ['어른들 모시고 오기에도 무난해요.'],
  }
  const N_outro: Record<string, string[]> = {
    warm: [(area ? area : '이 근처') + ' ' + (kw2 || '괜찮은 곳') + ' 찾는 분들 한번 가보세요. 저도 또 올 것 같아요.'],
    short: [(kw2 || '') + ' 괜찮았어요. 재방문 의사 있어요.'],
    detail: ['전반적으로 ' + (kw1 || store.category) + ' 기준에서 괜찮은 곳이에요. ' + (kw2 || '') + ' 찾는 분들께 추천합니다.'],
    casual: [(kw2 || '') + ' 찾으신다면 한번 가보세요. 기분 좋게 다녀왔어요.'],
  }

  // 성별 분기 선택
  let s1: string, s2: string, s3: string, s4: string, s5: string, s6: string
  if (gender === 'F') {
    s1 = pick(F_scene1)
    s2 = pick(F_scene2)
    s3 = pick(F_scene3)
    s4 = pick(F_scene4)
    s5 = pick(F_scene5[age] || F_scene5['30s'])
    s6 = pick((F_outro[tone] || F_outro.warm))
  } else if (gender === 'M') {
    s1 = pick(M_scene1)
    s2 = pick(M_scene2)
    s3 = pick(M_scene3)
    s4 = pick(M_scene4)
    s5 = pick(M_scene5[age] || M_scene5['30s'])
    s6 = pick((M_outro[tone] || M_outro.warm))
  } else {
    s1 = pick(N_scene1)
    s2 = pick(N_scene2)
    s3 = pick(N_scene3)
    s4 = pick(N_scene4)
    s5 = pick(N_scene5[age] || N_scene5['30s'])
    s6 = pick((N_outro[tone] || N_outro.warm))
  }

  // 길이별 장면 조합
  let text = ''
  if (length === 'short') {
    text = s1 + ' ' + s3 + ' ' + s6
  } else if (length === 'mid') {
    text = s1 + ' ' + s2 + ' ' + s3 + ' ' + s5 + ' ' + s6
  } else {
    text = s1 + ' ' + s2 + ' ' + s3 + ' ' + s4 + ' ' + s5 + ' ' + s6
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
