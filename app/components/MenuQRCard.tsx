'use client'

// ============================================================
// MenuQRCard — 손님이 스캔할 메뉴판 QR 카드
//   · 매장 이름 + 큰 QR + 안내 문구 (인쇄용)
//   · PNG 다운로드 (A4 인쇄 가능 고해상도)
//   · URL 복사 + 미리보기 링크
// ============================================================
import { useEffect, useState, useRef } from 'react'
import { QrCode, Download, Copy, Check, ExternalLink, Smartphone } from 'lucide-react'

export default function MenuQRCard({ storeSlug: propSlug, storeName: propName }: { storeSlug?: string | null; storeName?: string }) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [qrSvg, setQrSvg] = useState<string>('')
  const [storeSlug, setStoreSlug] = useState<string | null>(propSlug || null)
  const [storeName, setStoreName] = useState<string>(propName || '')
  const containerRef = useRef<HTMLDivElement>(null)

  // props로 안 넘어오면 API에서 자동 조회
  useEffect(() => {
    if (propSlug && propName) return
    fetch('/api/menu/theme', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.ok && j.store) {
          if (!propSlug) setStoreSlug(j.store.slug)
          if (!propName) setStoreName(j.store.name)
        }
      })
      .catch(() => {})
  }, [propSlug, propName])

  const menuUrl = storeSlug ? `https://www.localution.co.kr/menu/${encodeURIComponent(storeSlug)}` : ''

  useEffect(() => {
    if (!menuUrl) return
    let cancelled = false
    import('qrcode').then(async (mod) => {
      try {
        const QRCode = (mod as any).default || mod
        const out = await QRCode.toString(menuUrl, {
          type: 'svg',
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 480,
          color: { dark: '#191F28', light: '#FFFFFF' },
        })
        if (!cancelled) setQrSvg(out)
      } catch (e) {
        console.error('[menu-qr]', e)
      }
    })
    return () => { cancelled = true }
  }, [menuUrl])

  async function handleCopy() {
    if (!menuUrl) return
    try {
      await navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('URL 복사 실패. 수동으로 선택해 복사해주세요.')
    }
  }

  // 인쇄용 PNG 다운로드 — 캔버스에 매장명 + QR + 안내문 합성
  async function handleDownload() {
    if (!menuUrl) return
    setGenerating(true)
    try {
      const QRCode = (await import('qrcode')).default || (await import('qrcode'))
      // 고해상도 캔버스 (A4 인쇄 적합 — 1200x1600px)
      const W = 1200
      const H = 1600
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas context fail')

      // 배경 (따뜻한 베이지)
      ctx.fillStyle = '#FAF6F0'
      ctx.fillRect(0, 0, W, H)

      // 외곽 라인 프레임
      ctx.strokeStyle = '#92400E'
      ctx.lineWidth = 4
      ctx.strokeRect(40, 40, W - 80, H - 80)
      ctx.strokeStyle = '#92400E'
      ctx.lineWidth = 1
      ctx.strokeRect(60, 60, W - 120, H - 120)

      // 상단 "MENU" 라벨
      ctx.fillStyle = '#92400E'
      ctx.font = 'bold 28px serif'
      ctx.textAlign = 'center'
      ctx.fillText('— M E N U —', W / 2, 160)

      // 매장 이름 (큰 글씨)
      ctx.fillStyle = '#1F1612'
      ctx.font = 'bold 72px serif'
      const name = storeName || '우리 매장'
      ctx.fillText(name, W / 2, 270)

      // 부제
      ctx.fillStyle = '#78716C'
      ctx.font = 'italic 26px serif'
      ctx.fillText('Digital Menu · 디지털 메뉴판', W / 2, 320)

      // 장식 점선
      ctx.fillStyle = '#92400E'
      for (let i = 0; i < 5; i++) {
        const x = W / 2 - 80 + i * 40
        ctx.beginPath()
        ctx.arc(x, 380, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // QR 코드 생성 (canvas로 직접)
      const qrCanvas = document.createElement('canvas')
      await (QRCode as any).toCanvas(qrCanvas, menuUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 700,
        color: { dark: '#191F28', light: '#FFFFFF' },
      })
      // QR 흰 배경 박스 + 그림자
      const qrX = (W - 700) / 2
      const qrY = 440
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(qrX - 30, qrY - 30, 760, 760)
      ctx.strokeStyle = '#D6D3D1'
      ctx.lineWidth = 2
      ctx.strokeRect(qrX - 30, qrY - 30, 760, 760)
      ctx.drawImage(qrCanvas, qrX, qrY)

      // 안내 문구 (QR 아래)
      ctx.fillStyle = '#1F1612'
      ctx.font = 'bold 44px sans-serif'
      ctx.fillText('카메라로 QR을 스캔해주세요', W / 2, 1280)
      ctx.fillStyle = '#78716C'
      ctx.font = '26px sans-serif'
      ctx.fillText('Scan the QR code with your camera', W / 2, 1320)

      // 4개 국어 안내 (영/일/중)
      ctx.fillStyle = '#92400E'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('한국어 · English · 日本語 · 中文', W / 2, 1380)

      // 하단 푸터
      ctx.fillStyle = '#A8A29E'
      ctx.font = '20px sans-serif'
      ctx.fillText('Powered by 로컬루션 · localution.co.kr', W / 2, 1500)

      // 다운로드
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}_메뉴판QR.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (e: any) {
      console.error('[menu-qr download]', e)
      alert('QR 이미지 생성 실패: ' + (e?.message || 'unknown'))
    } finally {
      setGenerating(false)
    }
  }

  if (!storeSlug) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#F2F4F6] flex items-center justify-center mx-auto mb-3">
          <QrCode size={20} className="text-[#8B95A1]" strokeWidth={2} />
        </div>
        <p className="text-sm font-bold text-[#191F28] mb-1">매장 정보를 먼저 설정해주세요</p>
        <p className="text-[11px] text-[#8B95A1]">매장 이름이 등록되어야 메뉴판 QR이 생성돼요</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      {/* 헤더 */}
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1D4ED8] flex items-center justify-center shadow-sm">
          <QrCode size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-black text-[#191F28]">메뉴판 QR 코드</h3>
          <p className="text-[11px] text-[#8B95A1]">손님이 스캔하면 디지털 메뉴판이 열려요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* QR 미리보기 */}
        <div ref={containerRef} className="mx-auto md:mx-0">
          <div className="bg-gradient-to-br from-[#FAF6F0] to-[#FDF4E7] rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #E7DCC9' }}>
            <div className="text-center mb-2">
              <p className="text-[9px] tracking-[0.4em] font-bold text-[#92400E] mb-0.5">— MENU —</p>
              <p className="text-sm font-black text-[#1F1612]" style={{ fontFamily: 'serif' }}>{storeName || '우리 매장'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 flex items-center justify-center" style={{ width: 220, height: 220 }}>
              {qrSvg ? (
                <div
                  style={{ width: 196, height: 196 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg.replace(/<svg([^>]*)>/, (_m, attrs) => {
                    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '')
                    return `<svg${cleaned} width="196" height="196" preserveAspectRatio="xMidYMid meet" style="display:block">`
                  }) }}
                />
              ) : (
                <div className="text-[10px] text-[#8B95A1] animate-pulse">QR 생성 중...</div>
              )}
            </div>
            <p className="text-[10px] text-center mt-2 font-bold text-[#1F1612]">스캔하면 메뉴판이 열려요</p>
            <p className="text-[9px] text-center text-[#78716C]">한국어 · English · 日本語 · 中文</p>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-2.5">
          {/* URL 표시 */}
          <div>
            <p className="text-[11px] font-bold text-[#4E5968] mb-1.5 flex items-center gap-1">
              <Smartphone size={11} strokeWidth={2.5} /> 메뉴판 URL
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
              <span className="text-[11px] font-mono text-[#4E5968] truncate flex-1">{menuUrl}</span>
            </div>
          </div>

          {/* 다운로드 버튼 (메인 CTA) */}
          <button
            onClick={handleDownload}
            disabled={generating || !qrSvg}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3182F6] to-[#1D4ED8] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-shadow">
            {generating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download size={14} strokeWidth={2.5} />
                인쇄용 QR 이미지 다운로드 (PNG)
              </>
            )}
          </button>

          {/* 보조 액션 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-[#F2F4F6] text-[#191F28] hover:bg-[#E5E8EB]'
              }`}>
              {copied ? <><Check size={12} strokeWidth={3} /> 복사됨</> : <><Copy size={12} strokeWidth={2.5} /> URL 복사</>}
            </button>
            <a
              href={`/menu/${encodeURIComponent(storeSlug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 rounded-xl bg-[#F2F4F6] text-[#191F28] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#E5E8EB]">
              <ExternalLink size={12} strokeWidth={2.5} /> 미리보기
            </a>
          </div>

          {/* 안내 박스 */}
          <div className="rounded-xl p-3" style={{ background: '#FEF7ED', border: '1px solid #FED7AA' }}>
            <p className="text-[11px] font-bold text-[#92400E] mb-1">사용 방법</p>
            <ol className="space-y-0.5 text-[10px] text-[#78716C] leading-relaxed">
              <li>1) 인쇄용 QR 이미지 다운로드</li>
              <li>2) A4·A5 크기로 인쇄해서 테이블에 비치</li>
              <li>3) 손님이 카메라로 스캔하면 메뉴판 자동 오픈</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
