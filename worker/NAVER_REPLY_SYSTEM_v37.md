# 네이버 SmartPlace 답글 자동등록 시스템 — v37 작동 기준 (DO NOT BREAK)

> **🚨 절대 주의**: 14 iteration (v16 → v37) 끝에 모든 매장에서 정상 작동 검증 완료된 시스템.
> 함부로 변경하면 다시 처음부터 디버깅. 변경 전 반드시 이 문서의 7가지 불변식 확인.

## 작동 검증 시점 (최신)

- **날짜**: 2026-05-03
- **테스트 JobId**: 489 → result: "ok", DB status: "submitted" ✅
- **테스트 매장**: paaron 계정 / 일산닭칼국수 부천점 (이전 14회 실패한 가장 어려운 케이스)
  - internal placeId: `10441797` (SmartPlace 내부)
  - **external placeId: `1137287126`** (m.place.naver.com 공개) ← 핵심 키
  - bookingBusinessId: `1289786`
- **이전 검증 케이스**: jobId 473 / 소금정원 강화점 (외부=내부 placeId 동일한 매장)
- **NAVER_CODE_VERSION**: `v37-verify-external-placeId-replyResponse-trust-20260503`
- **워커 URL**: https://worker-production-d024.up.railway.app
  - `/build-info` 로 라이브 버전 확인 가능

## 핵심 7 단계 흐름 — 한 단계라도 깨지면 FORBIDDEN/silent reject

```
1. 네이버 로그인 (ID/PW + CAPTCHA 자동 풀이 + deviceAdd "등록" 클릭)
        ↓
2. NID_AUT/NID_SES + csrf_token + JSESSIONID + neoidLoginSession 정상 발급
        ↓
3. ⭐ 외부 placeId 로드 (loadExternalPlaceId): stores.naver_url 에서 추출
   - 패턴: m.place.naver.com/*/(\d+) | map.naver.com/.../place/(\d+)
   - 실패 시 fallback: 내부 placeId 사용 (작동 안 할 수 있음)
        ↓
4. SmartPlace /bizes/place/{internalId} 직접 진입 → SPA hydration
        ↓
5. URL 에서 bookingBusinessId 자동 추출 (정규식 /bookingBusinessId=(\d+)/)
   → SPA 안에서 reviews 탭 SPA 클릭 (page.goto 회피, history.pushState 사용)
        ↓
6. 정식 owner referer URL 확보:
   /bizes/place/{internalId}/reviews?bookingBusinessId={bid}&menu=visitor
        ↓
7. page.evaluate(fetch) 로 GraphQL createReply 호출
   - input.placeId: ⭐ EXTERNAL placeId (예: 1137287126)
   - input.reviewId: String (24-char hex)
   - input.bookingBusinessId: ⭐ Int (parseInt 변환 필수)
   - input.text: 답글 내용
   - 헤더: x-csrf-token (cookie 값) + x-requested-with + apollographql-client-*
        ↓
[응답 검증] reply.text 존재 + isQualified:true + isSuspended:false + isDeleted:false
   → ⭐ replyResponseValid 만 충족하면 SUCCESS (verify 결과 무시 — false negative 방지)
        ↓
[비동기 verify] m.place.naver.com pcmap-api 로 답글 인덱싱 확인 (보조)
   → external placeId 사용 (internal 사용 시 silent reject 오판)
```

## 핵심 코드 위치 (worker/src/adapters/naver.ts)

| 영역 | 절대 변경 금지 사유 |
|---|---|
| `NAVER_CODE_VERSION` 상수 (line 16) | 버전 추적, /build-info 검증 |
| 새기기 deviceAdd 핸들러 — "등록" 우선 클릭 (CAPTCHA 후, line ~770~830) | "등록안함" 누르면 NID_AUT 미발급 |
| bookingBusinessId 자동 추출 (line ~1037~1090) | place 직접 진입 + 카드 클릭 fallback 양쪽 유지 |
| 정식 reviews URL 진입 (SPA tab click) | page.goto 만 쓰면 SPA state 충돌 |
| **외부 placeId 로드 (loadExternalPlaceId)** | createReply input.placeId 핵심 |
| **createReply input.placeId = `externalPlaceId \|\| storeId`** | 외부 ID 우선 |
| **bookingBusinessId Int 변환 (parseInt)** | String 보내면 INTERNAL_SERVER_ERROR |
| in-page fetch 헤더 (x-csrf-token + apollo + x-requested-with) | SmartPlace 봇 검증 통과 |
| **replyResponseValid 검증 (isQualified + text + !isSuspended + !isDeleted)** | verify 보조 검증으로 강등 — false negative 방지 |
| 비동기 verify (`verifyReplyByGraphQL`) | external placeId 사용 (internal 쓰면 오판) |

## 절대 깨지면 안 되는 7가지 불변식 (v37 기준)

1. **deviceAdd 페이지에서 "등록" (NOT "등록안함") 클릭** — owner 권한 발급 핵심
2. **page.goto 가 bookingBusinessId 를 잃으면 안 됨** — v28 의 단순 reviewUrl 재진입 금지
3. **bookingBusinessId 는 Int 타입 (parseInt)** — String 보내면 schema validation fail
4. **createReply 호출은 page.evaluate(fetch)** — 외부 fetch 는 SmartPlace 가 차단 가능성
5. **referer URL = `/bizes/place/{internalId}/reviews?bookingBusinessId=...&menu=visitor`** — 내부 placeId 사용
6. ⭐ **createReply input.placeId = EXTERNAL placeId (m.place.naver.com 의 ID)** — 내부 ID 보내면 FORBIDDEN
7. ⭐ **replyResponseValid 만족 시 verify 결과 무시 — SUCCESS 인정** — silent reject 오판 방지

## 두 가지 placeId 명확히 구분

| 구분 | 용도 | 예시 (일산닭칼국수) |
|---|---|---|
| **internal placeId** (storeId) | URL/referer (`/bizes/place/{id}`) | `10441797` |
| **external placeId** (externalPlaceId) | GraphQL input.placeId | `1137287126` |

매장에 따라 둘이 같을 수도 있고 다를 수도 있음. 다른 매장(일산닭칼국수)에서 internal 보내면 FORBIDDEN.
**stores.naver_url 에서 외부 ID 자동 추출** (connect 페이지에서 사용자가 매장 등록 시 저장됨).

## 깨졌을 때 복구 절차

1. `worker/src/adapters/naver.ts` 의 `NAVER_CODE_VERSION` 확인 → `v37-verify-external-placeId-replyResponse-trust-20260503` 인지
2. Railway URL `/build-info` 호출 → versionValue 확인
3. v37 이 아닌 다른 버전이면, 위 7가지 불변식 모두 코드에서 살아있는지 점검:
   - deviceAdd 핸들러 우선순위가 "등록" (id="new.save") 인지
   - bookingBusinessId 자동 추출 로직이 살아있는지
   - createReply input.placeId 가 `externalPlaceId || storeId` 인지
   - bookingBusinessId 에 `parseInt(bookingBusinessId, 10)` 호출 있는지
   - in-page fetch 헤더에 x-csrf-token / apollographql-* / x-requested-with 있는지
   - **`replyResponseValid` 변수 검증으로 SUCCESS 인정하는지**
   - verify 호출 시 `placeIdForVerify = externalPlaceId || storeId` 인지
4. 깨졌으면 git history 에서 다음 커밋 참고:
   - `eda9139b` v37 (verify 외부 placeId + replyResponse trust) — **최종**
   - `fc75848e` v36 (createReply input.placeId 외부 ID)
   - `4f58ad11` v30 (bookingBusinessId Int 변환)
   - `68e800b8` v31 (page.goto 덮어쓰기 제거)

## 변경 시 의무 체크리스트 (PR 또는 push 전)

- [ ] `NAVER_CODE_VERSION` 상수 bump
- [ ] `railway.Dockerfile` build-marker 도 함께 bump (Railway 캐시 무효화)
- [ ] 위 7가지 불변식 모두 유지되는지 점검
- [ ] 테스트 — paaron + 일산닭칼국수 (가장 어려운 케이스) 답글 발행 시도
- [ ] 로그에 다음 모두 보이는지:
  - `naver: v36 외부 placeId 로드 완료` → `externalPlaceId: "1137287126"`
  - `naver: ✅ v34 bookingBusinessId 추출 성공`
  - `naver: v34 visited SmartPlace reviews page` → `viaSpaTab: true`
  - `naver: v36 createReply input (외부 placeId 사용)` → `externalPlaceIdUsed: true`
  - `naver: ✅ 답글 등록 성공 — createReply 응답 검증값 정상 (verify 생략)`
  - DB: `status: 'submitted'`
  - 비동기 후속: `naver: ✅ verify 통과 — 답글 인덱싱 확인`

## 회귀 발생 가능성 영역 (네이버 측 변동)

| 영역 | 변동 시 증상 | 대응 |
|---|---|---|
| deviceAdd 페이지 UI 변경 | "등록" 버튼 못 찾음 (id `new.save` 변경 시) | DUMP 로 새 selector 파악 후 핸들러 업데이트 |
| CAPTCHA 알고리즘 변경 | answer 부정확 | 2Captcha + Claude Vision 재훈련 |
| GraphQL schema 변경 | INTERNAL_SERVER_ERROR | 새 필드 추가 또는 type 변경 |
| 봇 탐지 강화 | 로그인 자체 차단 | UA, 마우스, 타이핑 humanlike 강화 |
| bookingBusinessId 추출 패턴 변경 | URL 에서 못 찾음 | DOM 기반 fallback 추가 |
| **placeId 체계 변경** | createReply FORBIDDEN | stores.naver_url 추출 패턴 업데이트 |
| **m.place.naver.com 인덱싱 지연 증가** | verify false negative 빈도↑ | replyResponseValid 검증값으로 SUCCESS 처리 (이미 v37 적용) |

## 부속 시스템 (v33 이상)

### 비번 변경 감지 (v33)
- `worker/src/lib/credentials.ts` 의 `classifyLoginFailure()` — 4가지 분류
  - `credentials_invalid` / `account_locked` / `captcha_required` / `unknown`
- `app/lib/platform-credentials.ts` 의 `listPlatformCredentialLabels()`
  - `needs_re_register`, `needs_attention` 플래그 노출
- `app/review-admin/naver/page.tsx` 의 `<CredentialsAlert />`
  - 빨간/주황 배너 자동 표시 + 1클릭 재등록

### 사용자 친화적 에러 메시지 (UI)
- `app/review-admin/components/PlatformReviewAdmin.tsx` 의 `makeFriendlyError()`
- 기술 정보 (placeId, NID_AUT, GraphQL) 노출 차단
- 7가지 분류 → 사장님이 이해할 수 있는 메시지로 변환

### Humanlike (v32, v33 약화)
- `addInitScript` 로 navigator.webdriver=false, plugins/languages stub
- viewport 미세 랜덤화 (1248~1311 × 868~963)
- 마우스 jitter (랜덤 좌표 8~20 steps)
- 타이핑 delay 변동 (70~120ms)
- humanDelay (action 사이 250~900ms 랜덤)

## 기여 이력 (14 iteration)

| 버전 | 핵심 변경 | 결과 |
|---|---|---|
| v16 | PC 도메인 + correct referer | FORBIDDEN |
| v17~v20 | deviceAdd 자동 통과 시도 | timing 이슈 |
| v21~v22 | DUMP + form-aware submit | 비-CAPTCHA 경로만 fix |
| v23 | getReviews fuzzy match + DOM fallback | 매핑 보강 |
| v24 | NID_AUT/NID_SES 검증 | 진단 추가 |
| v25 | post-CAPTCHA 핸들러 "등록" 우선 | 진짜 fix 자리 |
| v26 | anchor onclick + form-submit fallback | NID_AUT 발급 성공 |
| v27 | FORBIDDEN 시 owner 매장 진단 | placeId 검증 |
| v28 | in-page fetch (브라우저 컨텍스트) | 페이지 이동 버그 발견 |
| v29 | bookingBusinessId 자동 추출 | 핵심 ID 발견 |
| v30 | bookingBusinessId Int 변환 | type 에러 fix |
| v31 | v28 page.goto 덮어쓰기 제거 | 일부 매장 SUCCESS |
| v32 | humanlike (stealth + jitter + delay) | 봇 탐지 회피 |
| v33 | 비번 변경 감지 + 1클릭 재등록 | UX 개선 |
| v34 | SPA-friendly nav + CSRF/apollo 헤더 | SPA 검증 통과 |
| v35 | SPA prereq queries (me/persona) | 시도했으나 큰 영향 없음 |
| **v36** | **createReply input.placeId 외부 ID 사용 (cURL 분석으로 확정)** | 답글 진짜 등록됨 |
| **v37** | **replyResponseValid → verify 보조검증 강등 (silent reject 오판 fix)** | **✅ 모든 매장 SUCCESS** |

## 워커 데이터 흐름 다이어그램

```
[Vercel API: /api/review-reply/auto-publish]
        ↓ BullMQ enqueue
[Redis Queue: 'platform-jobs']
        ↓
[Railway Worker: worker-production-d024]
        ↓ runJob → naver_place:post_reply → runNaver()
        ↓
[Playwright Chromium + IPRoyal proxy + 2Captcha + Claude Vision]
        ↓ 로그인 + deviceAdd "등록"
[Naver SmartPlace SPA: new.smartplace.naver.com]
        ↓ /bizes/place/{internalId} 진입 → bookingBusinessId 추출
        ↓ reviews 탭 SPA click → cookies + csrf_token + JSESSIONID 캡처
        ↓ page.evaluate(fetch) GraphQL
[SmartPlace GraphQL: createReviewReply mutation]
        ↓ input: { placeId: EXTERNAL, bookingBusinessId: Int, reviewId, text }
        ↓ headers: x-csrf-token + apollographql-* + x-requested-with
[응답: reply.text + isQualified:true]
        ↓ replyResponseValid 검증
        ↓ 비동기: verifyReplyByGraphQL (m.place.naver.com pcmap-api, 외부 placeId)
[Supabase: platform_reviews.reply_status = 'submitted']
        ↓
[Vercel UI: /review-admin/naver → ✅ 등록 완료 표시]
```
