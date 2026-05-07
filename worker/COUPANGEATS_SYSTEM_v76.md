# 쿠팡이츠 자동화 시스템 v76 (2026-05-04 완성)

> **DO NOT BREAK** — 5시간 + 25차 fix 끝에 도달한 안정 상태.
> 어떤 코드 수정 전이든 이 문서 먼저 확인.

---

## 1. 시스템 개요

### 사장님 사용 흐름 (장사닥터 패턴)

```
1. /my/platforms/coupangeats/connect
2. ID/PW 입력 + 약관 동의 → 로그인 클릭
3. Vercel save-login (한국 proxy + raw HTTP) → cookies 저장
4. 자동 fetch 시작 → 5~10초 안에 review 표시
5. AI 답글 초안 자동 생성
6. "자동 발행" 클릭 → 10초 안에 답글 등록
```

### 인프라

| 컴포넌트 | 역할 |
|---|---|
| **Vercel** | UI + API endpoint (auto-publish, save-login, manual-fetch, queue-* 등) |
| **Railway worker** | Playwright + BullMQ 큐 처리 |
| **Supabase** | DB (platform_credentials, platform_reviews) |
| **iproyal residential proxy** | 한국 IP — Akamai 봇 차단 우회 핵심 |

---

## 2. 핵심 동작 원리

### 2-A. 연결 (Vercel 측)

```
사장님 ID/PW → /api/coupang/save-login
→ 한국 proxy raw HTTP 로 직접 로그인 (Playwright X)
→ 응답 cookies (unify-token + Akamai cookies) 받음
→ AES-256-GCM 암호화 후 platform_credentials.extra_data.session_cookies 저장
→ whoami 호출로 storeId auto-discovery
```

**왜 Vercel raw HTTP?** — Playwright headless 는 Akamai _abck JS 챌린지에서 봇으로 탐지. 한국 IP raw HTTP 는 통과.

### 2-B. fetch_reviews (Railway 워커)

```
1. saved cookies → Playwright context.addCookies
2. home/{storeId} nav → _abck 갱신
3. 51차 sliding window: 1일씩 분할 fetch (Akamai rate limit 회피)
   - DAYS_BACK 14 (cron 자동) 또는 payload.days_back (수동)
   - 800ms delay between requests
4. raw response → 정규화 (62차 키 매칭: comment, customerName, replies)
5. dedupe (68차: has_reply 우선)
6. upsert (62차-2 fallback retry)
```

### 2-C. post_reply (Railway 워커, fast path)

```
1. 65차 fast path — sliding window 완전 skip
2. 66차/69차 pre-check — DB has_reply OR raw_snapshot.replies 있으면 skip
3. home nav (3초 idle)
4. 74차 APIRequestContext.fetch (page.evaluate X — navigation 영향 없음)
5. 응답 검증: code === "SUCCESS" 만 진짜 성공
6. updateCoupangReviewStatus → reply_status='submitted'
```

---

## 3. 트래픽 정책 (2026-05-07 갱신)

| 항목 | 값 | 비고 |
|---|---|---|
| cron 빈도 | **매 15분** (96회/일) | `vercel.json` schedule `*/15 * * * *` — 사용자 요청 변경 |
| DAYS_BACK cron | **1일** (24h) | 15분 cadence + 1일 윈도우 = 신규 리뷰만 빠르게 |
| DAYS_BACK 첫 수집 | 180일 | collect API 자동 판단 (DB 0건이면 180일) |
| DAYS_BACK 수동 | payload.days_back | manual-fetch endpoint |
| 리소스 차단 | 이미지/폰트/CSS/미디어 | API + JS 만 통과 |
| 월 트래픽 (예상) | ~9GB (30 user 기준) | iproyal 잔액 모니터링 필수 |
| jobId dedupe | 15분 bucket | `Date.now() / 900_000` |

**75차 정책 (1일 1회 + 14일치) 에서 변경된 이유**:
- 사장님 신고: "리뷰가 늦게 보임" → 15분 단위 갱신 요청
- iproyal 8GB 잔액 충분 → 트래픽 증가 감수
- 1일치만 fetch 라 매 fetch 부하는 14일치보다 ~14배 작음

---

## 4. 25차 fix 누적 (시간순)

| 차수 | 핵심 fix | 파일 |
|---|---|---|
| 56 | stealth init + Akamai warming + humanType + storeId discovery + Web Push 트리거 | worker/lib/stealth.ts, human-behavior.ts, notify.ts |
| 57 | sessionExpired 분기 form login fall-through (재호출 버그 수정) | worker/adapters/coupangeats.ts |
| 58 | loginSucceeded URL 검사 정확화 + whoami 검증 | 동상 |
| 59 | 입력값 검증 + login-error-text 추출 | 동상 |
| **60** | **Vercel save-login 패턴 (Akamai 통과 — 핵심)** | app/lib/coupang-login.ts, app/api/coupang/save-login/route.ts |
| 61 | whoami 다중 신호 (responsibleStoreId 단일 검사 → merchantId/accountId 등) | worker/adapters/coupangeats.ts |
| 62 | 정규화 키 확장 (comment, customerName, images) | 동상 |
| 62-2 | upsert reply_content schema cache miss → fallback retry | worker/lib/reviews.ts |
| 62-3 | batch 내부 중복 platform_review_id dedupe | 동상 |
| 62-4 | ignoreDuplicates: true (ON CONFLICT DO NOTHING) | (68에서 false 복원) |
| **63** | **답글 발행 silent fail 검증 + 다중 endpoint** | worker/adapters/coupangeats.ts |
| **64** | **replies 배열 매칭 (사장님 답글 인식)** + UI 메시지 동적 | worker/adapters/coupangeats.ts, PlatformReviewAdmin.tsx |
| 65 | post_reply fast path — sliding window skip | worker/adapters/coupangeats.ts |
| 66 | 50001 분류 + has_reply pre-check | 동상 |
| 67 | DAYS_BACK 30 → 180 (6개월) | (75에서 14로 단축) |
| **68** | **ignoreDuplicates: false 복원 + has_reply 우선 dedupe** | worker/lib/reviews.ts |
| 68-2 | API select 에 reply_content 추가 + UI 매핑 fallback | app/api/place/reviews/route.ts, PlatformReviewAdmin.tsx |
| 68-3 | UI hasReply 추론 (raw_snapshot.replies / reply_content) + 답글 박스 노출 조건 강화 | PlatformReviewAdmin.tsx |
| 69 | 답글 발행 속도/정확도 개선 (single endpoint + raw_snapshot.replies pre-check) | worker/adapters/coupangeats.ts |
| 70 | slice(0, 200) → slice(0, 2000) (247개 fetch 다 normalize) | 동상 |
| 71 | DAYS_BACK 180 → 60 (큐 처리 빠르게) | (75에서 14) |
| 72 | cron failed 매장 skip + jobId dedupe + auto-publish 자동 cleanup | app/api/cron/delivery-reviews-fetch/route.ts, app/api/review-reply/auto-publish/route.ts |
| 73 | auto-publish 의 has_reply 차단 제거 (워커 pre-check 위임) | app/api/review-reply/auto-publish/route.ts |
| **74** | **page.evaluate → APIRequestContext (navigation 영향 없음 — 핵심)** | worker/adapters/coupangeats.ts |
| **75** | **트래픽 절감 — cron 1일 1번 + DAYS_BACK 14 + 리소스 차단** | vercel.json, worker/adapters/coupangeats.ts |
| 75-2 | manual-fetch endpoint (수동 풀 fetch) | app/api/admin/manual-fetch/route.ts |
| 75-3 | cleanup ?force=1 옵션 (active job 강제 제거) | app/api/admin/queue-cleanup/route.ts |
| 76 | 직접 가져오기 UI 제거 (자동 연결로 대체) | PlatformReviewAdmin.tsx |

---

## 5. 발생했던 오류 + 원인 + 해결 (재발 방지)

### 5-A. 연결 단계

| 오류 | 원인 | 해결 |
|---|---|---|
| Akamai _abck JS 챌린지 → ERR 또는 401 | Playwright headless = 봇 탐지 | **60차** Vercel raw HTTP + 한국 proxy |
| whoami responsibleStoreId=N/A → "session expired" 잘못 판정 | 단일 필드 검사 | **61차** 다중 신호 (merchantId/accountId 등) |
| sessionExpired 분기에서 fetchCoupangReviews 재귀 호출 → form login skip | return await 가 form login 안 거침 | **57차** fall-through 패턴 |
| loginSucceeded URL `/merchant/` 만 보고 success 판정 | `/merchant/login` 도 통과 | **58차** `/login` 또는 `/error` 체크 + whoami 검증 |

### 5-B. fetch_reviews 단계

| 오류 | 원인 | 해결 |
|---|---|---|
| 31개 capture → DB 0개 | 정규화 키 매칭 (r.content) ≠ 실제 응답 (r.comment) | **62차** 키 후보 확장 (comment, customerName, images) |
| upsert "reply_content column not found" | DB schema 에 컬럼 없음 | **62-2** fallback retry (skipCols) + SQL 마이그레이션 |
| ON CONFLICT DO UPDATE 에러 (batch 내 중복) | EXPOSE/UNEXPOSE 둘 다에서 같은 review 캡처 | **62-3** dedupe by platform_review_id |
| 247개 fetch → 200개만 normalize | `.slice(0, 200)` 하드코딩 | **70차** `.slice(0, 2000)` 으로 확장 |
| 답글 단 review 갱신 안 됨 (has_reply: false 유지) | `ignoreDuplicates: true` 라 update 안 함 | **68차** `false` 복원 + has_reply 우선 dedupe |

### 5-C. post_reply 단계

| 오류 | 원인 | 해결 |
|---|---|---|
| `page.evaluate: Execution context was destroyed` | SPA navigation 으로 evaluate context 파괴 | **74차** `page.context().request.fetch` (APIRequestContext) |
| 모든 endpoint silent fail (200 OK 인데 답글 안 달림) | body 검증 없이 result.ok 만 체크 | **63차** body 의 code/error 검증 + 50001 분류 |
| `code: 50001 외부 API 호출 실패` | 이미 답글 있는 review 에 발행 시도 | **66차/69차** pre-check (has_reply OR raw_snapshot.replies) |
| 답글 본문 표시 안 됨 (UI 에서) | API select 에 reply_content 누락 + UI 가 raw_snapshot.ownerReplyBody 만 봄 | **68-2/3** API select 추가 + UI 다중 fallback |
| auto-publish API 가 큐 enqueue 안 함 | `if (row.has_reply) return 409` 무조건 차단 | **73차** reply_status='submitted' 만 차단, has_reply 는 워커 pre-check 위임 |

### 5-D. 인프라 / 큐

| 오류 | 원인 | 해결 |
|---|---|---|
| 큐에 fetch_reviews 23개+ 적체 → post_reply 차례 안 옴 | cron 매 15분 호출 + concurrency=1 + 6개월 fetch 7분 | **75차** cron 하루 1번 + DAYS_BACK 14 (fetch 30초) |
| stalled job 무한 retry (BullMQ attempts 3) | Railway SIGTERM (잦은 재배포) | **72차** auto-publish 자동 cleanup + cron failed 매장 skip |
| HTTP 402 모든 request 실패 | iproyal proxy 잔액/할당량 부족 | **사장님 충전 필요** — 운영 비용 |
| 매번 cron 이 같은 user 다중 enqueue | jobId 없이 add → 매번 새 ID | **72차** `jobId: cron_${platform}_${user}_${hourBucket}` (hour 단위 dedupe) |

---

## 6. 절대 깨지면 안 되는 부분

### 6-A. Vercel save-login 흐름 (60차)

`app/lib/coupang-login.ts` + `app/api/coupang/save-login/route.ts`

- 한국 proxy 환경변수 (`PROXY_HOST` 등) 필수
- iproyal residential 결제 유지 필수
- whoami 검증으로 진짜 로그인 확인

### 6-B. APIRequestContext 사용 (74차)

`worker/src/adapters/coupangeats.ts` 의 `postCoupangEatsReply`:

```typescript
const apiCtx = page.context().request
const apiRes = await apiCtx.fetch(ep.url, { ... })
```

**`page.evaluate` 로 절대 되돌리지 말 것** — SPA navigation 시 즉시 실패.

### 6-C. has_reply 우선 dedupe (68차)

`worker/src/lib/reviews.ts`:

```typescript
const dedupeMap = new Map<string, ...>()
for (const row of allRows) {
  // 답글 있는 버전 우선
  if (row.has_reply && !existing.has_reply) dedupeMap.set(key, row)
}
```

**ignoreDuplicates: false 유지** — true 면 update 안 됨.

### 6-D. UI hasReply 추론 (68-3)

`PlatformReviewAdmin.tsx`:

```typescript
hasReply: !!r.has_reply 
       || !!r.reply_content
       || (Array.isArray(r.raw_snapshot?.replies) && r.raw_snapshot.replies.length > 0)
```

답글 박스 노출 조건도 `replyContent` fallback:
```typescript
{(isSubmitted || review.hasReply || !!review.replyContent) && (...)}
```

### 6-E. 응답 키 매핑 (62차)

쿠팡이츠 응답 구조:
```json
{
  "orderReviewId": 258987721,
  "comment": "...",            ← content
  "customerName": "김*리",      ← author_name
  "images": ["..."],           ← photos
  "replies": [{                ← 답글 배열 (없으면 [])
    "content": "안녕하세요..."
  }],
  "rating": 5,
  "createdAt": "...",
}
```

키 추가 변경 시 위 5개 필드 매핑 유지 필수.

---

## 7. 재발 방지 체크리스트

### 코드 수정 시 필수 확인

- [ ] `page.evaluate` 사용 안 함 (74차 위반) — `page.context().request` 만
- [ ] `ignoreDuplicates: false` 유지 (68차 위반) — has_reply update 보장
- [ ] dedupe key 에 user_id 포함 (62-3)
- [ ] sliding window day 별 800ms delay 유지 (51차 — Akamai rate limit)
- [ ] 응답 검증: `result.ok && code === "SUCCESS"` 만 진짜 성공 (63차)
- [ ] DAYS_BACK 60+ 로 기본값 올리지 말 것 (큐 적체 위험) — 수동 트리거만
- [ ] cron schedule 매 15분 으로 다시 돌리지 말 것 (트래픽 폭발)
- [ ] Vercel cron jobId 유지 (72차) — 중복 enqueue 방지

### 인프라 운영

- [ ] iproyal proxy 잔액 매월 확인 (사용 ~450MB/월 예상)
- [ ] Supabase platform_reviews 컬럼 유지 (reply_content, raw_snapshot)
- [ ] Railway worker concurrency 1 유지 (메모리 압박 방지)
- [ ] Vercel `ENCRYPTION_KEK_HEX` 64 hex 유지

### 새 기능 추가 시

- [ ] post_reply fast path (65차) 흐름 유지
- [ ] pre-check 검사 순서 (66차/69차) — has_reply, reply_content, raw_snapshot.replies
- [ ] silent fail 검증 (63차) — body 의 code 필드 확인

---

## 8. 운영 endpoint

### 사장님 self-service

| URL | 용도 |
|---|---|
| `/api/admin/queue-status` | 큐 상태 진단 (대기/active/failed) |
| `/api/admin/queue-cleanup` | 큐 정리 (waiting fetch_reviews 만, post_reply 보존) |
| `/api/admin/queue-cleanup?force=1` | 강제 정리 (active 도 제거) |
| `/api/admin/manual-fetch?days=90&platform=coupangeats` | 수동 풀 fetch (90일 등) |

### 자동 cron (Vercel)

```json
"/api/cron/delivery-reviews-fetch" : "0 4 * * *"   // KST 13:00, 1일 1번
```

---

## 9. 향후 개선 후보 (선택)

- [ ] 별도 BullMQ 큐 (post_reply 전용 워커) — 동시 처리 가능 시 유용
- [ ] iproyal → 자체 한국 IP 풀 (트래픽 비용 ↓)
- [ ] 답글 자동 발행 일괄 처리 (사장님이 여러 review 한 번에 발행)
- [ ] 답글 발행 후 새 fetch 자동 트리거 (즉시 상태 갱신)
- [ ] cron 빈도 user 별 customizable (사장님이 직접 설정)

---

## 10. 빌드/배포 흐름

```
1. 로컬 코드 수정
2. scripts/push_*.js 로 GitHub push
3. Vercel 자동 빌드 (1~2분) — UI/API 변경 시
4. Railway 자동 빌드 (3~5분) — worker/ 변경 시
5. 큐의 active job SIGTERM 으로 끊김 (자연 stalled → 재시도 또는 정리)
```

**주의**: 자주 push 시 워커 재시작 빈번 → 처리 중 job 끊김 → 사용자 답글 발행 지연. 안정 운영 시점에는 push 자제.

---

## 11. 사용자 신고 시 진단 순서

1. `https://www.localution.co.kr/api/admin/queue-status` 응답 캡처
2. 사장님이 클릭한 review의 platform_review_id 확인
3. Railway worker 로그 (Logs 탭) 에서 해당 review_id 검색
4. 흔한 케이스:
   - `code: 50001` → 이미 답글 있음 (정상)
   - `HTTP 402` → iproyal 결제 문제
   - `Execution context destroyed` → 74차 위반 (page.evaluate 다시 사용)
   - `stalled` → 큐 적체 + cleanup 필요

---

**최종 검증**: 2026-05-04 19:22:16 KST — 사장님 매장 review 256161773 에 답글 73482128 자동 발행 성공 (12초 소요).

**총 작업 시간**: 5시간 / **fix 차수**: 25 / **최종 상태**: 안정 운영
