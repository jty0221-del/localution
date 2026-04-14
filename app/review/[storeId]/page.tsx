'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Step = 'welcome' | 'upload' | 'generating' | 'result'

// ─── 이미지 압축 (캔버스) ──────────────────────────────────────────
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 900
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h / w) * MAX); w = MAX }
          else { w = Math.round((w / h) * MAX); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── 별 아이콘 ────────────────────────────────────────────────────
function StarRow() {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="text-yellow-400 text-xl">★</span>
      ))}
    </div>
  )
}

// ─── 실제 페이지 컨텐츠 ───────────────────────────────────────────
function ReviewContent() {
  const params     = useParams()
  const searchParams = useSearchParams()

  const storeId   = (params?.storeId as string) || ''
  const storeName = searchParams.get('n') || '이 매장'
  const storeType = searchParams.get('t') || ''
  const mainKw    = searchParams.get('kw') || ''
  const naverUrl  = searchParams.get('naver') || ''
  const reward    = searchParams.get('reward') || ''

  const [step, setStep] = useState<Step>('welcome')
  const [photos, setPhotos] = useState<{ preview: string; file: File }[]>([])
  const [comment, setComment] = useState('')
  const [generatedReview, setGeneratedReview] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [genPct, setGenPct] = useState(0)
  const [genStep, setGenStep] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── 사진 선택 ──
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setPhotos(prev => [...prev, { file, preview: ev.target?.result as string }])
      }
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  function removePhoto(i: number) {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── AI 리뷰 생성 ──
  async function handleGenerate() {
    setStep('generating')
    setGenPct(0)
    setGenStep(0)

    const pctTimer = setInterval(() => {
      setGenPct(prev => prev < 88 ? prev + Math.random() * 6 + 2 : prev)
    }, 500)
    const stepTimer = setInterval(() => {
      setGenStep(prev => prev < 2 ? prev + 1 : prev)
    }, 3000)

    try {
      const compressed = await Promise.all(photos.slice(0, 3).map(p => compressImage(p.file)))
      const res = await fetch('/api/qr-review-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: compressed, storeName, storeType, mainKeyword: mainKw, comment }),
      })
      const data = await res.json()
      clearInterval(pctTimer)
      clearInterval(stepTimer)
      setGenPct(100)
      setGenStep(2)
      setGeneratedReview(data.review || '리뷰 생성에 실패했습니다. 다시 시도해 주세요.')
      setHashtags(data.hashtags || [])
      setTimeout(() => setStep('result'), 600)
    } catch {
      clearInterval(pctTimer)
      clearInterval(stepTimer)
      setGeneratedReview('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
      setStep('result')
    }
  }

  // ── 복사 ──
  async function handleCopy() {
    const text = generatedReview + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  function openNaver() {
    window.open(naverUrl || 'https://map.naver.com', '_blank')
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 1: 환영 화면
  // ──────────────────────────────────────────────────────────────────
  if (step === 'welcome') return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FF] to-white flex flex-col">
      <div className="text-center py-3">
        <span className="text-[11px] text-[#B0B8C1] tracking-wide">Powered by Localution</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center">
        {/* 아이콘 */}
        <div className="w-24 h-24 bg-[#3182F6] rounded-[28px] flex items-center justify-center mb-5 shadow-xl shadow-blue-200">
          <span className="text-5xl">⭐</span>
        </div>

        {storeType && (
          <span className="text-xs bg-[#EFF6FF] text-[#3182F6] px-3 py-1 rounded-full font-bold mb-2 inline-block">
            {storeType}
          </span>
        )}

        <h1 className="text-[26px] font-black text-[#191F28] leading-tight mb-1">{storeName}</h1>
        <p className="text-base text-[#4E5968] font-semibold mb-7">AI 리뷰 자동 작성 서비스</p>

        {/* 기능 설명 카드 */}
        <div className="w-full max-w-xs space-y-2.5 mb-7">
          {[
            { icon: '📸', text: '사진만 올리면 AI가 자동 분석' },
            { icon: '✍️', text: '네이버 리뷰 맞춤 자동 작성' },
            { icon: '📋', text: '복사해서 네이버에 바로 등록' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#F2F4F6]">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-semibold text-[#191F28]">{f.text}</span>
            </div>
          ))}
        </div>

        {/* 혜택 배지 */}
        {reward && (
          <div className="w-full max-w-xs bg-[#FFF7E6] border border-[#FFD666] rounded-2xl px-5 py-3.5 mb-6">
            <p className="text-xs text-[#8B5E00] font-bold">🎁 리뷰 작성 시 받는 혜택</p>
            <p className="text-sm font-black text-[#191F28] mt-1">{reward}</p>
          </div>
        )}

        <button
          onClick={() => setStep('upload')}
          className="w-full max-w-xs bg-[#3182F6] text-white text-lg font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          리뷰 작성 시작하기 →
        </button>
        <p className="text-xs text-[#B0B8C1] mt-4">2~3분이면 완성돼요!</p>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────
  // STEP 2: 사진 업로드
  // ──────────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => setStep('welcome')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F4F6] text-xl">←</button>
        <div className="flex-1">
          <p className="font-black text-[#191F28] text-sm">{storeName}</p>
          <p className="text-xs text-[#8B95A1]">사진 업로드</p>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#3182F6]" />
          <div className="w-2 h-2 rounded-full bg-[#E5E8EB]" />
          <div className="w-2 h-2 rounded-full bg-[#E5E8EB]" />
        </div>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto" style={{ paddingBottom: '100px' }}>
        {/* 안내 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-4 mb-5">
          <p className="text-sm font-bold text-[#3182F6] mb-1">📸 어떤 사진이든 OK!</p>
          <p className="text-xs text-[#4E5968] leading-relaxed">
            음식 사진, 영수증, 매장 내부 사진 등 찍은 사진을 올려주세요.
            사진이 없어도 한마디만으로 리뷰를 작성할 수 있어요.
          </p>
        </div>

        {/* 사진 그리드 */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#C8D1DC] flex flex-col items-center justify-center bg-white active:bg-[#F2F4F6]">
                <span className="text-2xl text-[#B0B8C1]">+</span>
                <span className="text-[10px] text-[#8B95A1] mt-0.5">추가</span>
              </button>
            )}
          </div>
        )}

        {/* 업로드 버튼 (사진 없을 때) */}
        {photos.length === 0 && (
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-[#3182F6] rounded-2xl py-10 flex flex-col items-center bg-[#EFF6FF] mb-5 active:bg-[#DBEAFE]">
            <span className="text-5xl mb-3">📷</span>
            <span className="font-bold text-[#3182F6] text-base">사진 선택하기</span>
            <span className="text-xs text-[#4E5968] mt-1">카메라 또는 앨범에서 선택</span>
            <span className="text-[11px] text-[#8B95A1] mt-2">최대 5장</span>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

        {/* 한마디 */}
        <div>
          <label className="text-sm font-bold text-[#4E5968] mb-2 block">
            한마디 남기기 <span className="text-[#B0B8C1] font-normal">(선택)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={120}
            placeholder="음식이나 서비스에 대한 느낌을 간단히 적어주세요"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-[#3182F6] transition-colors"
            rows={3}
          />
          <p className="text-xs text-[#B0B8C1] text-right mt-1">{comment.length}/120</p>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] px-4 py-4">
        <button
          onClick={handleGenerate}
          disabled={photos.length === 0 && !comment.trim()}
          className="w-full bg-[#3182F6] disabled:bg-[#C8D1DC] text-white text-base font-black py-4 rounded-2xl transition-colors active:scale-95 disabled:active:scale-100"
        >
          ✨ AI 리뷰 생성하기
        </button>
      </div>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────
  // STEP 3: 생성 중
  // ──────────────────────────────────────────────────────────────────
  if (step === 'generating') {
    const genSteps = ['사진 분석 완료', '리뷰 문장 작성 중...', '네이버 최적화 완료']
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        {/* 스피너 */}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 border-[5px] border-[#EFF6FF] rounded-full" />
          <div className="absolute inset-0 border-[5px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
        </div>

        <h2 className="text-xl font-black text-[#191F28] mb-2">AI가 리뷰를 작성 중이에요</h2>
        <p className="text-sm text-[#8B95A1] mb-8">잠시만 기다려 주세요...</p>

        {/* 프로그레스 바 */}
        <div className="w-full max-w-xs bg-[#F2F4F6] rounded-full h-2 mb-6 overflow-hidden">
          <div
            className="h-2 bg-[#3182F6] rounded-full transition-all duration-500"
            style={{ width: `${genPct}%` }}
          />
        </div>

        {/* 단계 표시 */}
        <div className="space-y-3 w-full max-w-xs text-left">
          {genSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                i < genStep ? 'bg-[#00C785] text-white' :
                i === genStep ? 'bg-[#3182F6] text-white' :
                'bg-[#F2F4F6] text-[#B0B8C1]'
              ].join(' ')}>
                {i < genStep ? '✓' : i + 1}
              </div>
              <span className={[
                'text-sm font-semibold',
                i < genStep ? 'text-[#00C785]' :
                i === genStep ? 'text-[#3182F6]' :
                'text-[#B0B8C1]'
              ].join(' ')}>{s}</span>
              {i === genStep && <div className="w-2 h-2 bg-[#3182F6] rounded-full animate-pulse" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 4: 결과
  // ──────────────────────────────────────────────────────────────────
  if (step === 'result') return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 bg-[#00C785] rounded-full flex items-center justify-center">
          <span className="text-white font-black text-base">✓</span>
        </div>
        <div className="flex-1">
          <p className="font-black text-[#191F28] text-sm">리뷰 완성!</p>
          <p className="text-xs text-[#8B95A1]">복사해서 네이버에 붙여넣으세요</p>
        </div>
        <StarRow />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: '140px' }}>
        {/* 완료 배지 */}
        <div className="flex justify-center mb-5">
          <div className="bg-[#E6FFF5] text-[#00B87A] px-5 py-2 rounded-full text-sm font-bold">
            🎉 AI 리뷰 생성 완료!
          </div>
        </div>

        {/* 리뷰 카드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-[#E5E8EB]">
          <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-[#F2F4F6]">
            <div className="w-9 h-9 bg-[#03C75A] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-black">N</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#191F28]">네이버 플레이스 리뷰</p>
              <p className="text-[11px] text-[#8B95A1]">AI 자동 생성 · 수정 후 등록 가능</p>
            </div>
            <StarRow />
          </div>
          <p className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap">{generatedReview}</p>
          {hashtags.length > 0 && (
            <p className="text-sm text-[#3182F6] mt-3 font-medium">{hashtags.join(' ')}</p>
          )}
        </div>

        {/* 등록 방법 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-[#3182F6] mb-3">📋 네이버 등록 방법</p>
          {[
            '아래 복사 버튼을 눌러주세요',
            '네이버 지도 앱 → 매장 검색',
            '리뷰쓰기 탭 → 텍스트 붙여넣기 → 등록!',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 mb-2">
              <span className="w-5 h-5 bg-[#3182F6] text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-xs text-[#4E5968]">{s}</span>
            </div>
          ))}
        </div>

        {/* 혜택 안내 */}
        {reward && (
          <div className="bg-[#FFF7E6] border border-[#FFD666] rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-[#8B5E00]">🎁 리뷰 등록 후 혜택을 받으세요!</p>
            <p className="text-sm font-black text-[#191F28] mt-1">{reward}</p>
            <p className="text-xs text-[#8B95A1] mt-1">직원에게 이 화면을 보여주세요</p>
          </div>
        )}

        {/* 다시 작성 */}
        <button
          onClick={() => { setStep('upload'); setPhotos([]); setComment(''); }}
          className="w-full text-center text-xs text-[#8B95A1] py-3 hover:text-[#4E5968] transition-colors"
        >
          다시 작성하기
        </button>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] px-4 py-4 space-y-2.5">
        <button
          onClick={handleCopy}
          className={[
            'w-full text-base font-black py-4 rounded-2xl transition-all active:scale-95',
            copied ? 'bg-[#00C785] text-white' : 'bg-[#3182F6] text-white',
          ].join(' ')}
        >
          {copied ? '✓ 복사 완료! 네이버에 붙여넣으세요' : '📋 리뷰 텍스트 복사하기'}
        </button>
        <button
          onClick={openNaver}
          className="w-full bg-[#03C75A] text-white text-sm font-bold py-3.5 rounded-2xl active:scale-95"
        >
          네이버 플레이스 앱 열기 →
        </button>
      </div>
    </div>
  )

  return null
}

// ─── 페이지 내보내기 (Suspense 필수) ─────────────────────────────
export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#8B95A1]">로딩 중...</p>
        </div>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  )
}
