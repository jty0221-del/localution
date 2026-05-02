# 네이버 SmartPlace 답글 자동등록 시스템 — v31 작동 기준 (DO NOT BREAK)

> **🚨 절대 주의**: 이 문서는 v31 에서 처음 정상 작동한 답글 등록 시스템의 핵심 흐름과 보호 영역을 정의합니다.
> 12회 iteration 끝에 완성됐으니 **함부로 변경하면 다시 처음부터 디버깅해야 합니다**.

## 작동 검증 시점

- **날짜**: 2026-05-02
- **테스트 매장**: 소금정원 강화점 (placeId=10187358, bookingBusinessId=1280925)
- **JobId**: 473 SUCCESS
- **deployment**: `8837686c-e482-443f-bb84-84fb47e27442`
- **NAVER_CODE_VERSION**: `v31-no-overwrite-correctURL-20260502`

## 핵심 6 단계 흐름 — 한 단계라도 깨지면 FORBIDDEN

```
1. 네이버 로그인 (ID/PW + CAPTCHA 자동 풀이 + deviceAdd "등록" 클릭)
        ↓
2. NID_AUT/NID_SES 정상 발급 (csrf_token + JSESSIONID + neoidLoginSession 동반)
        ↓
3. SmartPlace /bizes 메인 진입 → 매장 카드 클릭 → SPA hydration
        ↓
4. URL 에서 bookingBusinessId 자동 추출 (정규식 /bookingBusinessId=(\d+)/)
   ⚠️ 추출 실패 시 fallback: /bizes/place/{placeId} 직접 진입
        ↓
5. 정식 owner URL 로 이동:
   /bizes/place/{placeId}/reviews?bookingBusinessId={bid}&menu=visitor
   ⚠️ 이 URL 을 절대 다른 page.goto 로 덮어쓰면 안 됨 (v28 버그 → v31 fix)
        ↓
6. page.evaluate(fetch) 로 GraphQL createReply 호출
   - input.placeId: String (예: "10187358")
   - input.reviewId: String (24-char hex)
   - input.bookingBusinessId: Int (parseInt 변환 필수, "1289786" 보내면 INTERNAL_SERVER_ERROR)
   - input.text: 답글 내용
```

## 핵심 코드 위치 (worker/src/adapters/naver.ts)

| 영역 | 라인 | 절대 변경 금지 사유 |
|---|---|---|
| `NAVER_CODE_VERSION` 상수 | 16 | 버전 추적, 변경 시 build-info 검증 끊김 |
| 새기기 deviceAdd 핸들러 (CAPTCHA 후) | ~770~830 | "등록" 우선 클릭, "등록안함" 누르면 NID_AUT 미발급 |
| bookingBusinessId 자동 추출 | ~978~1005 | 매장 카드 클릭 + place 직접 진입 fallback |
| 정식 reviews URL 진입 | ~1006~1015 | bookingBusinessId 포함 URL 절대 유지 |
| postNaverReply의 in-page fetch | ~1280~1330 | page.evaluate 으로 브라우저 컨텍스트 사용 |
| createReply input | ~1286~1290 | bookingBusinessId Int 변환 필수 |

## 절대 깨지면 안 되는 5가지 불변식

1. **deviceAdd 페이지에서 "등록" (NOT "등록안함") 클릭** — owner 권한 발급 핵심
2. **page.goto 가 bookingBusinessId 를 잃으면 안 됨** — v28 의 단순 reviewUrl 재진입 금지
3. **bookingBusinessId 는 Int 타입 (parseInt)** — String 보내면 schema validation fail
4. **createReply 호출은 page.evaluate(fetch)** — 외부 fetch 는 SmartPlace 가 차단 가능성
5. **referer URL = `?bookingBusinessId=XXX&menu=visitor`** — 정확한 owner 흐름

## 깨졌을 때 복구 절차

1. `worker/src/adapters/naver.ts` 의 `NAVER_CODE_VERSION` 상수 확인 → `v31-no-overwrite-correctURL-20260502` 인지
2. Railway URL `https://worker-production-d024.up.railway.app/build-info` 호출 → versionValue 확인
3. v31 이 아닌 다른 버전이면, **이 문서의 핵심 흐름과 일치하는지 코드 검증**:
   - deviceAdd 핸들러 우선순위가 "등록" 인지 (line 778~785)
   - bookingBusinessId 자동 추출 로직이 살아있는지
   - createReply input 에 `parseInt(bookingBusinessId, 10)` 호출 있는지
   - `page.goto(reviewUrl)` 로 URL 덮어쓰기가 부활했는지 (NO 여야 함)
4. 깨졌으면 git history 에서 `4f58ad11` (v30) → `68e800b8` (v31) 커밋 참고

## 변경 시 의무 체크리스트 (PR 또는 push 전)

- [ ] NAVER_CODE_VERSION 상수 bump
- [ ] 위 5가지 불변식 모두 유지되는지 점검
- [ ] 테스트: 답글 발행 시도 → log 에 다음 모두 보이는지
  - `naver: ✅ v29 bookingBusinessId 추출 성공`
  - `naver: v30 createReply input (bookingBusinessId as Int)`
  - `naver: v31 GraphQL 직전 URL 검증` → `hasBookingBusinessIdInUrl: true`
  - `naver: ✅ 답글 등록 성공 (GraphQL 직접 호출)`
  - `naver: ✅ verify 통과`

## 회귀 발생 가능성 영역 (네이버 측 변동)

| 영역 | 변동 시 증상 | 대응 |
|---|---|---|
| deviceAdd 페이지 UI 변경 | "등록" 버튼 못 찾음 | dump 로 새 selector 파악 후 핸들러 업데이트 |
| CAPTCHA 알고리즘 변경 | answer 부정확 | 2Captcha + Claude Vision 재훈련 |
| GraphQL schema 변경 | INTERNAL_SERVER_ERROR | 새 필드 추가 또는 type 변경 |
| 봇 탐지 강화 | 로그인 자체 차단 | UA, 마우스, 타이핑 humanlike 강화 |
| bookingBusinessId 추출 패턴 변경 | URL 에서 못 찾음 | DOM 기반 fallback 추가 |

## 기여 이력 (12회 iteration)

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
| **v31** | **v28 page.goto 덮어쓰기 버그 제거** | **✅ SUCCESS** |
