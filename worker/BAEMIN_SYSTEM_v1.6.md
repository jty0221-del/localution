# 배민 자동화 시스템 v1.6 (DO NOT BREAK)

**최종 검증**: 2026-05-05 KST 20:44 — Job 1878 reply success ✓ Variant 2 status=200
**진짜 첫 답글 발행 ID**: `reviewCommentId: 2026042503108185` (review `2026042501990179`)
**기반 패턴**: 쿠팡 v76 + 네이버 v37 + 배민 자체 디버그 30+ iteration

---

## 🎯 진짜 배민 API spec (역사적 기록)

### POST /v1/review/shops/{shopId}/reviews/comments

**Body (필수 — 정답)**:
```json
{
  "reviewId": <number>,        // 응답의 'id' 필드
  "contents": "<답글 텍스트>",  // 응답의 'contents' (복수형!)
  "shopNumber": <number>       // 응답의 'shopNumber'
}
```

**Headers**:
- `Content-Type: application/json`
- `Accept: application/json`
- `service-channel: SELF_SERVICE_PC`
- `credentials: include` (page.evaluate fetch)

**Response 200 OK**:
```json
{ "reviewCommentId": <number> }
```

**Response 400 INVALID_PARAMETER**:
- 30일 지난 리뷰 → `"공백일 수 없습니다, 널이어서는 안됩니다"` (배민 generic 에러)
- field name 잘못 (`reviewNo`, `comment`, `shopNo`) → 같은 에러

### GET /v1/review/shops/{shopId}/reviews?from=YYYY-MM-DD&to=YYYY-MM-DD&offset=N&limit=100

**Response shape**:
```json
{
  "next": false,
  "copyReview": false,
  "copyReviewPopup": "",
  "reviews": [
    {
      "id": 2026042501990179,            // 19자리 — review ID (YYYYMMDD prefix)
      "shopNumber": 14637452,            // shop ID
      "memberNo": 171210012316,
      "memberNickname": "치맥지리노",
      "rating": 5,
      "contents": "리뷰 본문 (복수형!)",
      "displayType": "ALL",
      "displayStatus": "DISPLAY",
      "comments": [],                    // 사장님 답글 array (현재 등록 안 됨)
      "images": [
        {
          "id": 2026042501948124,
          "imageUrl": "https://bmreview.cdn.baemin.com/...",
          "displayStatus": "DISPLAY",
          "sequence": 1,
          "createdAt": "2026-04-25T15:28:53.591455"
        }
      ],
      "menus": [],
      "deliveryReviews": [],
      "createdDate": "...",
      "createdAt": "2026-04-25T15:28:53.591455",
      "coupon": null,
      "blockMessage": null,
      "writableComment": true,            // 30일 이내면 true, 초과면 false
      "writableCommentType": "..."
    }
  ]
}
```

**주의**: `writableComment: false` 가 30일 정책 신호 — 이 값 신뢰하면 더 정확함.

---

## 🚫 절대 깨면 안 되는 핵심 설계

### 1. Akamai 우회 — `page.evaluate(() => fetch())`

```typescript
// ❌ 사용 금지 (Akamai 가 Node.js context 차단)
const res = await page.context().request.fetch(url, options)
const res = await fetch(url, options)        // Vercel direct
const res = await proxyFetch(url, options)   // Korean proxy 거쳐도 차단

// ✅ 유일하게 작동
const result = await page.evaluate(async (cfg) => {
  const res = await fetch(cfg.url, {
    method: 'POST',
    credentials: 'include',
    headers: cfg.headers,
    body: JSON.stringify(cfg.body),
  })
  return { status: res.status, body: await res.json() }
}, { url, headers, body })
```

### 2. 쿠키 영속화 — JSON object 형태

```typescript
// ❌ 문자열 (도메인/path/flags 손실)
const cookieStr = cookies.map(c => c.name + '=' + c.value).join('; ')

// ✅ JSON object 그대로
const cookiesJson = JSON.stringify(await context.cookies())
// 복원 시: await context.addCookies(JSON.parse(json))
```

### 3. 30일 정책 — ID YYYYMMDD prefix 로 차단

```typescript
// platform_review_id = "baemin-real-2026011601790734"
// 첫 8자리: "20260116" = 2026-01-16
const idMatch = idNum.match(/^(\d{8})/)
if (idMatch) {
  const ymd = idMatch[1]
  const dateStr = `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}T00:00:00`
  const daysAgo = (Date.now() - new Date(dateStr).getTime()) / 86400_000
  if (daysAgo > 30) return { ok: false, reason: '30일 정책' }
}
```

### 4. 매장 자동 감지 — `/v4/store/shops/search` XHR + `/shops/{N}/` DOM

```typescript
// allShopIds = DOM 링크 + XHR contents 합집합
// 14666661 (default landing) 자동 제외
if (ids.length > 1 && ids.includes('14666661')) {
  shopIdsToFetch = ids.filter(id => id !== '14666661')
}
```

### 5. ws polyfill — Node 20 Supabase realtime fix

```typescript
// worker/src/lib/supabase.ts
import ws from 'ws'
if (typeof (globalThis as any).WebSocket === 'undefined') {
  ;(globalThis as any).WebSocket = ws
}
```

### 6. JS syntax — `||` 와 `??` 절대 섞지 말 것

```typescript
// ❌ SyntaxError
const v = a || b ?? c

// ✅
const v = a || b || c
const v = (a || b) ?? c
```

---

## 📋 v1.6 시리즈 30+ iteration 요약

| 버전 | 핵심 |
|---|---|
| v1.0 | 초기 — Vercel save-login (RSA + 한국 프록시) |
| v1.5 | Worker cookie injection (fresh login 우회) |
| v1.6 | 다중 login URL + ERR_ABORTED 견고성 |
| v1.6b | 'unknown' shopId sentinel 제거 |
| v1.6c | 쿠키 JSON 영속화 (domain/path/flags 보존) |
| v1.6d | /mypage redirect = 인증됨 감지 |
| v1.6e | CEO_HOME 12s 재시도 + /login redirect 감지 |
| v1.6f | REST direct fetch 시도 (실패 — Akamai 차단) |
| v1.6g | **page.evaluate 안 fetch** (Akamai 우회 성공) |
| v1.6h | API 요청 30일 → 180일 (활동 적은 매장 대응) |
| v1.6i | /v4/shops/search XHR 추출 + 14666661 제외 |
| v1.6j | 진짜 필드명 (`contents`, `comments[0].contents`) |
| v1.6j_fix | `||` `??` syntax error 수정 |
| v1.6k | post_reply in-browser fetch 적용 + 알림 통합 |
| v1.6l | 3-variant 자동 시도 (Variant 2 정답 발견) |
| v1.6m | 30일 경과 UI 차단 + 안내 모달 |
| v1.6n | Node 20 ws WebSocket polyfill |
| v1.6o | ID YYYYMMDD prefix 30일 사전 차단 (3곳) |
| **v1.6p** | **Variant 2 1순위 (정답) — 1번에 성공** |

---

## 🆘 자주 깨는 실수 (재발 방지 체크리스트)

| 실수 | 영향 | 방지법 |
|---|---|---|
| `||` `??` 같이 사용 | SyntaxError → Worker startup 실패 | 모두 `||` 통일 |
| `page.context().request.fetch` | Akamai 403 차단 | `page.evaluate(() => fetch())` |
| 쿠키 문자열 영속화 | domain/path 손실 → 다음 세션 인증 X | JSON object 형태 |
| 'unknown' shopId sentinel | `/shops/unknown/reviews` 빈 페이지 | 빈 string + Worker 자동 감지 |
| 30일 체크에 posted_at 만 | DB null 시 차단 안 됨 | ID YYYYMMDD prefix fallback |
| `networkidle` page.goto | SPA 가 idle 도달 못함 → 45s timeout | `domcontentloaded` |
| `reviewNo`/`comment`/`shopNo` body | 400 INVALID_PARAMETER | `reviewId`/`contents`/`shopNumber` |
| ws polyfill 없음 | Node 20 Supabase realtime crash | worker package.json + globalThis 설정 |
| Railway auto-deploy 누락 | 코드 변경 반영 안 됨 | Dockerfile CACHE_BUST ARG bump |
| 14666661 default shop fetch | 0건 → 진짜 매장 무시 | 다른 shop 있으면 자동 제외 |

---

## 🎯 운영 흐름

```
1. 사장님 ID/PW 입력 → save-login (RSA + 한국 프록시)
   ├─ 성공 시: 쿠키 저장 + Worker enqueue
   └─ 실패 시: ID/PW 만 저장 + Worker 위임 (fail-open)

2. Worker (Railway Playwright) fetch_reviews
   ├─ 저장된 쿠키 inject (90% 케이스 즉시 인증)
   ├─ 미인증 시 multi-URL login + /mypage redirect 감지
   └─ login 성공 시 fresh cookies JSON 자동 저장

3. 매장 자동 감지
   ├─ /v4/store/shops/search XHR contents
   ├─ DOM /shops/{N}/ links
   └─ 14666661 default landing 자동 제외

4. 매장별 리뷰 fetch (in-browser fetch)
   └─ /v1/review/shops/{shopId}/reviews?from=...&to=...&offset=N&limit=100
      (180일 fetch + 30일 cutoff 필터)

5. 응답 매핑 (배민 진짜 필드명)
   ├─ id → platform_review_id ('baemin-real-{id}')
   ├─ memberNickname → author_name
   ├─ rating → rating (1-5)
   ├─ contents → content (복수형!)
   ├─ comments[0].contents → reply_content (사장님 답글)
   ├─ images → photos (배민 CDN whitelist)
   └─ createdAt → posted_at

6. cutoff 30일 필터 + has_reply 우선 dedupe upsert

7. 새 리뷰 시 알림 트리거 (Web Push + 카카오톡)

8. 사장님 답글 발행
   ├─ ID YYYYMMDD prefix 로 30일 사전 검증 (UI + 서버 + Worker)
   ├─ 30일 지난 리뷰 → 친절한 모달 (배민 정책 안내)
   └─ 30일 이내 → Worker post_reply (in-browser fetch)
      └─ Variant 2 (reviewId+contents+shopNumber) → 200 OK 즉시 성공
```

---

## 🏗️ 인프라 의존성 (DO NOT BREAK)

- **iproyal residential proxy** — 한국 IP, 월 ~50MB
- **Vercel ENCRYPTION_KEK_HEX** — 64 hex chars
- **REDIS_URL** — BullMQ 큐
- **Railway Worker** — Playwright + Korean proxy launch-level
- **`ws` 패키지 (worker)** — Node 20 Supabase realtime polyfill
- **Supabase platform_reviews 컬럼**: `reply_content`, `reply_status`, `reply_submitted_at`, `raw_snapshot`

---

## 🎁 다음 작업 후보 (TODO)

- [ ] Variant 2 1순위 최적화 → Variant 1 skip (1초 단축)  ← **v1.6p 진행 중**
- [ ] 요기요 자동화 (배민 패턴 적용)
- [ ] PC/모바일 반응형 점검
- [ ] writableComment: false 활용한 더 정확한 30일 차단
- [ ] reply_status='failed' 자동 재시도 큐
- [ ] 다중 매장 (multi shopNo) 사장님 UI 개선
