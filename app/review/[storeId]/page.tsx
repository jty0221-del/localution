'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Step = 'welcome' | 'upload' | 'generating' | 'result'
type Tone = 'z' | 'mom' | 'honest' | 'gourmet' | 'friend' | 'insta'

interface ReceiptInfo {
  storeName?: string
  items: string[]
  total?: string
  date?: string
  matched: boolean
}

const TONES: { key: Tone; emoji: string; label: string; desc: string }[] = [
  { key: 'z',       emoji: '🔥', label: 'Z세대 감성',   desc: '힙하고 트렌디하게'  },
  { key: 'mom',     emoji: '💛', label: '맘카페 후기',   desc: '따뜻하고 신뢰감 있게' },
  { key: 'honest',  emoji: '📝', label: '솔직담백',      desc: '있는 그대로 직접적으로' },
  { key: 'gourmet', emoji: '🍷', label: '미식가',        desc: '격조 있고 전문적으로' },
  { key: 'friend',  emoji: '🤝', label: '친구 추천',     desc: '카톡하듯 편하게'   },
  { key: 'insta',   emoji: '📸', label: '인스타 감성',   desc: '감각적이고 트렌디하게' },
]

// ── 이미지 압축 ──────────────────────────────────────────────
async function compressImage(file: File, quality = 0.72, maxPx = 900): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onerror = rej
    reader.onload = e => {
      const img = new Image()
      img.onerror = rej
      img.onload = () => {
        let w = img.width, h = img.height
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round((h / w) * maxPx); w = maxPx }
          else { w = Math.round((w / h) * maxPx); h = maxPx }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        res(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ── 클라이언트 폴백 리뷰 (API 없어도 항상 작동) ──────────────
function makeLocalReview(name: string, type: string, kw: string, comment: string, tone: Tone, rating: number, items: string[]): { review: string; hashtags: string[] } {
  const item = items.length > 0 ? items.slice(0, 2).join(', ') : ''
  const place = kw || type || name
  const good = rating >= 4
  const reviews: Record<Tone, string> = {
    z:       good
      ? name + ' 다녀왔는데 진짜 레전드 ㅋㅋ ' + (comment || (item ? item + ' 먹었는데 대박이야' : '분위기도 맛도 다 레전드')) + ' 여기 안 오면 진짜 손해임. 강추!'
      : name + ' 방문했어요. ' + (comment || '나쁘진 않았는데 기대보다 조금 아쉬웠어요') + ' 다음엔 또 고려해볼 것 같아요.',
    mom:     good
      ? name + '에 가족이랑 다녀왔어요~ ' + (comment || (item ? item + '가 정말 맛있더라고요' : '음식도 맛있고 서비스도 친절했어요')) + ' 재방문 의사 100% 있습니다! 주변 분들께도 추천드려요.'
      : name + '에 다녀왔어요. ' + (comment || '음식은 괜찮았는데 아쉬운 점도 있었어요') + ' 다음에 다시 방문해볼게요.',
    honest:  good
      ? '[' + name + ' 방문 후기] ' + (comment || (item ? '주문: ' + item + ' / 맛: 합격' : '전반적으로 만족')) + ' | 서비스: 친절함 | 재방문: O | 추천: O'
      : '[' + name + ' 방문 후기] ' + (comment || '음식: 보통 | 서비스: 무난') + ' | 재방문: 고려중',
    gourmet: good
      ? name + '를 방문하였습니다. ' + (comment || (item ? item + '의 풍미와 플레이팅이 인상적이었으며' : '전반적인 요리 완성도가 높으며')) + ' 식재료의 신선도와 조리 기술이 돋보였습니다. ' + (place ? place + '을 찾으신다면 ' : '') + '충분히 방문할 가치가 있는 곳입니다.'
      : name + '를 방문하였습니다. ' + (comment || '요리의 기본기는 갖추고 있으나') + ' 전반적으로 무난한 수준이었습니다.',
    friend:  good
      ? '야 ' + name + ' 거기 진짜야. ' + (comment || (item ? item + ' 먹었는데 ㄹㅇ 맛있더라' : '거기 한번 가봐 진짜')) + ' 나 이미 지인한테 다 추천했어ㅋㅋ 한번 꼭 가봐!'
      : name + ' 가봤는데 ' + (comment || '뭐 그냥 괜찮았어') + ' 나쁘진 않았어 한번 가봐.',
    insta:   good
      ? '✨ ' + name + ' ✨ ' + (comment || (item ? item + ' 먹었는데' : '오늘의 발견!')) + ' 완전 제 취향이에요🥹 분위기도 너무 좋고 혼자도 데이트도 다 OK! 강력 추천해요 📍'
      : '📍 ' + name + ' 다녀왔어요~ ' + (comment || '분위기 좋은 곳이에요') + ' 한번 방문해보세요!',
  }
  const hashtags = ['#' + (kw || name), '#' + (type || '맛집'), good ? '#강추' : '#방문후기']
  return { review: reviews[tone] || reviews['z'], hashtags }
}

// ── 별점 컴포넌트 ──────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="text-4xl leading-none active:scale-90 transition-transform select-none"
        >
          <span className={(hover || value) >= i ? 'text-yellow-400' : 'text-[#E5E8EB]'}>★</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function ReviewContent() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const storeId   = (params?.storeId as string) || ''
  const storeName = searchParams.get('n')     || '이 매장'
  const storeType = searchParams.get('t')     || ''
  const mainKw    = searchParams.get('kw')    || ''
  const naverUrl  = searchParams.get('naver') || ''
  const reward    = searchParams.get('reward') || ''

  const [step,    setStep]    = useState<Step>('welcome')
  const [tone,    setTone]    = useState<Tone>('z')
  const [rating,  setRating]  = useState(5)
  const [photos,  setPhotos]  = useState<{ preview: string; file: File }[]>([])
  const [comment, setComment] = useState('')

  // 영수증 OCR
  const [receipt,        setReceipt]        = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [receiptInfo,    setReceiptInfo]    = useState<ReceiptInfo | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  // 결과
  const [generatedReview, setGeneratedReview] = useState('')
  const [hashtags,        setHashtags]        = useState<string[]>([])
  const [copied,          setCopied]          = useState(false)
  const [genPct,          setGenPct]          = useState(0)
  const [genStepIdx,      setGenStepIdx]      = useState(0)

  const photoRef   = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  // ── 사진 선택 (최대 10장) ────────────────────────────────
  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 10 - photos.length)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setPhotos(p => [...p, { file, preview: ev.target?.result as string }])
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  // ── 영수증 업로드 → OCR ──────────────────────────────────
  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ''

    const reader = new FileReader()
    reader.onload = async ev => {
      const preview = ev.target?.result as string
      setReceiptPreview(preview)
      setReceiptLoading(true)
      setReceiptInfo(null)

      try {
        const compressed = await compressImage(file, 0.88, 1400)
        setReceipt(compressed)
        const res = await fetch('/api/qr-review-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ocr', receiptImage: compressed, expectedStoreName: storeName }),
        })
        if (res.ok) {
          const data = await res.json()
          setReceiptInfo(data.receiptInfo || null)
        }
      } catch {
        // OCR 실패해도 영수증 미리보기만 표시
      } finally {
        setReceiptLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Naver Place URL 추출 ─────────────────────────────────
  function getNaverReviewUrl(): string {
    if (!naverUrl) return 'https://map.naver.com'
    const m = naverUrl.match(/place\/([0-9]+)/)
    if (m) return 'https://m.place.naver.com/place/' + m[1] + '/review/list'
    return naverUrl
  }

  // ── 복사 + 네이버 이동 ───────────────────────────────────
  async function handleNaverAndCopy() {
    const text = generatedReview + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '')
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => window.open(getNaverReviewUrl(), '_blank'), 400)
  }

  async function handleCopyOnly() {
    const text = generatedReview + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '')
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // ── AI 리뷰 생성 ─────────────────────────────────────────
  async function handleGenerate() {
    setStep('generating')
    setGenPct(0)
    setGenStepIdx(0)

    const pctTimer   = setInterval(() => setGenPct(p => p < 88 ? p + Math.random() * 5 + 2 : p), 500)
    const stepTimer  = setInterval(() => setGenStepIdx(p => p < 2 ? p + 1 : p), 3000)

    const done = (review: string, tags: string[]) => {
      clearInterval(pctTimer); clearInterval(stepTimer)
      setGenPct(100); setGenStepIdx(2)
      setGeneratedReview(review); setHashtags(tags)
      setTimeout(() => setStep('result'), 600)
    }

    try {
      const compressed = await Promise.all(photos.slice(0, 3).map(p => compressImage(p.file)))
      const items = receiptInfo?.items || []

      const controller = new AbortController()
      const timeoutId  = setTimeout(() => controller.abort(), 20000)

      const res = await fetch('/api/qr-review-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'generate',
          images: compressed,
          storeName, storeType,
          mainKeyword: mainKw,
          comment, tone, rating,
          receiptItems: items,
        }),
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.review) { done(data.review, data.hashtags || []); return }
      }
    } catch { /* API 실패 → 폴백 */ }

    // 클라이언트 폴백 — API 없어도 항상 작동
    const fallback = makeLocalReview(storeName, storeType, mainKw, comment, tone, rating, receiptInfo?.items || [])
    done(fallback.review, fallback.hashtags)
  }

  // ────────────────────────────────────────────────────────────
  // WELCOME
  // ────────────────────────────────────────────────────────────
  if (step === 'welcome') return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FF] to-white flex flex-col">
      <div className="text-center py-3">
        <span className="text-[11px] text-[#B0B8C1] tracking-wide">Powered by Localution</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center">

        <div className="w-24 h-24 bg-[#3182F6] rounded-[28px] flex items-center justify-center mb-5 shadow-xl shadow-blue-200">
          <span className="text-5xl">⭐</span>
        </div>

        {storeType && <span className="text-xs bg-[#EFF6FF] text-[#3182F6] px-3 py-1 rounded-full font-bold mb-2 inline-block">{storeType}</span>}
        <h1 className="text-[26px] font-black text-[#191F28] leading-tight mb-1">{storeName}</h1>
        <p className="text-base text-[#4E5968] font-semibold mb-6">AI 리뷰 자동 작성</p>

        {/* 기능 카드 */}
        <div className="w-full max-w-xs space-y-2.5 mb-6">
          {[
            { icon: '📸', text: '사진 · 영수증 업로드 → AI 자동 분석' },
            { icon: '✍️', text: '말투 6가지 중 원하는 스타일 선택' },
            { icon: '📋', text: '복사 + 네이버 플레이스 바로 이동' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#F2F4F6]">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-semibold text-[#191F28]">{f.text}</span>
            </div>
          ))}
        </div>

        {/* 말투 선택 */}
        <div className="w-full max-w-xs mb-6">
          <p className="text-xs font-bold text-[#4E5968] mb-2 text-left">✍️ 리뷰 스타일 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(t => (
              <button
                key={t.key}
                onClick={() => setTone(t.key)}
                className={[
                  'rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 border-2 transition-all',
                  tone === t.key
                    ? 'border-[#3182F6] bg-[#EFF6FF]'
                    : 'border-[#E5E8EB] bg-white',
                ].join(' ')}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className={['text-[11px] font-bold leading-tight', tone === t.key ? 'text-[#3182F6]' : 'text-[#4E5968]'].join(' ')}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 별점 */}
        <div className="w-full max-w-xs mb-6 bg-white rounded-2xl p-4 border border-[#F2F4F6]">
          <p className="text-xs font-bold text-[#4E5968] mb-3">⭐ 별점 (기본 5점)</p>
          <div className="flex justify-center">
            <StarPicker value={rating} onChange={setRating} />
          </div>
        </div>

        {reward && (
          <div className="w-full max-w-xs bg-[#FFF7E6] border border-[#FFD666] rounded-2xl px-5 py-3.5 mb-5">
            <p className="text-xs text-[#8B5E00] font-bold">🎁 리뷰 작성 시 혜택</p>
            <p className="text-sm font-black text-[#191F28] mt-1">{reward}</p>
          </div>
        )}

        <button onClick={() => setStep('upload')}
          className="w-full max-w-xs bg-[#3182F6] text-white text-lg font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform">
          사진 업로드하러 가기 →
        </button>
        <p className="text-xs text-[#B0B8C1] mt-3">2~3분이면 완성!</p>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────
  // UPLOAD
  // ────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => setStep('welcome')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F4F6] text-xl">←</button>
        <div className="flex-1">
          <p className="font-black text-[#191F28] text-sm">{storeName}</p>
          <p className="text-xs text-[#8B95A1]">사진 · 영수증 업로드</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i=><div key={i} className={['w-2 h-2 rounded-full',i===0?'bg-[#3182F6]':'bg-[#E5E8EB]'].join(' ')}/>)}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto" style={{ paddingBottom: '110px' }}>

        {/* ── 영수증 업로드 ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E8EB]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🧾</span>
            <p className="text-sm font-bold text-[#191F28]">영수증 업로드</p>
            <span className="text-[10px] bg-[#EFF6FF] text-[#3182F6] px-2 py-0.5 rounded-full font-bold">OCR 자동 인식</span>
          </div>

          {receiptPreview ? (
            <div className="relative">
              <img src={receiptPreview} className="w-full max-h-48 object-contain rounded-xl bg-[#F2F4F6]" alt="영수증" />
              <button onClick={() => { setReceiptPreview(null); setReceipt(null); setReceiptInfo(null) }}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs font-bold">✕</button>
              {receiptLoading && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#3182F6] border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-[#3182F6] font-bold">영수증 분석 중...</p>
                </div>
              )}
              {receiptInfo && !receiptLoading && (
                <div className="mt-2 bg-[#E8FFF5] border border-[#A3E6C8] rounded-xl p-3">
                  <p className="text-[11px] font-bold text-[#00B87A] mb-1">
                    {receiptInfo.matched ? '✓ 매장 일치 확인됨' : '⚠ 매장 정보 확인 필요'}
                  </p>
                  {receiptInfo.storeName && <p className="text-xs text-[#191F28]">📍 {receiptInfo.storeName}</p>}
                  {receiptInfo.items.length > 0 && <p className="text-xs text-[#4E5968] mt-0.5">🍽 {receiptInfo.items.join(', ')}</p>}
                  {receiptInfo.total  && <p className="text-xs text-[#4E5968]">💰 {receiptInfo.total}</p>}
                  {receiptInfo.date   && <p className="text-xs text-[#8B95A1]">📅 {receiptInfo.date}</p>}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => receiptRef.current?.click()}
              className="w-full border-2 border-dashed border-[#C8D1DC] rounded-xl py-6 flex flex-col items-center bg-[#FAFBFF] active:bg-[#F2F4F6]">
              <span className="text-3xl mb-1">🧾</span>
              <span className="text-sm font-bold text-[#4E5968]">영수증 사진 선택</span>
              <span className="text-xs text-[#B0B8C1] mt-0.5">메뉴·금액을 AI가 자동 인식해요</span>
            </button>
          )}
          <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
        </div>

        {/* ── 음식/매장 사진 ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E8EB]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📷</span>
              <p className="text-sm font-bold text-[#191F28]">음식 · 매장 사진</p>
            </div>
            <span className="text-xs text-[#8B95A1]">{photos.length}/10</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                <img src={p.preview} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✕</button>
              </div>
            ))}
            {photos.length < 10 && (
              <button onClick={() => photoRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#C8D1DC] flex flex-col items-center justify-center bg-[#FAFBFF] active:bg-[#F2F4F6]">
                <span className="text-xl text-[#B0B8C1]">+</span>
                <span className="text-[10px] text-[#8B95A1]">추가</span>
              </button>
            )}
          </div>

          {photos.length === 0 && (
            <button onClick={() => photoRef.current?.click()}
              className="mt-2 w-full border-2 border-dashed border-[#3182F6] rounded-xl py-8 flex flex-col items-center bg-[#EFF6FF] active:bg-[#DBEAFE]">
              <span className="text-4xl mb-2">📷</span>
              <span className="font-bold text-[#3182F6]">사진 선택 (최대 10장)</span>
              <span className="text-xs text-[#4E5968] mt-1">카메라 또는 앨범</span>
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
        </div>

        {/* ── 한마디 + 별점 확인 ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E8EB]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#191F28]">한마디 · 별점</p>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i=><span key={i} className={i<=rating?'text-yellow-400':'text-[#E5E8EB]'}>★</span>)}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={120}
            placeholder="음식이나 서비스에 대한 느낌을 간단히 (선택)"
            className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-[#3182F6]"
            rows={3}
          />
          <p className="text-xs text-[#B0B8C1] text-right mt-1">{comment.length}/120</p>
        </div>

        <p className="text-xs text-center text-[#B0B8C1]">사진 없이 한마디만으로도 생성 가능해요</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] px-4 py-4">
        <button
          onClick={handleGenerate}
          disabled={photos.length === 0 && !comment.trim() && !receipt}
          className="w-full bg-[#3182F6] disabled:bg-[#C8D1DC] text-white text-base font-black py-4 rounded-2xl active:scale-95 disabled:active:scale-100 transition-all">
          ✨ AI 리뷰 생성하기
        </button>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────
  // GENERATING
  // ────────────────────────────────────────────────────────────
  if (step === 'generating') {
    const steps = ['사진 · 영수증 분석 중', '리뷰 문장 작성 중...', '완성!']
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 border-[5px] border-[#EFF6FF] rounded-full" />
          <div className="absolute inset-0 border-[5px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
        </div>
        <h2 className="text-xl font-black text-[#191F28] mb-2">AI가 리뷰를 작성 중이에요</h2>
        <p className="text-sm text-[#8B95A1] mb-8">잠시만 기다려 주세요...</p>
        <div className="w-full max-w-xs bg-[#F2F4F6] rounded-full h-2 mb-6 overflow-hidden">
          <div className="h-2 bg-[#3182F6] rounded-full transition-all duration-500" style={{ width: genPct + '%' }} />
        </div>
        <div className="space-y-3 w-full max-w-xs text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={['w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                i < genStepIdx ? 'bg-[#00C785] text-white' : i === genStepIdx ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#B0B8C1]'].join(' ')}>
                {i < genStepIdx ? '✓' : i + 1}
              </div>
              <span className={['text-sm font-semibold',
                i < genStepIdx ? 'text-[#00C785]' : i === genStepIdx ? 'text-[#3182F6]' : 'text-[#B0B8C1]'].join(' ')}>{s}</span>
              {i === genStepIdx && <div className="w-2 h-2 bg-[#3182F6] rounded-full animate-pulse" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────
  // RESULT
  // ────────────────────────────────────────────────────────────
  if (step === 'result') return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 bg-[#00C785] rounded-full flex items-center justify-center">
          <span className="text-white font-black">✓</span>
        </div>
        <div className="flex-1">
          <p className="font-black text-[#191F28] text-sm">리뷰 완성!</p>
          <p className="text-xs text-[#8B95A1]">버튼 하나로 복사 + 네이버 이동</p>
        </div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i=><span key={i} className={i<=rating?'text-yellow-400 text-lg':'text-[#E5E8EB] text-lg'}>★</span>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: '160px' }}>
        <div className="flex justify-center mb-5">
          <div className="bg-[#E6FFF5] text-[#00B87A] px-5 py-2 rounded-full text-sm font-bold">🎉 리뷰 생성 완료!</div>
        </div>

        {/* 리뷰 카드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-[#E5E8EB]">
          <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-[#F2F4F6]">
            <div className="w-9 h-9 bg-[#03C75A] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-black">N</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#191F28]">네이버 플레이스 리뷰</p>
              <p className="text-[11px] text-[#8B95A1]">수정 후 등록 가능</p>
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i=><span key={i} className={i<=rating?'text-yellow-400':'text-[#E5E8EB]'}>★</span>)}
            </div>
          </div>
          <p className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap">{generatedReview}</p>
          {hashtags.length > 0 && (
            <p className="text-sm text-[#3182F6] mt-3 font-medium">{hashtags.join(' ')}</p>
          )}
        </div>

        {/* 영수증 확인 배지 */}
        {receiptInfo && (
          <div className="bg-[#E8FFF5] border border-[#A3E6C8] rounded-xl p-3 mb-4 flex items-center gap-2">
            <span>🧾</span>
            <div>
              <p className="text-xs font-bold text-[#00B87A]">영수증 정보 반영됨</p>
              {receiptInfo.items.length > 0 && <p className="text-[11px] text-[#4E5968]">{receiptInfo.items.join(', ')}</p>}
            </div>
          </div>
        )}

        {/* 등록 방법 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-[#3182F6] mb-2">📋 네이버 리뷰 등록 방법</p>
          {['아래 버튼을 누르면 리뷰가 자동 복사돼요', '네이버 플레이스 앱이 열려요', '붙여넣기 → 등록 완료!'].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="w-5 h-5 bg-[#3182F6] text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
              <span className="text-xs text-[#4E5968]">{s}</span>
            </div>
          ))}
        </div>

        {reward && (
          <div className="bg-[#FFF7E6] border border-[#FFD666] rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-[#8B5E00]">🎁 리뷰 등록 후 혜택!</p>
            <p className="text-sm font-black text-[#191F28] mt-1">{reward}</p>
            <p className="text-xs text-[#8B95A1] mt-1">직원에게 이 화면을 보여주세요</p>
          </div>
        )}

        <button onClick={() => { setStep('upload'); setPhotos([]); setComment('') }}
          className="w-full text-center text-xs text-[#8B95A1] py-3">다시 작성하기</button>
      </div>

      {/* 하단 버튼 2개 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] px-4 py-4 space-y-2">
        {/* 메인: 복사 + 네이버 이동 */}
        <button
          onClick={handleNaverAndCopy}
          className="w-full bg-[#03C75A] text-white text-base font-black py-4 rounded-2xl active:scale-95 transition-all">
          {copied ? '✓ 복사 완료! 네이버 플레이스 이동 중...' : '📋 리뷰 복사 + 네이버 플레이스 이동'}
        </button>
        {/* 보조: 텍스트만 복사 */}
        <button
          onClick={handleCopyOnly}
          className="w-full bg-[#EFF6FF] text-[#3182F6] text-sm font-bold py-3 rounded-2xl active:scale-95">
          텍스트만 복사하기
        </button>
      </div>
    </div>
  )

  return null
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReviewContent />
    </Suspense>
  )
}
