import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

const AD_BASE = 'https://api.searchad.naver.com'

function sign(timestamp: number, method: string, path: string): string {
  const secret = process.env.NAVER_AD_SECRET_KEY || ''
  return crypto.createHmac('sha256', secret).update(timestamp + '.' + method + '.' + path).digest('base64')
}
function adHeaders(method: string, path: string) {
  const ts = Date.now()
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': String(ts),
    'X-API-KEY': process.env.NAVER_AD_API_KEY || '',
    'X-Customer': process.env.NAVER_AD_CUSTOMER_ID || '',
    'X-Signature': sign(ts, method, path),
  }
}
function checkEnv() {
  if (!process.env.NAVER_AD_API_KEY || !process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_CUSTOMER_ID) {
    return '네이버 광고 API 키가 설정되지 않았습니다.'
  }
  return null
}

function expandHints(kw: string): string[] {
  const hints: string[] = [kw]
  const separated = kw
    .replace(/([가-힣]{2,5}(?:구|시|군|동|읍|역|로|길|면))([가-힣])/, '$1 $2')
    .replace(/([가-힣]{2,4})(맛집|음식점|식당|카페|헬스|미용|네일|피부|병원|학원|약국|마트|편의점|꽃집|세탁)/, '$1 $2')
  if (separated !== kw) hints.push(separated)

  const areaMatch = kw.match(/^([가-힣]{2,5}(?:구|시|군|동|읍|역)?)/)
  const area = areaMatch?.[1] || ''
  const catRaw = area ? kw.slice(area.length).replace(/^\s+/, '') : kw
  const cat = catRaw || '맛집'

  if (area) {
    const synonymMap: Record<string, string[]> = {
      '맛집': ['음식점', '식당', '레스토랑', '맛집 추천', '맛집 순위', '맛집 top', '점심 맛집', '저녁 맛집', '혼밥', '데이트 맛집', '가족 외식', '회식 맛집'],
      '카페': ['커피', '디저트카페', '브런치', '카페 추천', '카페 인기', '감성카페'],
      '헬스': ['헬스장', 'PT', '피트니스', '헬스 추천'],
      '미용실': ['헤어샵', '헤어살롱', '미용 추천', '커트'],
      '네일': ['네일샵', '젤네일', '네일아트'],
    }
    const synonyms = synonymMap[cat] || [cat + ' 추천', cat + ' 순위', cat + ' 인기', cat + ' 잘하는', cat + ' 저렴한']
    for (const syn of synonyms.slice(0, 8)) hints.push(area + ' ' + syn)
    const base = area.replace(/(구|시|군|동|역|읍|면)$/, '')
    if (base && base !== area) { hints.push(base + '역 ' + cat); hints.push(base + '역 근처 ' + cat) }
    hints.push(area + ' 근처 ' + cat); hints.push(area + ' 주변 ' + cat)
  }
  hints.push(kw + ' 추천'); hints.push(kw + ' 순위')
  return [...new Set(hints)].slice(0, 25)
}

// compIdx 기반 순위별 추정 입찰가 테이블 (네이버 광고 시장 평균)
const BID_TABLE: Record<string, { pc: number[]; mobile: number[] }> = {
  '높음': { pc: [4500, 3000, 2200, 1600, 1200], mobile: [3000, 2000, 1500, 1100, 800] },
  '중간': { pc: [1200, 850, 620, 450, 320],     mobile: [800, 580, 420, 300, 220] },
  '낮음': { pc: [350, 250, 180, 130, 100],       mobile: [240, 170, 120, 90, 70] },
}

export async function GET(req: NextRequest) {
  // 인증 + rate limit (네이버 광고 유료 API 보호)
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: auth.status })
  const rl = rateLimitByIp(req, `naver-ads:${auth.userId}`, 30, 60)
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type') || 'volume'
  const keyword  = searchParams.get('keyword') || ''
  const keywords = searchParams.get('keywords') || keyword

  if (!keywords.trim()) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  const envErr = checkEnv()
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 })

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)

  try {
    // ── 키워드 확장 (힌트 25개 변형 → 배치 5회) ─────────────────────
    if (type === 'volume') {
      const path = '/keywordstool'
      const allHints: string[] = []
      for (const kw of kwList) for (const h of expandHints(kw)) allHints.push(h)
      const uniqueHints = [...new Set(allHints)].slice(0, 25)
      const batches: string[][] = []
      for (let i = 0; i < uniqueHints.length; i += 5) batches.push(uniqueHints.slice(i, i + 5))

      const rawResults = await Promise.all(
        batches.slice(0, 5).map(async (batch) => {
          try {
            const qs = '?hintKeywords=' + encodeURIComponent(batch.join(',')) + '&showDetail=1'
            const res = await fetch(AD_BASE + path + qs, { headers: adHeaders('GET', path) })
            if (!res.ok) return []
            const data = await res.json()
            return data.keywordList || []
          } catch { return [] }
        })
      )

      const seen = new Set<string>()
      const merged: Record<string, unknown>[] = []
      for (const list of rawResults) {
        for (const item of list) {
          const key = (item.relKeyword || '').replace(/\s+/g, '')
          if (!key || seen.has(key)) continue
          seen.add(key); merged.push(item)
        }
      }
      merged.sort((a, b) =>
        ((Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)) -
        ((Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0))
      )
      return NextResponse.json({ ok: true, type: 'volume', keywords: merged })
    }

    // ── 파워링크 입찰가 (keywordstool compIdx 기반 추정) ──────────────
    if (type === 'bid') {
      const kw   = kwList[0]
      const path = '/keywordstool'
      const qs   = '?hintKeywords=' + encodeURIComponent(kw) + '&showDetail=1'
      const res  = await fetch(AD_BASE + path + qs, { headers: adHeaders('GET', path) })

      let compIdx = '중간'
      let pcVol   = 0
      let mobileVol = 0
      let avgPcCtr = 0
      let avgMobileCtr = 0

      if (res.ok) {
        const data = await res.json()
        const item = (data.keywordList || []).find(
          (k: Record<string, unknown>) => (k.relKeyword as string)?.replace(/\s+/g,'') === kw.replace(/\s+/g,'')
        ) || data.keywordList?.[0]
        if (item) {
          compIdx      = (item.compIdx as string) || '중간'
          pcVol        = Number(item.monthlyPcQcCnt) || 0
          mobileVol    = Number(item.monthlyMobileQcCnt) || 0
          avgPcCtr     = Number(item.monthlyAvePcCtr) || 0
          avgMobileCtr = Number(item.monthlyAveMobileCtr) || 0
        }
      }

      const table = BID_TABLE[compIdx] || BID_TABLE['중간']
      const rows = [1, 2, 3, 4, 5].map((rank, i) => ({
        rank,
        pc:     table.pc[i],
        mobile: table.mobile[i],
      }))

      return NextResponse.json({
        ok: true, type: 'bid', keyword: kw,
        estimated: true,
        compIdx, pcVol, mobileVol, avgPcCtr, avgMobileCtr,
        rows,
      })
    }

    return NextResponse.json({ error: '잘못된 type.' }, { status: 400 })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: '서버 오류: ' + msg }, { status: 500 })
  }
}
