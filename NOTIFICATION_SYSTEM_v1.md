# 로컬루션 알림 시스템 — v1 작동 기준 (DO NOT BREAK)

> **🚨 절대 주의**: 사용자 명시 요청 전까지 이 시스템 변경 금지.
> 다른 플랫폼 (배민/쿠팡이츠/요기요/구글/카카오맵) 작업 시 이 문서의 "충돌 방지 규칙" 반드시 확인.

## 작동 검증 시점

- **날짜**: 2026-05-03
- **테스트**: jty0221 계정 / 일산닭칼국수 부천점
  - 카카오톡 알림 ✅ 본인 카톡 도착
  - Web Push 알림 ✅ 브라우저 OS 알림 도착
  - 별점 0~5 옵션 모두 정상
- **DB**: Supabase 마이그레이션 3개 모두 적용 완료
- **인프라**: Vercel Pro Cron 매 15분, Web Push (web-push npm), Kakao SendMe API

## 핵심 흐름

```
[Vercel Cron 매 15분] /api/cron/naver-reviews-fetch
   ↓ platform_credentials + place_targets 합집합
   ↓ fetchVisitorReviews() → platform_reviews UPSERT
   ↓ ⭐ triggerReviewNotifications() (새 리뷰만)
   ↓
[user_notification_prefs 로드]
   ↓ 별점 ≤ low_rating_threshold 이면 review_alerts_enabled 무시 → 강제 발송
   ↓ 일반 별점은 review_alerts_enabled 따름
   ↓
[채널별 발송 — 활성 채널 모두]
   ├ channel_web_push + web_push_subscription → web-push.sendNotification
   ├ channel_kakao_talk → sendMemoForUser (kakao_tokens 자체 토큰 + auto refresh)
   └ channel_email → (Phase 4 예정)
   ↓
[notification_log 기록] (unique index 로 중복 발송 차단)
   ↓
[브라우저 / 카카오톡 / 이메일] 사장님이 알림 받음
```

## 핵심 파일/폴더 (절대 깨지면 안 됨)

| 영역 | 파일 | 역할 |
|---|---|---|
| **Cron 설정** | `vercel.json` | naver-reviews-fetch + delivery-reviews-fetch 매 15분 |
| **Cron Hook** | `app/api/cron/naver-reviews-fetch/route.ts` | 새 리뷰 upsert 후 triggerReviewNotifications 호출 |
| **알림 트리거** | `app/lib/notifications-trigger.ts` | 별점 우선순위 + 채널 분기 + 발송 + log |
| **설정 API** | `app/api/notify/prefs/route.ts` | GET/POST 사용자 알림 설정 |
| **카카오 상태** | `app/api/notify/kakao-status/route.ts` | kakao_tokens 연결 여부 + scope 확인 |
| **카카오 OAuth** | `app/api/auth/kakao/start/route.ts` + `/callback/route.ts` | talk_message scope, returnTo=/settings 면 channel_kakao_talk 자동 ON |
| **Web Push 구독** | `app/api/notify/web-push-subscribe/route.ts` | PushSubscription 저장/해제 |
| **VAPID Public** | `app/api/notify/vapid-public/route.ts` | 브라우저 구독용 public key 노출 |
| **테스트 발송** | `app/api/notify/test/route.ts` | toggle 무시 + 가능한 채널 모두 시도 (성공 시 자동 ON) |
| **Service Worker** | `public/sw-push.js` | push 이벤트 → OS 알림 표시 + 클릭 → 페이지 이동 |
| **설정 UI** | `app/settings/page.tsx` `NotifyTab` + `NotifyTestButton` | 토글 즉시 저장, 6단계 진단 |
| **Kakao 라이브러리** | `app/lib/kakao-api.ts` | sendMemoForUser (auto refresh) — 변경 금지 |

## DB 스키마 (3개 마이그레이션 적용)

```
user_notification_prefs (user_id text PK)
  - review_alerts_enabled, customer_alerts_enabled, report_alerts_enabled (bool)
  - low_rating_force_alert (bool), low_rating_threshold (smallint 0~5)
  - channel_web_push, channel_kakao_talk, channel_email (bool)
  - web_push_subscription (jsonb)
  - RLS: disabled (service role API 만 접근)

notification_log (id bigserial PK)
  - user_id (text), kind (text), channel (text), ref_id (text), payload (jsonb), status, sent_at
  - unique index (user_id, kind, ref_id, channel) where ref_id is not null  ← 중복 차단
  - RLS: disabled

kakao_tokens (별도, 기존)
  - user_id, access_token, refresh_token, expires_at, scope
  - sendMemoForUser 가 자동 refresh
```

## 절대 깨지면 안 되는 7가지 불변식

1. **vercel.json cron schedule = `*/15 * * * *`** — 5분 미만 금지 (네이버 차단), 30분 이상 금지 (실시간 체감 ↓)
2. **triggerReviewNotifications 호출 위치 = 새 리뷰 upsert 직후** — 다른 곳에서 호출 시 중복 발송 위험
3. **별점 우선순위 로직** = `rating <= threshold` 면 강제 발송 (review_alerts_enabled 무시)
4. **notification_log unique index** — 같은 (user_id, kind, ref_id, channel) 한 번만 발송
5. **카카오 OAuth callback returnTo=/settings 자동 ON** — 사용자 동의 = 받겠다는 의도
6. **테스트 발송 endpoint = toggle 무시** — 인프라(kakao_tokens / web_push_subscription)만 있으면 발송 + 성공 시 자동 ON
7. **user_id = text 타입** — uuid 가정 금지 (이 프로젝트는 nanoid 식별자)

## 사용자 설정 흐름 (UI/UX)

```
/settings → "알림" 탭
  ├ 알림 받을 항목 (3개 토글)
  │   ├ 새 리뷰 알림 ✓
  │   ├ 신규 고객 알림 ✓
  │   └ 주간 리포트 알림
  ├ ⚠️ 낮은 별점 강제 알림 (위 토글 끄도 발송)
  │   └ 별점 6 옵션: 0/1/2/3/4/5점 이하 (기본 3점 이하)
  ├ 알림 받을 방식
  │   ├ 🔔 로컬루션 브라우저 알림 → [켜기] → 6단계 진단 → 권한 허용 → 자동 구독
  │   ├ 💬 카카오톡 알림 → [카카오 연결] → OAuth → 자동 ON
  │   └ 📧 이메일 알림 (Phase 4)
  └ 🧪 테스트 발송 → 활성 채널 모두 즉시 발송
```

## 변경 시 의무 체크리스트

- [ ] 7가지 불변식 모두 유지되는지 점검
- [ ] vercel.json 의 다른 cron 건드리지 않았는지
- [ ] 다른 플랫폼 cron route (delivery-reviews-fetch, blog-tracking-* 등) 의 알림 호출과 충돌 없는지
- [ ] notifications-trigger.ts 의 sendViaChannel 시그니처 (svc, prefs, review, channel, msg) 그대로
- [ ] notification_log 의 unique index 보존
- [ ] 테스트:
  - settings 에서 [테스트 발송] → 카카오 + Web Push 둘 다 도착
  - 새 리뷰 만들어 cron 트리거 → 자동 알림 도착
  - 별점 1점 리뷰 + 알림 토글 OFF 상태 → 그래도 강제 발송 도착

---

## 🚨 다른 플랫폼 작업 시 충돌 방지 규칙 (가장 중요)

### 배민/쿠팡이츠/요기요 (delivery-reviews-fetch cron)

`app/api/cron/delivery-reviews-fetch/route.ts` 도 매 15분 실행 — 여기서도 새 리뷰 발견 시 **알림 발송하려면 동일 패턴 사용**:

```typescript
// 새 리뷰 upsert 직후
import { triggerReviewNotifications } from '@/app/lib/notifications-trigger'

if (Array.isArray(upData) && upData.length > 0) {
  const newReviewIds = new Set(upData.map(r => r.platform_review_id).filter(Boolean))
  const newReviews = rows.filter(r => newReviewIds.has(r.platform_review_id))
  await triggerReviewNotifications(svc, t.user_id, newReviews).catch(...)
}
```

**절대 다른 알림 시스템 만들지 마시오** — 같은 함수 재사용.

### 구글/카카오맵 작업 시

새 cron route 추가 시 같은 패턴:
1. `vercel.json` 에 `*/15 * * * *` (또는 차단 위험 있으면 `*/30`)
2. cron route 안에서 새 리뷰 upsert 후 `triggerReviewNotifications` 호출
3. **별도 알림 큐/테이블 만들지 마시오** — `notification_log` 그대로 사용

### 새 어댑터 (worker/) 작업 시

worker 측은 알림 시스템과 직접 무관 — 단순히 답글 등록만. 알림은 cron route (Vercel) 가 담당.

**worker/src/adapters/{platform}.ts** 작업할 때 절대 알림 시스템 (`app/lib/notifications-trigger.ts` 등) 건드리지 마시오.

### 새 알림 종류 추가 (예: 결제 알림, 매장 통계)

같은 패턴:
1. `notifications-trigger.ts` 에 새 helper 함수 추가 (예: `triggerPaymentNotification`)
2. `kind` 값을 새로 정의 (예: `'payment_due_7d'`)
3. `notification_log` unique index 활용 (중복 차단 자동)
4. 채널별 발송 로직은 `sendViaChannel` 그대로 재사용

---

## 학습 사항 — 이번 작업의 함정 (재발 방지)

### 1. 잘못된 가정 — `user_id` 타입 (가장 큰 실수)

**오류**: `user_id uuid references auth.users(id)` 로 schema 만들었는데 실제는 nanoid 형식 (`JCuzz7F-HjPx...`)
**증상**: `invalid input syntax for type uuid`
**교훈**: 새 테이블 만들기 전에 **기존 테이블 (platform_credentials, kakao_tokens) 의 user_id 타입 먼저 확인**. Supabase 프로젝트라고 무조건 auth.users 가 아님.
**Fix**: `alter column user_id type text` + RLS disable

### 2. 빌드 race condition — railway.Dockerfile build-marker

**오류**: 다른 채팅이 쿠팡이츠 작업하면서 `coupangeats.ts:583` 에 `status` 필드 누락 → tsc 실패 → naver v36 push 도 빌드 실패 (전체 빌드 fail)
**교훈**: tsc 는 모든 .ts 파일 컴파일 — **한 파일 에러 = 전체 빌드 실패**. 다른 채팅 작업과 동시 진행 시 빌드 상태 확인 필수.
**Fix**: railway.Dockerfile 에서 `grep -c marker` 검증 제거 (race fail 방지)

### 3. 잘못된 결론 — "owner 가 아니다" 단정

**오류**: paaron + 일산닭칼국수가 FORBIDDEN 받았을 때 "owner 권한 없다" 라고 잘못 단정 → 사용자가 "이전엔 잘 됐다" 알려줌
**교훈**: 같은 코드로 다른 매장은 성공인데 한 매장만 실패하면 **서버 측 차단 / 추가 검증 누락** 가능성 우선 고려. owner 권한 결론은 마지막에.
**Fix**: cURL 분석으로 외부 placeId 분리 발견 (v36 결정적 fix)

### 4. verify 함수 false negative

**오류**: createReply 가 명백히 성공 응답 (reply.text + isQualified:true) 줬는데 verify 가 인덱싱 지연으로 실패 → silent reject 오판 → DB failed 마킹
**교훈**: verify 는 **보조 검증** — 응답값이 명백하면 SUCCESS 인정. verify 결과만으로 SUCCESS 부정 금지.
**Fix**: v37 `replyResponseValid` 체크 추가

### 5. humanlike 과도한 변경

**오류**: 글자별 `type(ch, {delay})` loop 으로 humanlike 강화 → 입력 누락/오타 발생 → 로그인 자체 실패
**교훈**: humanlike 는 **약하게**. Playwright `type()` 자체가 이미 글자별 delay 처리. loop 으로 감싸면 IME / React state 충돌 가능.
**Fix**: v33 single `type()` + delay 변동 으로 회귀

### 6. UI 상태 stale — kakao OAuth 후 자동 활성화 누락

**오류**: 사용자가 카카오 OAuth 동의 후 settings 돌아왔는데 channel_kakao_talk=false 그대로 → 알림 안 옴
**교훈**: OAuth 동의는 **알림 받겠다는 의도** — callback 에서 자동 ON 처리.
**Fix**: callback 에서 returnTo=/settings 면 channel_kakao_talk=true upsert

### 7. settings UI 의 silent fail (toast)

**오류**: enableWebPush 가 toast() 만 호출 → 사용자가 결과 못 봄 → "클릭 안 된다" 오해
**교훈**: 중요 동작은 **inline 결과 표시 + busy state**. toast 는 보조용.
**Fix**: 6단계 진단 + 박스 안 ✅/⚠️ 결과 노출

### 8. 빌드 검증 누락

**오류**: github push 후 즉시 라이브 가정 → 실제로 빌드 실패한 적 있음
**교훈**: push 후 **build-info endpoint 또는 deployment 상태 확인**. 사용자에게 "라이브" 라고 말하기 전.

### 9. 다른 채팅이 build-marker 변경

**오류**: 다른 채팅이 railway.Dockerfile build-marker 를 v28 → v29 로 되돌려놓음 → 캐시 hit 으로 v36 코드 안 들어감
**교훈**: build-marker 는 작업 단위로 unique 하게. 다른 채팅 작업 후 본인 push 시 build-marker 본인 작업명으로 다시 bump.

### 10. Supabase RLS 와 자체 인증 시스템 충돌

**오류**: RLS 정책에 `auth.uid()` 사용 → 자체 nanoid 시스템과 호환 안 됨
**교훈**: 이 프로젝트는 **service role API 통한 접근만** — RLS 비활성화 + API 측에서 user_id 검증. auth.uid() 사용 금지.

---

## 복구 절차 (시스템이 깨졌을 때)

### Phase A — 먼저 라이브 상태 확인

1. `https://www.localution.co.kr/api/notify/vapid-public` → `{ok:true, publicKey:...}` 인지
2. `https://www.localution.co.kr/api/notify/prefs` (로그인 상태) → 본인 prefs 반환
3. `/settings` → 알림 탭 → [테스트 발송] → 카카오 + Web Push 결과 확인

### Phase B — 깨진 곳 식별

- 카카오 실패 → kakao_tokens 테이블 row 확인 + scope 에 talk_message
- Web Push 실패 → web_push_subscription jsonb 확인 + VAPID 4개 환경변수
- 알림 자체 안 옴 → notification_log 테이블 최근 row + cron 마지막 실행 시각

### Phase C — 위 7가지 불변식 코드에서 모두 확인

깨진 게 있으면 git history 에서 다음 커밋 참고:
- `b35c0279` Phase 3 KakaoTalk + 별점 0~5
- `4b4bd720` Phase 2 Web Push 구현
- `f35a9224` Phase 1 cron 15분 + trigger hook
- `8fc670d6` user_id text 타입 fix

### Phase D — DB 마이그레이션 재확인

- `2026_05_03_notification_prefs.sql` (테이블 생성)
- `2026_05_03_threshold_zero.sql` (별점 0 옵션)
- `2026_05_03_user_id_text.sql` (uuid → text)

세 파일 모두 적용됐는지 확인. 누락 시 순서대로 재실행.

---

## 기여 이력

| 단계 | 작업 |
|---|---|
| Phase 1 | cron 15분 + DB schema + trigger hook (별점 우선순위) |
| Phase 2 | Web Push 구현 + settings UI + Service Worker |
| Phase 3 | KakaoTalk + 별점 0~5 + 카카오 OAuth 자동 활성화 |
| Bonus | ScrollToTop floating 버튼 + ReviewPollingToast |
| Fix | user_id text 타입 + 테스트 발송 toggle 무시 + Web Push 6단계 진단 |
