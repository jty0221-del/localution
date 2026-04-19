// ═══════════════════════════════════════════════════════════
//  app/lib/toast.ts
//  전역 토스트 & 확인 다이얼로그 유틸 (프로바이더 불필요)
//  사용:
//    import { toast, confirmDialog } from '@/lib/toast'  (또는 상대경로)
//    toast.success('저장됐어요')
//    toast.error('실패했어요')
//    const ok = await confirmDialog('삭제할까요?')
//    if (ok) { ... }
// ═══════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'info' | 'warn'

function ensureContainer(id: string): HTMLDivElement {
  let el = document.getElementById(id) as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = id
    document.body.appendChild(el)
  }
  return el
}

function injectStyles() {
  if (document.getElementById('loc-toast-styles')) return
  const s = document.createElement('style')
  s.id = 'loc-toast-styles'
  s.textContent = `
    #loc-toast-stack{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:calc(100vw - 32px);width:max-content;}
    .loc-toast{pointer-events:auto;padding:12px 18px;border-radius:14px;font-size:13.5px;font-weight:600;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;animation:locSlideIn .22s ease-out;max-width:90vw;line-height:1.5;white-space:pre-wrap;word-break:keep-all;}
    .loc-toast.closing{animation:locSlideOut .2s ease-in forwards;}
    .loc-toast.success{background:#12B76A;}
    .loc-toast.error{background:#F04452;}
    .loc-toast.info{background:#191F28;}
    .loc-toast.warn{background:#F59E0B;}
    @keyframes locSlideIn{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes locSlideOut{to{opacity:0;transform:translateY(-10px);}}
    #loc-confirm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;animation:locFade .15s ease-out;}
    #loc-confirm-backdrop .box{background:#fff;border-radius:20px;padding:24px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,0.2);animation:locScaleIn .18s ease-out;}
    #loc-confirm-backdrop .title{font-size:16px;font-weight:800;color:#191F28;margin:0 0 8px;}
    #loc-confirm-backdrop .msg{font-size:14px;color:#4E5968;line-height:1.55;margin:0 0 20px;white-space:pre-wrap;word-break:keep-all;}
    #loc-confirm-backdrop .btns{display:flex;gap:8px;}
    #loc-confirm-backdrop button{flex:1;padding:12px;border-radius:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:all .15s;}
    #loc-confirm-backdrop .cancel{background:#F2F4F6;color:#4E5968;}
    #loc-confirm-backdrop .cancel:hover{background:#E5E8EB;}
    #loc-confirm-backdrop .ok{background:#3182F6;color:#fff;}
    #loc-confirm-backdrop .ok:hover{background:#1B64DA;}
    #loc-confirm-backdrop .ok.danger{background:#F04452;}
    #loc-confirm-backdrop .ok.danger:hover{background:#D92236;}
    @keyframes locFade{from{opacity:0;}to{opacity:1;}}
    @keyframes locScaleIn{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
  `
  document.head.appendChild(s)
}

function show(type: ToastType, message: string, duration = 2600) {
  if (typeof document === 'undefined') return
  injectStyles()
  const stack = ensureContainer('loc-toast-stack')
  const el = document.createElement('div')
  el.className = 'loc-toast ' + type
  el.textContent = message
  stack.appendChild(el)
  const close = () => {
    el.classList.add('closing')
    setTimeout(() => el.remove(), 200)
  }
  el.addEventListener('click', close)
  setTimeout(close, duration)
}

export const toast = {
  success: (msg: string, duration?: number) => show('success', msg, duration),
  error:   (msg: string, duration?: number) => show('error',   msg, duration ?? 3200),
  info:    (msg: string, duration?: number) => show('info',    msg, duration),
  warn:    (msg: string, duration?: number) => show('warn',    msg, duration),
}

export interface ConfirmOpts {
  title?: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

/**
 * alert 을 토스트로 대체할 때 쓰는 간단 헬퍼
 * (alert 은 블로킹이었지만 토스트는 비블로킹 → 호출부에서 return/await 이슈 없음)
 */
export function alertToast(message: string, type: ToastType = 'info') {
  show(type, message)
}

/**
 * confirm() 대체 — Promise<boolean> 반환.
 * 사용: const ok = await confirmDialog('정말 삭제할까요?', { danger: true })
 */
export function confirmDialog(message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  injectStyles()

  return new Promise<boolean>(resolve => {
    const back = document.createElement('div')
    back.id = 'loc-confirm-backdrop'

    const box = document.createElement('div')
    box.className = 'box'

    if (opts.title) {
      const t = document.createElement('div')
      t.className = 'title'
      t.textContent = opts.title
      box.appendChild(t)
    }

    const msg = document.createElement('div')
    msg.className = 'msg'
    msg.textContent = message
    box.appendChild(msg)

    const btns = document.createElement('div')
    btns.className = 'btns'

    const cancel = document.createElement('button')
    cancel.className = 'cancel'
    cancel.textContent = opts.cancelText ?? '취소'

    const ok = document.createElement('button')
    ok.className = 'ok' + (opts.danger ? ' danger' : '')
    ok.textContent = opts.okText ?? '확인'

    const close = (v: boolean) => {
      back.remove()
      document.removeEventListener('keydown', onKey)
      resolve(v)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter')  close(true)
    }
    cancel.addEventListener('click', () => close(false))
    ok.addEventListener('click', () => close(true))
    back.addEventListener('click', e => {
      if (e.target === back) close(false)
    })
    document.addEventListener('keydown', onKey)

    btns.appendChild(cancel)
    btns.appendChild(ok)
    box.appendChild(btns)
    back.appendChild(box)
    document.body.appendChild(back)

    setTimeout(() => ok.focus(), 0)
  })
}
