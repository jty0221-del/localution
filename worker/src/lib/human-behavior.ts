// worker/src/lib/human-behavior.ts
// ============================================================
// 사람 같은 행동 모방 (Akamai _abck JS 챌린지에서 봇 패턴 회피)
//   · cookie warming: 로그인 전 무관한 페이지 방문 → _abck 갱신
//   · human-like typing: 균일 60ms → 가변 50~180ms + 가끔 typo + correction
//   · mouse jiggle: 페이지 진입 후 자연스러운 마우스 이동
//   · idle thinking: 페이지 로드 후 사람이 보는 시간 (1.5~4초)
// ============================================================
import type { Page } from 'playwright'
import type { Logger } from 'pino'

// ── 가우시안에 가까운 랜덤 (정규분포) ──
function randNormal(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u = 1 - Math.random()
  const v = Math.random()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(0, mean + z * stdDev)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 페이지 로드 후 사람이 보는 시간 (1.5~4초 가변)
 */
export async function idleThinking(min = 1500, max = 4000): Promise<void> {
  const ms = min + Math.random() * (max - min)
  await sleep(ms)
}

/**
 * Akamai cookie warming.
 * 로그인 페이지 직행 = 봇 패턴.
 * 일반 사용자처럼 메인 → 매장 정보 → 로그인 순서로 방문.
 * 각 단계마다 idle + 마우스 이동 → _abck 가 정상 사용자로 신뢰.
 */
export async function warmAkamaiSession(
  page: Page,
  log: Logger,
  options: {
    landingUrls?: string[]
    finalUrl: string
  }
): Promise<void> {
  const landingUrls = options.landingUrls ?? [
    'https://store.coupangeats.com/',
  ]

  log.info({ landingCount: landingUrls.length }, 'akamai-warming: start')

  for (const url of landingUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await idleThinking(1800, 3500)
      // 마우스를 자연스럽게 이동
      await mouseJiggle(page, 3)
      // 페이지를 살짝 스크롤 (사람의 자연스러운 탐색)
      await page.evaluate(() => {
        window.scrollBy({ top: 200, left: 0, behavior: 'smooth' })
      }).catch(() => {})
      await sleep(800 + Math.random() * 1200)
      log.info({ url, currentUrl: page.url() }, 'akamai-warming: landing visited')
    } catch (e: any) {
      log.warn({ url, err: e?.message?.slice(0, 80) }, 'akamai-warming: landing nav failed (계속 진행)')
    }
  }

  // 최종 로그인 페이지로 이동
  try {
    await page.goto(options.finalUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
    await idleThinking(1500, 3000)
    log.info({ url: options.finalUrl, currentUrl: page.url() }, 'akamai-warming: final url loaded')
  } catch (e: any) {
    log.warn({ err: e?.message?.slice(0, 80) }, 'akamai-warming: final nav failed')
    throw e
  }
}

/**
 * 자연스러운 마우스 이동 (직선 X, 약간의 곡선).
 * 클릭 전에 호출해서 봇 의심 회피.
 */
export async function mouseJiggle(page: Page, steps = 5): Promise<void> {
  try {
    const viewport = page.viewportSize() || { width: 1920, height: 1080 }
    let x = Math.random() * viewport.width
    let y = Math.random() * viewport.height
    for (let i = 0; i < steps; i++) {
      const targetX = Math.random() * viewport.width
      const targetY = Math.random() * viewport.height
      // 곡선 이동 (가운데 베지어 점)
      const midX = (x + targetX) / 2 + (Math.random() - 0.5) * 100
      const midY = (y + targetY) / 2 + (Math.random() - 0.5) * 100
      const segments = 8 + Math.floor(Math.random() * 8)
      for (let s = 0; s <= segments; s++) {
        const t = s / segments
        // 2차 베지어
        const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * midX + t * t * targetX
        const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * midY + t * t * targetY
        await page.mouse.move(px, py).catch(() => {})
        await sleep(8 + Math.random() * 12)
      }
      x = targetX
      y = targetY
      await sleep(80 + Math.random() * 200)
    }
  } catch (_) {
    /* mouse 조작 실패는 무시 */
  }
}

/**
 * 사람 같은 타이핑.
 * 평균 90ms ± 35ms 정규분포 + 5% typo 후 backspace 정정.
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: { typoRate?: number; meanDelay?: number; stdDev?: number } = {}
): Promise<void> {
  const typoRate = options.typoRate ?? 0.04
  const meanDelay = options.meanDelay ?? 90
  const stdDev = options.stdDev ?? 35

  const locator = page.locator(selector).first()
  await locator.click()
  await locator.fill('')
  await sleep(120 + Math.random() * 200)

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    // 가끔 typo: 랜덤 문자 입력 후 backspace 후 진짜 문자
    if (Math.random() < typoRate && /[a-zA-Z0-9]/.test(ch)) {
      const wrong = String.fromCharCode(97 + Math.floor(Math.random() * 26))
      await page.keyboard.type(wrong, { delay: 0 })
      await sleep(randNormal(180, 60))
      await page.keyboard.press('Backspace')
      await sleep(randNormal(120, 40))
    }
    await page.keyboard.type(ch, { delay: 0 })
    await sleep(randNormal(meanDelay, stdDev))
  }
}

/**
 * 클릭 전 작은 딜레이 + mouse hover (사람은 버튼을 정확히 즉시 클릭하지 않음).
 */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const locator = page.locator(selector).first()
  // 버튼 위치 살짝 hover
  try {
    await locator.hover()
    await sleep(120 + Math.random() * 380)
  } catch (_) {}
  await locator.click()
}
