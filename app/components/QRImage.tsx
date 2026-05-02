'use client'

// ============================================================
// QRImage — SVG 기반 고해상도 QR 코드 렌더러 (공용)
//   · ECC-H 30% 복원 (카메라 인식률 최적화)
//   · 클라이언트 동적 import (qrcode 번들 분리)
// ============================================================
import { useEffect, useState } from 'react'
import { QrCode as QrCodeIcon } from 'lucide-react'

export default function QRImage({ url, size = 120 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!url) { setSvg(''); return }
    setErr(null)
    import('qrcode').then(async (mod) => {
      try {
        const QRCode = (mod as any).default || mod
        const out = await QRCode.toString(url, {
          type: 'svg',
          errorCorrectionLevel: 'H',
          margin: 4,
          width: size * 2,
          color: { dark: '#191F28', light: '#FFFFFF' },
        })
        if (!cancelled) setSvg(out)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'QR 생성 실패')
      }
    }).catch((e) => { if (!cancelled) setErr(String(e?.message || e)) })
    return () => { cancelled = true }
  }, [url, size])

  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#F2F4F6] rounded-xl flex flex-col items-center justify-center gap-1 text-[#8B95A1]">
        <QrCodeIcon size={size / 5} className="text-[#C9CDD2]" strokeWidth={1.5} />
        <span className="text-[10px] font-medium text-center leading-tight px-1">업체 연동 후<br />QR 생성됩니다</span>
      </div>
    )
  }
  if (err) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#FEF2F2] rounded-xl flex items-center justify-center text-[10px] text-[#DC2626] p-2 text-center">
        QR 생성 실패: {err.slice(0, 40)}
      </div>
    )
  }
  if (!svg) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#F2F4F6] rounded-xl flex items-center justify-center text-[10px] text-[#8B95A1] animate-pulse">
        생성 중...
      </div>
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="block rounded bg-white overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
