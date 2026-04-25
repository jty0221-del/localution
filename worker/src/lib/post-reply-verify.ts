// worker/src/lib/post-reply-verify.ts
// ============================================================
// 43차-5 · 답글 등록 후 실제 성공 여부 검증
//
//   submit 버튼 클릭 후 fixed 2.5s 대기만 하고 ok=true 반환하면
//   네트워크 오류·검증 실패·캡차 등 false-positive 발생 가능.
//
//   검증 규칙 (둘 중 하나라도 만족 시 성공):
//     1) textareaSelector 가 사라지거나 value 가 비워짐 (모달 닫힘)
//     2) successSelector 가 새로 등장 (사장님 답글 노드)
//
//   실패 규칙:
//     · errorTextPatterns 중 하나라도 페이지 본문에 등장
//     · 위 성공 신호가 timeoutMs 이내에 안 잡힘
// ============================================================
import type { Page } from 'playwright'
import type { Logger } from 'pino'

export type ReplyVerifyOptions = {
  textareaSelector: string
  successSelector?: string
  errorTextPatterns?: string[]
  timeoutMs?: number
  pollMs?: number
}

export async function verifyReplySubmitted(
  page: Page,
  opts: ReplyVerifyOptions,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const timeout = opts.timeoutMs ?? 8000
  const poll = opts.pollMs ?? 500
  const errorPatterns = opts.errorTextPatterns ?? ['오류', '실패', '에러', '제출할 수 없', '잠시 후']
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    // 1) 에러 텍스트 검출 — 가장 우선 (성공 시그널 해석 전에 차단)
    try {
      const text = await page
        .evaluate(() => (document.body?.innerText || '').slice(0, 6000))
        .catch(() => '')
      const hit = errorPatterns.find((p) => text.includes(p))
      if (hit) {
        log.warn({ hit }, 'reply verify: error text detected')
        return { ok: false, reason: `error text: ${hit}` }
      }
    } catch {
      // 무시
    }

    // 2) 성공 셀렉터 확인
    if (opts.successSelector) {
      const found = await page.$(opts.successSelector).catch(() => null)
      if (found) return { ok: true }
    }

    // 3) textarea 사라짐/비워짐
    try {
      const ta = await page.$(opts.textareaSelector).catch(() => null)
      if (!ta) return { ok: true }
      const value = await ta.evaluate((el: any) => (el as HTMLTextAreaElement).value || '').catch(() => '')
      if (!value.trim()) return { ok: true }
    } catch {
      return { ok: true }
    }

    await page.waitForTimeout(poll)
  }

  return { ok: false, reason: `timeout ${timeout}ms — 등록 신호 미감지` }
}
