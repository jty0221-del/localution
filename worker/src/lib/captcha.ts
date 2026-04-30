// worker/src/lib/captcha.ts
// ============================================================
// 2captcha 자동 CAPTCHA 해결 유틸리티
// ============================================================
import type { Logger } from 'pino'

const API_URL = 'https://2captcha.com'

export async function solveCaptcha(opts: {
  page: any
  log: Logger
  type: 'image' | 'recaptcha' | 'auto'
  siteKey?: string
  pageUrl?: string
  captchaSelector?: string
}): Promise<string | null> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY
  if (!apiKey) {
    opts.log.warn('TWOCAPTCHA_API_KEY not set — skipping captcha solve')
    return null
  }

  const { page, log, type, siteKey, pageUrl } = opts

  try {
    if (type === 'recaptcha' && siteKey && pageUrl) {
      return await solveRecaptcha(apiKey, siteKey, pageUrl, log)
    }

    if (type === 'image' || type === 'auto') {
      // 이미지 CAPTCHA 요소 찾기
      const sel = opts.captchaSelector || 'img[src*="captcha"], img[alt*="captcha"], img[id*="captcha"], #captchaimg, .captcha img'
      const imgEl = await page.$(sel)
      if (imgEl) {
        const imgSrc = await imgEl.getAttribute('src')
        if (imgSrc) {
          return await solveImageCaptcha(apiKey, imgSrc, page, log)
        }
        // 스크린샷으로 추출
        const imgBase64 = await imgEl.screenshot({ type: 'png' }).then((b: Buffer) => b.toString('base64')).catch(() => null)
        if (imgBase64) {
          return await solveImageCaptchaBase64(apiKey, imgBase64, log)
        }
      }

      // reCAPTCHA iframe 확인
      const recaptchaFrame = await page.$('iframe[src*="recaptcha"]')
      if (recaptchaFrame) {
        const frameSrc = await recaptchaFrame.getAttribute('src') || ''
        const keyMatch = frameSrc.match(/[?&]k=([^&]+)/)
        if (keyMatch) {
          return await solveRecaptcha(apiKey, keyMatch[1], page.url(), log)
        }
      }
    }
  } catch (e: any) {
    log.warn({ err: e?.message }, 'captcha: solve failed')
  }
  return null
}

async function solveImageCaptcha(apiKey: string, src: string, page: any, log: Logger): Promise<string | null> {
  // URL이면 base64로 변환
  if (src.startsWith('http') || src.startsWith('/')) {
    const fullUrl = src.startsWith('/') ? new URL(src, page.url()).href : src
    const imgResp = await page.evaluate((url: string) =>
      fetch(url, { credentials: 'include' })
        .then((r) => r.arrayBuffer())
        .then((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))))
    , fullUrl).catch(() => null)
    if (imgResp) return await solveImageCaptchaBase64(apiKey, imgResp, log)
  }
  // data:image/png;base64,... 형식
  const b64 = src.replace(/^data:image\/[^;]+;base64,/, '')
  return await solveImageCaptchaBase64(apiKey, b64, log)
}

async function solveImageCaptchaBase64(apiKey: string, base64: string, log: Logger): Promise<string | null> {
  log.info('captcha: submitting image captcha to 2captcha')
  const res = await fetch(`${API_URL}/in.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, method: 'base64', body: base64, json: 1 }),
  })
  const data = await res.json()
  if (data.status !== 1) {
    log.warn({ data }, 'captcha: 2captcha submit failed')
    return null
  }
  return await pollResult(apiKey, data.request, log)
}

async function solveRecaptcha(apiKey: string, siteKey: string, pageUrl: string, log: Logger): Promise<string | null> {
  log.info({ siteKey }, 'captcha: submitting reCAPTCHA to 2captcha')
  const res = await fetch(`${API_URL}/in.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, method: 'userrecaptcha', googlekey: siteKey, pageurl: pageUrl, json: 1 }),
  })
  const data = await res.json()
  if (data.status !== 1) {
    log.warn({ data }, 'captcha: 2captcha reCAPTCHA submit failed')
    return null
  }
  return await pollResult(apiKey, data.request, log)
}

async function pollResult(apiKey: string, captchaId: string, log: Logger): Promise<string | null> {
  log.info({ captchaId }, 'captcha: waiting for 2captcha solution (15~60s)')
  // 첫 15초 대기
  await new Promise((r) => setTimeout(r, 15000))

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const res = await fetch(`${API_URL}/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`)
    const data = await res.json()
    if (data.status === 1) {
      log.info({ captchaId }, 'captcha: solved successfully')
      return data.request
    }
    if (data.request !== 'CAPCHA_NOT_READY') {
      log.warn({ data }, 'captcha: 2captcha error response')
      return null
    }
    log.info({ attempt: i + 1 }, 'captcha: still solving...')
  }
  log.warn({ captchaId }, 'captcha: timed out waiting for solution')
  return null
}

// 네이버 전용 CAPTCHA 처리
export async function handleNaverCaptcha(page: any, log: Logger): Promise<boolean> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY
  if (!apiKey) return false

  const url = page.url()
  log.info({ url }, 'naver: captcha page detected, attempting to solve')

  try {
    // 네이버 CAPTCHA 이미지 선택자
    const naverCaptchaSelectors = [
      '#captchaimg',
      'img.captcha_img',
      'img[src*="captcha"]',
      '.captcha_area img',
      '#mainContent img',
    ]

    let solved: string | null = null
    for (const sel of naverCaptchaSelectors) {
      const el = await page.$(sel)
      if (!el) continue
      const src = await el.getAttribute('src') || ''
      log.info({ sel, src: src.slice(0, 80) }, 'naver: found captcha image')
      solved = await solveImageCaptcha(apiKey, src, page, log)
      if (solved) break
    }

    if (!solved) {
      // 전체 페이지 스크린샷으로 시도
      log.warn('naver: captcha image not found by selector, trying full page')
      return false
    }

    // 솔루션 입력
    const inputSel = '#captcha, input[name="captcha"], input[placeholder*="자"], input[class*="captcha"]'
    const inputEl = await page.$(inputSel)
    if (!inputEl) {
      log.warn('naver: captcha input field not found')
      return false
    }
    await inputEl.click({ clickCount: 3 })
    await inputEl.type(solved, { delay: 80 })
    await page.waitForTimeout(500)

    // 제출
    const submitBtn = await page.$('button[type="submit"], .btn_login, #log\\.login')
    if (submitBtn) {
      await submitBtn.click()
      await page.waitForTimeout(3000)
      log.info('naver: captcha submitted')
      return !page.url().includes('captcha')
    }
    return false
  } catch (e: any) {
    log.warn({ err: e?.message }, 'naver: captcha handling failed')
    return false
  }
}
