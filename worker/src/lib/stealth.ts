// worker/src/lib/stealth.ts
// ============================================================
// 강화된 stealth init script (Akamai _abck JS 챌린지 통과율 향상)
//   · 기존 webdriver/plugins 위장 + Canvas/WebGL/Audio fingerprint 마스킹
//   · CDP 탐지 회피 (Runtime/Page 흔적 제거)
//   · 매 호출마다 다른 fingerprint (동일 머신에서도 변화 → 봇 패턴 감지 회피)
// ============================================================
import type { BrowserContext } from 'playwright'

/**
 * BrowserContext 에 stealth init script 주입.
 * page 생성 전에 호출해야 함 (addInitScript 는 future page 에 적용).
 */
export async function applyStealth(context: BrowserContext): Promise<void> {
  // 매 컨텍스트마다 다른 fingerprint seed (동일 워커가 100번 로그인해도 모두 다른 값)
  const seed = Math.floor(Math.random() * 1_000_000_000)

  await context.addInitScript((fpSeed: number) => {
    // ── 기존 위장 (webdriver, plugins, languages, etc.) ──
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    } catch (_) {}

    // PluginArray 흉내
    try {
      const fakePlugins = [
        'Chrome PDF Plugin',
        'Chrome PDF Viewer',
        'Native Client',
        'Widevine Content Decryption Module',
        'Microsoft Edge PDF Plugin',
      ]
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr: any = fakePlugins.map((name, i) => ({
            name,
            filename: name.toLowerCase().replace(/ /g, '-') + '.dll',
            description: name,
            length: 1,
            item: () => null,
            namedItem: () => null,
            [i]: { type: 'application/x-' + i },
          }))
          arr.length = fakePlugins.length
          arr.item = (i: number) => arr[i]
          arr.namedItem = (n: string) => arr.find((p: any) => p.name === n) || null
          arr.refresh = () => {}
          return arr
        },
      })
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => ({ length: 4, item: () => null, namedItem: () => null }),
      })
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ko-KR', 'ko', 'en-US', 'en'],
      })
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    } catch (_) {}

    // Chrome runtime
    try {
      ;(window as any).chrome = {
        runtime: {
          id: undefined,
          connect: () => {},
          sendMessage: () => {},
          onConnect: { addListener: () => {}, removeListener: () => {}, hasListener: () => false },
          onMessage: { addListener: () => {}, removeListener: () => {}, hasListener: () => false },
        },
        loadTimes: () => ({}),
        csi: () => ({}),
        app: { isInstalled: false, getDetails: () => null, getIsInstalled: () => false },
      }
    } catch (_) {}

    // Permission API
    try {
      const origQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions)
      if (origQuery) {
        ;(window.navigator.permissions as any).query = (params: any) =>
          params.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : origQuery(params)
      }
    } catch (_) {}

    if (!window.outerWidth) Object.defineProperty(window, 'outerWidth', { get: () => 1920 })
    if (!window.outerHeight) Object.defineProperty(window, 'outerHeight', { get: () => 1080 })

    // ── 신규: Canvas fingerprint 미세 노이즈 ──
    // Akamai _abck 가 캔버스 핑거프린트를 수집할 때, 매번 동일하면 봇 의심
    // 매 toDataURL/getImageData 호출마다 1-2 픽셀 미세 변형 → 사람 디바이스처럼
    try {
      const seedRand = (() => {
        let s = fpSeed
        return () => {
          s = (s * 1664525 + 1013904223) % 4294967296
          return s / 4294967296
        }
      })()

      const origToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, ...args: any[]) {
        try {
          const ctx = this.getContext('2d')
          if (ctx && this.width > 0 && this.height > 0) {
            const imgData = ctx.getImageData(0, 0, this.width, this.height)
            // 모서리 픽셀 1개만 1bit 변형 (시각적 영향 거의 없음, fingerprint 는 변경)
            const idx = Math.floor(seedRand() * imgData.data.length / 4) * 4
            imgData.data[idx] = (imgData.data[idx] + 1) % 256
            ctx.putImageData(imgData, 0, 0)
          }
        } catch (_) {}
        return origToDataURL.apply(this, args as any)
      }

      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData
      CanvasRenderingContext2D.prototype.getImageData = function (
        this: CanvasRenderingContext2D,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        ...rest: any[]
      ) {
        const data = origGetImageData.apply(this, [sx, sy, sw, sh, ...rest] as any) as ImageData
        try {
          // 1픽셀에 1bit 노이즈
          if (data.data.length >= 4) {
            const idx = Math.floor(seedRand() * data.data.length / 4) * 4
            data.data[idx] = (data.data[idx] + 1) % 256
          }
        } catch (_) {}
        return data
      }
    } catch (_) {}

    // ── 신규: WebGL fingerprint 마스킹 ──
    // UNMASKED_RENDERER_WEBGL / UNMASKED_VENDOR_WEBGL 을 일반적 사용자 값으로
    try {
      const fakeRenderer = 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
      const fakeVendor = 'Google Inc. (Intel)'
      const wrapGetParam = (proto: any) => {
        if (!proto) return
        const orig = proto.getParameter
        if (!orig) return
        proto.getParameter = function (this: any, p: number) {
          // UNMASKED_RENDERER_WEBGL = 37446, UNMASKED_VENDOR_WEBGL = 37445
          if (p === 37445) return fakeVendor
          if (p === 37446) return fakeRenderer
          return orig.call(this, p)
        }
      }
      // @ts-ignore
      wrapGetParam((window as any).WebGLRenderingContext?.prototype)
      // @ts-ignore
      wrapGetParam((window as any).WebGL2RenderingContext?.prototype)
    } catch (_) {}

    // ── 신규: AudioContext fingerprint 미세 노이즈 ──
    try {
      const audioCtxes = ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'webkitOfflineAudioContext']
      for (const name of audioCtxes) {
        const Ctx = (window as any)[name]
        if (!Ctx?.prototype?.createAnalyser) continue
        const origCreateAnalyser = Ctx.prototype.createAnalyser
        Ctx.prototype.createAnalyser = function (this: any) {
          const analyser = origCreateAnalyser.call(this)
          const origGetFloat = analyser.getFloatFrequencyData
          analyser.getFloatFrequencyData = function (this: any, arr: Float32Array) {
            origGetFloat.call(this, arr)
            // 1kHz~5kHz 대역에 ±0.0001dB 노이즈
            for (let i = 0; i < arr.length; i++) {
              arr[i] += (Math.random() - 0.5) * 0.0002
            }
          }
          return analyser
        }
      }
    } catch (_) {}

    // ── 신규: CDP 탐지 흔적 제거 ──
    // Runtime.enable, console.debug 호출 흔적 등을 봇 탐지가 사용
    try {
      // navigator.connection
      if (!(navigator as any).connection) {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            downlink: 10,
            effectiveType: '4g',
            rtt: 50,
            saveData: false,
            type: 'wifi',
            onchange: null,
          }),
        })
      }
      // window.indexedDB - 실제 사용자는 항상 존재
      // (chromium headless 도 일반적으로 있지만 만약 missing 시 대비)

      // function.toString().includes("[native code]") 검사 우회
      const origFnToString = Function.prototype.toString
      Function.prototype.toString = function () {
        // 우리가 override 한 함수들도 native 처럼 보이도록
        if (this === HTMLCanvasElement.prototype.toDataURL ||
            this === CanvasRenderingContext2D.prototype.getImageData) {
          return 'function ' + (this as any).name + '() { [native code] }'
        }
        return origFnToString.call(this)
      }
    } catch (_) {}

    // ── 신규: navigator.userAgentData (Chromium 90+) ──
    // 일부 안티봇이 sec-ch-ua 헤더와 navigator.userAgentData 일치 여부 검사
    try {
      if (!(navigator as any).userAgentData) {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => ({
            brands: [
              { brand: 'Google Chrome', version: '124' },
              { brand: 'Chromium', version: '124' },
              { brand: 'Not-A.Brand', version: '99' },
            ],
            mobile: false,
            platform: 'Windows',
            getHighEntropyValues: (hints: string[]) => Promise.resolve({
              architecture: 'x86',
              bitness: '64',
              brands: [
                { brand: 'Google Chrome', version: '124' },
                { brand: 'Chromium', version: '124' },
                { brand: 'Not-A.Brand', version: '99' },
              ],
              fullVersionList: [
                { brand: 'Google Chrome', version: '124.0.6367.119' },
                { brand: 'Chromium', version: '124.0.6367.119' },
                { brand: 'Not-A.Brand', version: '99.0.0.0' },
              ],
              mobile: false,
              model: '',
              platform: 'Windows',
              platformVersion: '15.0.0',
              uaFullVersion: '124.0.6367.119',
              wow64: false,
            }),
            toJSON: () => ({ brands: [], mobile: false, platform: 'Windows' }),
          }),
        })
      }
    } catch (_) {}
  }, seed)
}
