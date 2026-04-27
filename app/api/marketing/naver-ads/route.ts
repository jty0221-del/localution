import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const AD_BASE = 'https://api.searchad.naver.com'

function sign(timestamp: number, method: string, path: string): string {
  const secret = process.env.NAVER_AD_SECRET_KEY || ''
  const msg = timestamp + '.' + method + '.' + path
  return crypto.createHmac('sha256', secret).update(msg).digest('base64')
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

// 입력 키워드에서 20개 힌트 변형 생성
function expandHints(kw: string): string[] {
  const hints: string[] = [kw]

  // 붙어있는 단어 분리 (부천맛집 → 부천 맛집)
  const separated = kw
    .replace(/([가-힣]{2,5}(?:구|시|군|동|읍|역|로|길|면))([가-힣])/, '$1 $2')
    .replace(/([가-힣]{2,4})(맛집|음식점|식당|카페|헬스|미용|네일|피부|병원|학원|약국|마트|편의점|꽃집|세탁)/, '$1 $2')
  if (separated !== kw) hints.push(separated)

  // 지역 + 업종 분리
  const areaMatch = kw.match(/^([가-힣]{2,5}(?:구|시|군|동|읍|역)?)/)
  const area = areaMatch?.[1] || ''
  const catRaw = area ? kw.slice(area.length).replace(/^s+/, '') : kw
  const cat = catRaw || '맛집'

  if (area) {
    // 업종 동의어 맵
    const synonymMap: Record<string, string[]> = {
      '맛집': ['음식점', '식당', '레스토랑', '맛집 추천', '맛집 순위', '맛집 top', '점심 맛집', '저녁 맛집', '혼밥', '데이트 맛집', '가족 외식', '회식 맛집', '맛집 리스트'],
      '카페': ['커피', '디저트카페', '브런치', '카페 추천', '카페 인기', '감성카페'],
      '헬스': ['헬스장', 'PT', '피트니스', '헬스 추천'],
      '미용실': ['헤어샵', '헤어살롱', '미용 추천', '커트'],
      '네일': ['네일샵', '젤네일', '네일아트'],
      '병원': ['의원', '내과', '정형외과'],
      '학원': ['과외', '교습소'],
    }
    const synonyms = synonymMap[cat] || [cat + ' 추천', cat + ' 순위', cat + ' 인기', cat + ' 잘하는', cat + ' 저렴한']

    // 지역+동의어 조합
    for (const syn of synonyms.slice(0, 8)) hints.push(area + ' ' + syn)

    // 역 변형 (부천 → 부천역)
    const base = area.replace(/(구|시|군|동|역|읍|면)$/, '')
    if (base && base !== area) {
      hints.push(base + '역 ' + cat)
      hints.push(base + '역 근처 ' + cat)
    }

    hints.push(area + ' 근처 ' + cat)
    hints.push(area + ' 주변 ' + cat)
  }

  // 자동완성 스타일 변형
  hints.push(kw + ' 추천')
  hints.push(kw + ' 순위')
  hints.push(kw + ' TOP')

  return [...new Set(hints)].slice(0, 25)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type    = searchParams.get('type') || 'volume'
  const keyword = searchParams.get('keyword') || ''
  const keywords = searchParams.get('keywords') || keyword

  if (!keywords.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })
  }

  const envErr = checkEnv()
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 })

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)

  try {
    // ── 키워드 확장 (힌트 변형 20개 → 배치 4회 → 집계) ─────────────
    if (type === 'volume') {
      const path = '/keywordstool'

      // 힌트 변형 생성
      const allHints: string[] = []
      for (const kw of kwList) {
        for (const h of expandHints(kw)) allHints.push(h)
      }
      const uniqueHints = [...new Set(allHints)].slice(0, 25)

      // 5개씩 배치로 분리
      const batches: string[][] = []
      for (let i = 0; i < uniqueHints.length; i += 5) {
        batches.push(uniqueHints.slice(i, i + 5))
      }

      // 병렬로 최대 5 배치 호출
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

      // 중복 제거 후 집계
      const seen = new Set<string>()
      const merged: Record<string, unknown>[] = []
      for (const list of rawResults) {
        for (const item of list) {
          const key = (item.relKeyword || '').replace(/s+/g, '')
          if (!key || seen.has(key)) continue
          seen.add(key)
          merged.push(item)
        }
      }

      // 검색량 내림차순 정렬
      merged.sort((a, b) => {
        const va = (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0)
        const vb = (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)
        return vb - va
      })

      return NextResponse.json({ ok: true, type: 'volume', keywords: merged })
    }

    // ── 파워링크 입찰가 ───────────────────────────────────────────────
    if (type === 'bid') {
      const kw   = kwList[0]
      const path = '/estimate/performance/bid/keyword'
      const ranks  = [1, 2, 3, 4, 5]
      const devices = ['PC', 'MOBILE'] as const

      const rows = await Promise.all(ranks.map(async (rank) => {
        const [pcRaw, mobileRaw] = await Promise.all(
          devices.map(async (device) => {
            try {
              const qs = '?keyword=' + encodeURIComponent(kw) + '&device=' + device + '&keywordPlusYn=N&bidrankYn=Y&rank=' + rank
              const r = await fetch(AD_BASE + path + qs, { headers: adHeaders('GET', path) })
              if (!r.ok) return null
              return r.json()
            } catch { return null }
          })
        )

        // 여러 응답 구조 방어적 파싱
        function extractBid(raw: Record<string, unknown> | null): number | null {
          if (raw === null || raw === undefined) return null
          // 배열인 경우
          if (Array.isArray(raw)) {
            const first = raw[0] as Record<string, unknown> | undefined
            if (!first) return null
            return extractBid(first)
          }
          // 직접 bid 필드
          if (typeof raw.bid === 'number') return raw.bid
          // estimate 중첩
          if (raw.estimate && typeof (raw.estimate as Record<string, unknown>).bid === 'number') {
            return (raw.estimate as Record<string, unknown>).bid as number
          }
          // data 중첩
          if (raw.data) return extractBid(raw.data as Record<string, unknown>)
          // result 중첩
          if (raw.result) return extractBid(raw.result as Record<string, unknown>)
          return null
        }

        return {
          rank,
          pc:     extractBid(pcRaw as Record<string, unknown>),
          mobile: extractBid(mobileRaw as Record<string, unknown>),
          _pcRaw:     pcRaw,
          _mobileRaw: mobileRaw,
        }
      }))

      // 모든 bid가 null이면 raw 응답 포함해서 반환 (디버그용)
      const allNull = rows.every(r => r.pc === null && r.mobile === null)
      return NextResponse.json({
        ok: true, type: 'bid', keyword: kw,
        rows: rows.map(({ _pcRaw, _mobileRaw, ...r }) => r),
        ...(allNull ? { debug: { sample: rows[0] } } : {}),
      })
    }

    return NextResponse.json({ error: '잘못된 type.' }, { status: 400 })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: '서버 오류: ' + msg }, { status: 500 })
  }
}
