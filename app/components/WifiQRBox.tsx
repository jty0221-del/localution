'use client'

// ============================================================
// Wi-Fi QR 코드 생성기
//   · SSID + 비밀번호 입력 → WIFI:T:WPA;S:...;P:...;; 포맷
//   · localStorage 저장 → 재방문 시 자동 로드
//   · 매장 QR 옆에 나란히 배치되도록 디자인
// ============================================================
import { useEffect, useState } from 'react'
import { Wifi, Save, Download } from 'lucide-react'

const LS_WIFI = 'localution.wifi_settings'

type WifiCfg = {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}

const DEFAULT_WIFI: WifiCfg = { ssid: '', password: '', encryption: 'WPA', hidden: false }

function buildWifiString(cfg: WifiCfg): string {
  if (!cfg.ssid) return ''
  const escape = (s: string) => s.replace(/[\\;,:"]/g, m => '\\' + m)
  const parts: string[] = []
  parts.push('WIFI:T:' + cfg.encryption)
  parts.push('S:' + escape(cfg.ssid))
  if (cfg.encryption !== 'nopass' && cfg.password) parts.push('P:' + escape(cfg.password))
  if (cfg.hidden) parts.push('H:true')
  return parts.join(';') + ';;'
}

async function downloadWifiQR(wifiString: string, ssid: string) {
  if (!wifiString) return
  try {
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(wifiString, {
      errorCorrectionLevel: 'H',
      width: 1000,
      margin: 2,
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `wifi-${ssid || 'qr'}.png`
    a.click()
  } catch (e) {
    alert('다운로드 실패')
  }
}

export default function WifiQRBox() {
  const [cfg, setCfg] = useState<WifiCfg>(DEFAULT_WIFI)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<WifiCfg>(DEFAULT_WIFI)
  const [downloading, setDownloading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WIFI)
      if (raw) {
        const parsed = JSON.parse(raw)
        setCfg({ ...DEFAULT_WIFI, ...parsed })
      }
    } catch (_) {}
  }, [])

  // QR 이미지 생성
  useEffect(() => {
    const wifiStr = buildWifiString(cfg)
    if (!wifiStr) { setQrDataUrl(''); return }
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(wifiStr, {
          errorCorrectionLevel: 'H',
          width: 480,
          margin: 1,
        })
        if (!cancelled) setQrDataUrl(url)
      } catch (_) {}
    })()
    return () => { cancelled = true }
  }, [cfg])

  function handleSave() {
    try { localStorage.setItem(LS_WIFI, JSON.stringify(draft)) } catch (_) {}
    setCfg(draft)
    setEditing(false)
  }

  function startEdit() {
    setDraft(cfg)
    setEditing(true)
  }

  const wifiString = buildWifiString(cfg)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#3182F6] flex items-center justify-center shadow-sm">
            <Wifi size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-bold text-[#191F28]">Wi-Fi QR 코드</h3>
            <p className="text-xs text-[#8B95A1]">스캔 한 번으로 자동 연결</p>
          </div>
        </div>
        {cfg.ssid && !editing && (
          <button onClick={startEdit} className="text-xs text-[#3182F6] font-semibold hover:underline">수정</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#4E5968] mb-1">Wi-Fi 이름 (SSID) *</label>
            <input
              value={draft.ssid}
              onChange={e => setDraft({ ...draft, ssid: e.target.value.slice(0, 32) })}
              placeholder="예: Cafe_FreeWiFi"
              className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#4E5968] mb-1">비밀번호</label>
            <input
              type="text"
              value={draft.password}
              onChange={e => setDraft({ ...draft, password: e.target.value.slice(0, 64) })}
              placeholder="비밀번호 (없으면 빈칸)"
              className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#4E5968] mb-1">암호화 방식</label>
            <select
              value={draft.encryption}
              onChange={e => setDraft({ ...draft, encryption: e.target.value as any })}
              className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#06B6D4] transition-colors">
              <option value="WPA">WPA / WPA2 (가장 일반)</option>
              <option value="WEP">WEP (구형)</option>
              <option value="nopass">암호 없음 (open)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#4E5968] cursor-pointer">
            <input type="checkbox" checked={draft.hidden} onChange={e => setDraft({ ...draft, hidden: e.target.checked })} />
            <span>숨김 네트워크</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968]">취소</button>
            <button onClick={handleSave} disabled={!draft.ssid} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#06B6D4] text-white disabled:opacity-50 flex items-center justify-center gap-1">
              <Save size={12} strokeWidth={2.5} /> 저장
            </button>
          </div>
        </div>
      ) : !cfg.ssid ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#06B6D4]/10 to-[#3182F6]/10 mx-auto flex items-center justify-center mb-3">
            <Wifi size={28} className="text-[#06B6D4]" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-[#191F28] mb-1">Wi-Fi 정보를 등록하세요</p>
          <p className="text-xs text-[#8B95A1] mb-4 leading-relaxed">손님이 스캔만 하면 자동 연결돼요<br/>매장 QR 옆에 나란히 비치 추천</p>
          <button onClick={() => { setDraft(DEFAULT_WIFI); setEditing(true) }} className="px-5 py-2.5 rounded-xl bg-[#06B6D4] text-white text-sm font-bold">
            Wi-Fi 등록하기
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3">
            <div
              className="bg-white border-2 border-[#06B6D4] rounded-2xl shadow-md flex-shrink-0 flex items-center justify-center"
              style={{ width: 280, height: 280 }}>
              {qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl}
                  alt="Wi-Fi QR"
                  width={240}
                  height={240}
                  style={{ width: 240, height: 240, display: 'block', flexShrink: 0 }}
                />
              ) : (
                <div className="text-xs text-[#8B95A1]" style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>QR 생성 중...</div>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8B95A1] mb-0.5">SSID</p>
              <p className="font-mono text-sm font-bold text-[#191F28] break-all max-w-[260px]">{cfg.ssid}</p>
              {cfg.password && (
                <>
                  <p className="text-xs text-[#8B95A1] mt-2 mb-0.5">PW</p>
                  <p className="font-mono text-xs text-[#4E5968] break-all max-w-[260px]">{cfg.password}</p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={async () => {
              setDownloading(true)
              await downloadWifiQR(wifiString, cfg.ssid)
              setDownloading(false)
            }}
            disabled={downloading}
            className="w-full mt-4 py-2.5 rounded-xl bg-[#06B6D4] text-white text-xs font-bold hover:bg-[#0891B2] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            <Download size={12} strokeWidth={2.5} />
            {downloading ? '다운로드 중…' : 'PNG 다운로드 (1000px)'}
          </button>

          <div className="mt-3 p-3 rounded-xl bg-[#F0FDFA] border border-[#A7F3D0]">
            <p className="text-[11px] text-[#065F46] font-bold mb-1">💡 활용 팁</p>
            <ul className="text-[10px] text-[#065F46]/90 space-y-0.5 leading-relaxed pl-3 list-disc">
              <li>매장 QR 코드 옆에 나란히 인쇄·비치</li>
              <li>손님: 카메라로 스캔 → "Wi-Fi 연결?" 알림 → 자동 접속</li>
              <li>iOS / Android 모두 지원 (별도 앱 불필요)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
