// app/api/menu/import-naver/route.ts
// ============================================================
// 네이버 플레이스 메뉴 자동 가져오기
//   POST { placeId } → m.place.naver.com 에서 메뉴 스크래핑
//   응답: { items: [{ name_ko, price, image_url, desc_ko }] }
//
//   · 사장님이 미리보기 후 저장 버튼 누르면 /api/menu POST 로 일괄 추가
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UA = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const placeId = String(body?.placeId || '').replace(/[^0-9]/g, '')
  if (!placeId) return NextResponse.json({ ok: false, error: 'missing_placeId' }, { status: 400 })

  // 모바일 메뉴 페이지 시도
  const urls = [
    `https://m.place.naver.com/restaurant/${placeId}/menu/list`,
    `https://m.place.naver.com/place/${placeId}/menu/list`,
    `https://m.place.naver.com/${placeId}/menu/list`,
  ]

  let html = ''
  let usedUrl = ''
  for (const u of urls) {
    try {
      const r = await fetch(u, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
      if (r.ok) {
        html = await r.text()
        usedUrl = u
        if (html.length > 2000) break
      }
    } catch (_) {}
  }

  if (!html) {
    return NextResponse.json({ ok: false, error: 'fetch_failed', tried: urls }, { status: 502 })
  }

  // ── 메뉴 추출 — JSON-LD + apolloState + window.__APOLLO_STATE__ ─────
  const items = extractMenuItems(html)

  if (items.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'no_menu_found',
      message: '네이버 플레이스에서 메뉴를 찾지 못했어요. 직접 입력하거나 메뉴가 등록됐는지 확인해주세요.',
      sourceUrl: usedUrl,
    }, { status: 404 })
  }

  return NextResponse.json({ ok: true, items, sourceUrl: usedUrl, count: items.length })
}

// HTML → 메뉴 배열 추출
function extractMenuItems(html: string): Array<{ name_ko: string; price: number; image_url?: string; desc_ko?: string }> {
  const items: any[] = []

  // 1) Apollo state 추출 시도 (m.place.naver.com SPA 패턴)
  const apolloMatch = html.match(/__APOLLO_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script/)
  if (apolloMatch) {
    try {
      const state = JSON.parse(apolloMatch[1])
      for (const k of Object.keys(state)) {
        if (k.startsWith('Menu:') || k.startsWith('PlaceMenu:')) {
          const m = state[k]
          if (m?.name && m?.price !== undefined) {
            items.push({
              name_ko: String(m.name).slice(0, 80),
              price: parseInt(String(m.price).replace(/[^0-9]/g, ''), 10) || 0,
              image_url: m.images?.[0] || m.image || null,
              desc_ko: m.description ? String(m.description).slice(0, 200) : null,
            })
          }
        }
      }
    } catch (_) {}
  }

  // 2) HTML 패턴 매칭 (menuListClass + dlClass + ddItem)
  if (items.length === 0) {
    const menuBlockRegex = /<li[^>]*class="[^"]*menu_box[^"]*"[\s\S]*?<\/li>/gi
    const blocks = html.match(menuBlockRegex) || []
    for (const block of blocks) {
      const nameM = block.match(/<span[^>]*class="[^"]*lPzHi[^"]*"[^>]*>([^<]+)</) || block.match(/<span[^>]*class="[^"]*MXkFw[^"]*"[^>]*>([^<]+)</)
      const priceM = block.match(/<div[^>]*class="[^"]*GXS1X[^"]*"[^>]*>([\d,]+)/) || block.match(/<em[^>]*>([\d,]+)/)
      const imgM = block.match(/<img[^>]+src="([^"]+)"/)
      const descM = block.match(/<div[^>]*class="[^"]*kPogF[^"]*"[^>]*>([^<]+)</)
      if (nameM) {
        items.push({
          name_ko: nameM[1].trim().slice(0, 80),
          price: priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) || 0 : 0,
          image_url: imgM ? imgM[1] : null,
          desc_ko: descM ? descM[1].trim().slice(0, 200) : null,
        })
      }
    }
  }

  // 3) JSON-LD Restaurant.hasMenuSection
  if (items.length === 0) {
    const ldMatches = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []
    for (const block of ldMatches) {
      try {
        const json = JSON.parse(block.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''))
        const arr = Array.isArray(json) ? json : [json]
        for (const o of arr) {
          if (o.hasMenu?.hasMenuSection || o.hasMenuSection) {
            const sections = o.hasMenu?.hasMenuSection || o.hasMenuSection
            const sArr = Array.isArray(sections) ? sections : [sections]
            for (const s of sArr) {
              const ms = s.hasMenuItem || []
              for (const m of (Array.isArray(ms) ? ms : [ms])) {
                if (m.name) items.push({
                  name_ko: String(m.name).slice(0, 80),
                  price: parseInt(String(m.offers?.price || 0).replace(/[^0-9]/g, ''), 10) || 0,
                  image_url: m.image || null,
                  desc_ko: m.description || null,
                })
              }
            }
          }
        }
      } catch (_) {}
    }
  }

  return items.slice(0, 100)  // 최대 100개
}
