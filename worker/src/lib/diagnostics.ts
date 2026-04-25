// worker/src/lib/diagnostics.ts
// ============================================================
// 33차-1 · Worker 진단 헬퍼
//   · trySelectors: 셀렉터 후보 배열 순차 시도
//   · dumpPageDiagnostics: 매칭 실패 시 현재 페이지 URL/title/HTML/클래스 덤프
//   · startNetworkCapture: DEBUG_CAPTURE=1 일 때 review 관련 XHR 응답 요약 로깅
// ============================================================
import type { Page } from 'playwright'
import type { Logger } from 'pino'

/** 여러 셀렉터를 순서대로 시도 → 첫 매칭 셀렉터와 개수 반환. 없으면 null. */
export async function trySelectors(
  page: Page,
  selectors: string[],
): Promise<{ selector: string; count: number } | null> {
  for (const sel of selectors) {
    try {
      const count = await page.locator(sel).count()
      if (count > 0) return { selector: sel, count }
    } catch {
      continue
    }
  }
  return null
}

/**
 * 셀렉터 매칭 실패 시 현재 페이지 상태 덤프 (로그에서 확인)
 *   - URL, title
 *   - body HTML 앞 800자 (43차-3: 3000→800 축소, password input value 제거)
 *   - DOM 내 고유 className 목록 앞 100개 (셀렉터 튜닝 힌트)
 */
export async function dumpPageDiagnostics(
  page: Page,
  log: Logger,
  tag: string,
): Promise<void> {
  try {
    const url = page.url()
    const title = await page.title().catch(() => '')
    const snippet = await page
      .evaluate(() => {
        // password 등 민감 input 의 value 제거 후 슬라이스
        document.querySelectorAll('input[type="password"], input[name*="pw" i], input[autocomplete="current-password"]')
          .forEach((el) => { (el as HTMLInputElement).value = '' })
        return (document.body?.innerHTML || '').slice(0, 800)
      })
      .catch(() => '')
    const classes = await page
      .evaluate(() => {
        const set = new Set<string>()
        document.querySelectorAll('[class]').forEach((el) => {
          const cls = el.getAttribute('class') || ''
          cls.split(/\s+/).forEach((c) => {
            if (c.length > 3 && c.length < 60) set.add(c)
          })
        })
        return Array.from(set).slice(0, 100)
      })
      .catch(() => [] as string[])
    const dataTestids = await page
      .evaluate(() => {
        const set = new Set<string>()
        document.querySelectorAll('[data-testid]').forEach((el) => {
          const t = el.getAttribute('data-testid') || ''
          if (t) set.add(t)
        })
        return Array.from(set).slice(0, 50)
      })
      .catch(() => [] as string[])
    log.warn(
      {
        diag_tag: tag,
        url,
        title,
        html_snippet: snippet,
        candidate_classes: classes,
        data_testids: dataTestids,
      },
      'page diagnostics (selector match failed)',
    )
  } catch (e: any) {
    log.error({ err: e?.message }, 'dumpPageDiagnostics failed')
  }
}

/**
 * DEBUG_CAPTURE=1 모드에서 review 관련 XHR 응답을 자동 탐지·요약 로깅.
 * 추후 DOM 파싱 대신 내부 API 직접 호출로 전환하려는 단서를 남긴다.
 */
export function startNetworkCapture(
  page: Page,
  log: Logger,
  keywords: string[] = ['review'],
): void {
  if (process.env.DEBUG_CAPTURE !== '1') return
  const lowerKw = keywords.map((k) => k.toLowerCase())
  page.on('response', async (resp) => {
    try {
      const url = resp.url()
      const lower = url.toLowerCase()
      if (!lowerKw.some((k) => lower.includes(k))) return
      const method = resp.request().method()
      const status = resp.status()
      const type = resp.headers()['content-type'] || ''
      let bodyPreview = ''
      if (type.includes('json') || type.includes('text')) {
        const text = await resp.text().catch(() => '')
        bodyPreview = text.slice(0, 800)
      }
      log.info(
        { net_tag: 'xhr', method, status, url, content_type: type, body_preview: bodyPreview },
        'network capture (review endpoint)',
      )
    } catch {
      // 무시
    }
  })
}

/** 로그인 페이지 잔류 여부 추가 판별 (URL + 본문 텍스트) */
export async function detectLoginFailure(
  page: Page,
  keywords: string[] = ['비밀번호', '아이디', '일치하지', '잘못된', '실패', 'incorrect'],
): Promise<{ failed: boolean; reason: string | null }> {
  try {
    const text = await page
      .evaluate(() => document.body?.innerText?.slice(0, 4000) || '')
      .catch(() => '')
    const hit = keywords.find((k) => text.includes(k))
    if (hit) return { failed: true, reason: `login error text matched: ${hit}` }
    return { failed: false, reason: null }
  } catch {
    return { failed: false, reason: null }
  }
}
