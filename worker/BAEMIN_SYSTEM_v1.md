# 배민 자동화 시스템 v1 (DO NOT BREAK)

**최초 검증**: 2026-05-04 KST · BAEMIN v1 deploy
**기반 패턴**: 쿠팡 v76 (60·63·66·68·69·74·75차) + 네이버 v37

---

## 1. 아키텍처 개요

```
[사장님 ID/PW] → Vercel save-login (한국 프록시 + RSA)
                      ↓
              biz-member.baemin.com
                      ↓ 쿠키 획득
                      ↓
              self.baemin.com 방문 → self-api 쿠키 추가
                      ↓
              Supabase platform_credentials (AES-256-GCM 1단/2단)
                      ↓
              [자동 enqueue fetch_reviews 1회] (쿠팡 60차 패턴)

[Vercel Cron 1일 1회 KST 13:00 (delivery-reviews-fetch)]
                      ↓
              Railway Worker (BullMQ)
                      ↓
              worker/adapters/baemin.ts (Playwright)
                      ↓ XHR 캡처 + DOM 폴백
                      ↓
              upsertReviews (has_reply 우선 dedupe + raw_snapshot)

[사장님이 답글 발행 클릭]
                      ↓
              /api/baemin/post-reply (Vercel)
                      ↓ 사전 차단 (reply_status / has_reply / raw_snapshot.replies)
                      ↓ self-api.baemin.com 직접 REST 호출
                      ↓ 응답 body 검증 (code === SUCCESS)
                      ↓ 401 → auto-login 자동 retry
                      ↓
              platform_reviews (reply_status='submitted')
```

---

## 2. 핵심 설계 (절대 깨면 안 됨)

### 2-1. 연결 = Vercel save-login (`app/lib/baemin-login.ts`)
- biz-member.baemin.com/v1/login/init 로 RSA 공개키 획득 (PKCS1)
- 한국 프록시 경유 (proxy-fetch.ts) — geo-block 회피
- value1 = RSA(id), value2 = RSA(pw) → /v1/login POST
- 응답 status === 'SUCCESS' 만 진짜 성공
- self.baemin.com 방문해서 self-api 쿠키 추가 획득

### 2-2. 리뷰 수집 = Vercel collect-reviews + Railway Worker 폴백
- **1차: Vercel 직접 REST 호출** (`/api/baemin/collect-reviews`)
  - 쿠키 + XSRF-TOKEN → self-api.baemin.com/v1/review/shops/{shopNo}/reviews
  - 페이지네이션 루프 (PAGE_SIZE=50, MAX_PAGES=20, 800ms delay)
  - DAYS_BACK 14 (cron 자동) / payload.days_back (수동)
  - 401/403 → refreshCookieFromCreds() → retry
  - 가장 오래된 리뷰가 cutoff 넘으면 stop
- **2차: Worker 큐 폴백** (Vercel 직접 호출 실패 시)
  - Playwright + XHR 캡처 + DOM 폴백
- upsert: has_reply 우선 dedupe + raw_snapshot 저장

### 2-3. 답글 등록 = Vercel post-reply (직접 REST API)
- POST self-api.baemin.com/v1/review/shops/{shopNo}/reviews/comments
- body: `{ reviewNo, comment, shopNo: Number }`
- **사전 차단 (66차/69차)**: reply_status='submitted' OR has_reply OR raw_snapshot.replies → 즉시 409
- **응답 body 검증 (63차)**: code === 'SUCCESS' / 'OK' / '0' / '200' 만 진짜 성공
- 401/403 → refreshCookieFromCreds() → retry 1회
- 성공 시 `reply_status='submitted'` + `reply_submitted_at` 기록

### 2-4. Worker 어댑터 (`worker/src/adapters/baemin.ts`)
- **post_reply: APIRequestContext (74차 패턴)**
  - `page.context().request.fetch()` 사용 — navigation 영향 X
  - `page.evaluate` 사용 금지 (SPA destroy 영향 받음)
  - shopNo 는 page.url() 에서 추출
  - 응답 body 검증 (63차) — silent fail 차단
- fetch_reviews: XHR 캡처 + DOM 폴백 유지 (Vercel 직접 호출 fallback)

### 2-5. 트래픽 절감
- Vercel Cron: `delivery-reviews-fetch` (`0 4 * * *` UTC = KST 13:00)
- 1일 1회 → 사장님 매장당 14일치 fetch (이전 30개 단일 페이지 대비 ~5배 보강)
- save-login 직후 1회 자동 enqueue → 사장님 대기 시간 단축

### 2-6. 데이터 정합성 (68차)
- `hasReply` 추론: ownerReply OR reply OR ownerComment OR replyContent OR hasReply OR replyContent
- `raw_snapshot` 필수 저장 → post-reply pre-check 의존
- API select 절에 `reply_content` + `reply_status` + `raw_snapshot` 포함 필수

---

## 3. 자주 깨는 실수 (재발 방지 체크리스트)

| 실수 | 영향 | 방지법 |
|---|---|---|
| `page.evaluate` 로 fetch 호출 | navigation context destroyed → silent fail | APIRequestContext 만 사용 |
| pageNumber=1&pageSize=30 단일 호출 | 최신 30개만 → 14일치 안됨 | 페이지네이션 루프 + cutoff 체크 |
| `ignoreDuplicates: true` | has_reply 단 review 가 update 안됨 | `ignoreDuplicates: false` 유지 |
| has_reply 사전 체크 누락 | 중복 답글 발행 → 배민 측 거부 | `pre-check raw_snapshot.replies` |
| 응답 body 검증 누락 | HTTP 200이어도 silent fail | `code === 'SUCCESS'` 검증 |
| API select 에 reply_content 누락 | UI 답글 본문 표시 안됨 | select 절 명시 |
| 쿠키 만료 후 fetch 실패 | 사장님이 매번 재로그인 필요 | 401 → auto-login retry |
| save-login 후 큐 enqueue 누락 | 사장님이 빈 화면 봄 | save-login 끝에 enqueuePlatformJob |

---

## 4. 인프라 의존성

- **iproyal residential proxy** 필수 (한국 IP 우회) — 월 ~50MB (배민만)
- **Vercel ENCRYPTION_KEK_HEX** 64 hex
- **REDIS_URL** (BullMQ 큐) — Worker 폴백용
- **Supabase platform_reviews** 컬럼: `reply_content`, `reply_status`, `reply_submitted_at`, `raw_snapshot`

---

## 5. 운영 endpoint

- `/api/admin/queue-status` 진단 (배민 포함)
- `/api/admin/queue-cleanup?force=1` 큐 청소
- `/api/admin/manual-fetch?platform=baemin&days=N` 수동 풀 fetch
- `/api/baemin/collect-reviews` (직접 호출 + 북마크릿)
- `/api/baemin/auto-login` 쿠키 강제 재발급
- `/api/baemin/post-reply` 답글 발행

---

## 6. v1 핵심 변경사항

가장 중요한 6개:

1. **collect-reviews 페이지네이션** — 30개 → 1000개 (14일치)
2. **post-reply 응답 body 검증** — silent fail 차단
3. **post-reply has_reply 사전 차단** — 중복 답글 차단
4. **post-reply 401 auto-retry** — 쿠키 만료 자동 복구
5. **save-login 자동 enqueue** — 연결 즉시 수집 시작
6. **worker post_reply APIRequestContext 전환** — Playwright DOM 폐기

---

## 7. 다음 단계 (TODO)

- [ ] Vercel direct cron (`baemin-reviews-fetch`) 추가하여 Worker 의존도 더 낮추기
- [ ] reply_status='failed' 자동 재시도 큐
- [ ] 다중 매장 (multi shopNo) 자동 순회
- [ ] 별점 1-2점 우선순위 답글 큐 (네이버 v37 패턴)
