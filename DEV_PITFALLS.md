# 개발 작업 시 실수 재방지 체크리스트

> 2026-04-18 기준 — 지금까지 발생한 실제 실수와 재발 방지 규칙

---

## 🚨 치명적 실수 #1 — `'use client'` 지시문 쪼개짐

### 발생한 일
- 커밋 `1b71031 feat(qr-admin): 저장/네이버 연동 시 Supabase stores 테이블에 자동 등록`
- sed / 단순 문자열 치환으로 `'use client'` 다음 위치에 async function을 삽입하다가 `'u` + `se client'`로 문자열이 쪼개짐
- 결과: 8시간 동안 Vercel 배포가 전부 실패했고, 이후 푸시한 30개 커밋이 라이브에 하나도 반영되지 않음
- 사용자가 아침에 깨어나 확인했을 때 "제대로 된 게 별로 없다"고 보게 된 근본 원인

### 규칙
1. **`.tsx` / `.ts` 파일을 문자열 치환으로 수정할 때, `'use client'` / `'use server'` / `"use client"` 같은 directive 문자열 경계를 절대 건드리지 않는다.**
2. sed/awk 대신 **반드시 `Read` + `Edit` 툴 조합**을 쓴다. Edit는 기존 내용이 정확히 존재할 때만 치환하므로 부분 치환 사고가 원천 차단된다.
3. 같은 파일을 두 번 이상 수정할 때는 **매번 다시 `Read`**로 불러와 현 상태를 확인한 뒤 Edit한다.
4. **패치 직후 반드시 파일 맨 앞 5줄을 `sed -n '1,5p'` 혹은 Read로 검증**한다. 특히 `'use client'`로 시작해야 하는 파일.

### 자동 검증 스니펫
```bash
# 주요 클라이언트 페이지들이 모두 'use client'로 시작하는지 확인
for f in app/qr-admin/page.tsx app/review/*/page.tsx app/customers/page.tsx app/marketing/*/page.tsx app/pricing/page.tsx app/community/page.tsx app/inquiry/page.tsx app/dashboard/page.tsx app/page.tsx; do
  head -1 "$f" | grep -q "'use client'" || echo "FAIL: $f"
done
```

---

## 🚨 치명적 실수 #2 — 빌드 검증 없이 연속 푸시

### 발생한 일
- 파일 한 개가 깨진 상태에서 30개 이상 커밋을 연속 푸시
- Vercel 빌드가 "Error Stale" 상태로 계속 남아도 확인을 안 함
- 결과: 모든 후속 작업이 헛수고

### 규칙
1. **큰 변경 후 푸시한 뒤에는 반드시 Vercel 배포 상태를 확인**한다 (GitHub Actions API 또는 Vercel API).
2. **빌드 실패가 감지되면 즉시 중단하고 원인부터 고친다.** 추가 커밋 금지.
3. 하나의 세션에서 연속 패치할 때, **10개 커밋마다 한 번씩 배포 상태 체크**.

### 배포 상태 확인 명령
```bash
# 가장 최근 main 커밋 3개 + GitHub check runs
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "User-Agent: cl" \
  "https://api.github.com/repos/jty0221-del/localution/commits/main/check-runs" \
  | python3 -c "import json,sys; j=json.load(sys.stdin); [print(r['name'], r['status'], r['conclusion']) for r in j['check_runs'][:5]]"
```

---

## ⚠️ 실수 #3 — 루트 `/` 자동 리다이렉트

### 발생한 일
- `app/page.tsx`가 `sessionStorage.getItem('localution_user')`만 보고 서버 검증 없이 `/dashboard`로 강제 이동
- 세션 쿠키가 만료돼도 sessionStorage에 남아있으면 → `/` → `/dashboard` → (미들웨어) → `/login` 체인
- 사용자가 "루트가 로그인 페이지로 튄다"고 보고

### 규칙
1. **클라이언트 캐시(localStorage/sessionStorage)를 서버 인증의 대체물로 쓰지 않는다.**
2. 랜딩 페이지는 **로그인 여부에 상관없이 그대로 랜딩을 보여준다**. 로그인된 사용자는 TopNav의 "대시보드" 버튼으로 이동하는 게 표준 UX (토스, 카카오, 구글).
3. 자동 리다이렉트가 꼭 필요하면 `'/api/me'` 응답이 200인 경우에만 수행.

---

## ⚠️ 실수 #4 — 이전 사용자 입력과 DB 스키마 불일치

### 발생한 일
- `create table stores if not exists (id uuid primary key)` 만 쓰고 `slug` 컬럼이 누락된 SQL을 실행
- 이후 `insert` 쿼리가 "column 'slug' does not exist" 에러

### 규칙
1. Supabase 마이그레이션은 **`alter table add column if not exists` 방식**으로 쓴다.
2. 실행 전 먼저 `information_schema.columns`로 현재 스키마를 조회해 확인.
3. 실행 후 `select column_name, data_type from information_schema.columns where table_name='stores' order by ordinal_position;` 로 최종 검증.

---

## ⚠️ 실수 #5 — 백틱 이스케이프

### 발생한 일
- 스크립트의 template literal을 파일에 복사할 때 `` \` `` 형태로 이스케이프된 상태로 저장됨
- Node가 line 250에서 SyntaxError

### 규칙
1. JS 파일을 다른 파일에서 복사 저장할 때 **bash heredoc(`<<'EOF'`)는 단일 인용 버전을 쓴다** — 그래야 내부 `$`, `` ` `` 이 치환되지 않음.
2. 복사 직후 **`node --check <file>` 으로 문법 검증**한다.

---

## ⚠️ 실수 #6 — 환경 변수 가정

### 발생한 일
- `GITHUB_OWNER=jty0221` 기본값이 실제 `jty0221-del`과 달라서 404 반복
- `ANTHROPIC_API_KEY`가 Vercel에 없으면 릴스 생성기가 의미 없음

### 규칙
1. **기본값을 추측하지 않는다.** 스크립트 시작 시 `.env.local` 또는 환경변수를 명시적으로 로드하고, 비어 있으면 즉시 에러.
2. 새 기능이 외부 API 키를 요구하면 **배포 전 Vercel 대시보드에 키 추가됐는지 사용자 확인을 반드시 받는다.**

---

## ✅ 작업 전 체크리스트 (매번 실행)

- [ ] 패치할 파일을 Read로 먼저 전체 확인
- [ ] Edit로 치환 (sed/awk 금지)
- [ ] 패치 직후 파일 맨 앞 5줄 재확인 (`'use client'` 등 directive)
- [ ] 푸시 전 Node로 문법 체크 (`node --check` — .tsx는 건너뜀)
- [ ] 푸시 후 Vercel 빌드 로그 확인
- [ ] 10커밋마다 라이브 배포 실제 확인 (시크릿창 진입)

---

## 🩺 긴급 복구 절차 (빌드가 깨졌을 때)

1. Vercel Deployments 페이지에서 실패 원인 로그 확인
2. 로그에 표시된 파일 경로 + 줄 번호를 그대로 읽기 (`app/xxx/page.tsx:31:1`)
3. `ghget.js`로 해당 파일 원본 다시 fetch
4. 파일 맨 앞·뒤·문제 줄 주변 5줄을 Read로 직접 눈으로 확인
5. Edit로 최소한의 수정 → 푸시 → 빌드 확인
6. 성공 확인 후에야 다른 작업 재개

---

## 🎨 lucide-react 아이콘 버전 호환성 (2026-04-18 기록)

**증상**: Vercel 빌드 시 `Attempted import error: 'X' is not exported from lucide-react` + 런타임 `Element type is invalid: ... got: undefined`

**원인**: `package.json`에 `lucide-react: ^0.263.1`로 고정 → 캐럿(^)은 `0.x.x` 범위만 허용하므로 `0.264+` 신규 아이콘은 전부 `undefined`로 import됨

**0.263.1에 없는 주요 아이콘**:
- `Handshake` (0.344+)
- `MessageSquareHeart` (0.309+)
- `HeartHandshake` (0.309+)
- `Sidebar` / `SidebarClose` / `SidebarOpen` (0.309+)

**대체 아이콘** (0.263.1 호환):
- `Handshake` → `UserPlus` / `Users` / `Heart`
- `MessageSquareHeart` → `MessageCircle` / `MessageSquare`
- `ChefHat` / `Rocket` / `Wallet` / `Bot` / `Smile` / `Meh` / `Frown` → 모두 0.263에 존재 OK

**새 아이콘 사용 전 체크**:
```bash
# /tmp/luc263에서 미리 확인
for icon in Handshake Rocket Bot; do
  kebab=$(echo "$icon" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')
  test -f /tmp/luc263/node_modules/lucide-react/dist/esm/icons/${kebab}.mjs && echo OK:$icon || echo MISS:$icon
done
```

**근본 해결**: `package.json`에서 `lucide-react: ^0.400.0` 또는 `latest`로 업그레이드. (단, tree-shaking 영향 + 빌드 시간 증가 가능)

---

## 🚨 실수 #7 — Railway Worker용 Supabase URL과 Vercel의 Supabase URL이 다름 (2026-04-27)

### 발생한 일
- Vercel은 `NEXT_PUBLIC_SUPABASE_URL` 사용 → `https://xxx.supabase.co`
- Railway Worker는 `SUPABASE_URL` 사용 → `https://agmjplxyviyaspnokbjs.supabase.co`
- `naver_session_cookies` 테이블이 Vercel 프로젝트 DB에는 있었지만 Railway Worker DB에는 없었음
- Worker가 쿠키 테이블을 못 읽어 `hasCookieData: false` → 로그인 실패

### 규칙
1. **Worker와 Vercel이 같은 Supabase 인스턴스를 쓰는지 Railway Variables 탭에서 `SUPABASE_URL`을 확인**
2. Worker가 접근하는 테이블은 반드시 Railway Variables의 `SUPABASE_URL` 인스턴스에 있어야 함
3. 새 테이블/컬럼 추가 시 → 어느 Supabase 인스턴스에 추가하는지 명시
4. **Worker ↔ Vercel 공통 데이터는 `platform_credentials` 테이블 활용** (이미 양쪽 다 접근 확인된 테이블)

### 현재 정답 구조
- Worker가 확실히 읽는 테이블: `platform_credentials`, `platform_reviews`
- 쿠키 저장: `platform_credentials.extra_data.naver_session_cookie` (JSON 문자열)
- 쿠키 읽기: `loadCookieData()` → `extra_data.naver_session_cookie` 1순위, `naver_session_cookies` 테이블 2순위(fallback)

---

## 🚨 실수 #8 — Railway Worker TypeScript 빌드 에러 (2026-04-27)

### 발생한 일
- `evaluateHandle().then(h => h?.asElement?.())` 패턴 사용 → TypeScript 타입 에러로 Railway 빌드 실패
- `??` 연산자 오른쪽에 `await` + 복잡한 체이닝 → 컴파일러가 처리 못함

### 규칙
1. **Railway Worker TypeScript 코드에서 `evaluateHandle` + `asElement` 패턴 사용 금지**
2. Playwright에서 요소 찾기는 `page.$()`, `page.$$()`, `page.$('text=...')` 기본 메서드만 사용
3. `??` 체이닝은 단순하게 — `await A ?? await B ?? await C` 형태로 분리
4. Worker 배포 후 Railway 빌드 로그 "Build › Build image" 반드시 확인 (실패 시 24초 만에 종료됨)

---

## ⚠️ 실수 #9 — platform_reviews 테이블에 없는 컬럼 업데이트 시도 (2026-04-27)

### 발생한 일
- Worker `updateReviewStatus()`에서 `reply_content` 컬럼이 없는데 update payload에 포함
- `PGRST204: Could not find the 'reply_content' column` 에러
- 답글은 SmartPlace에 등록됐지만 DB 상태(`reply_status`)가 `submitted`로 업데이트 안 됨

### 규칙
1. **Worker에서 Supabase update 시 실제 존재하는 컬럼만 포함**
2. `platform_reviews` 현재 컬럼 목록:
   - `reply_status` ('none'|'draft'|'queued'|'submitting'|'submitted'|'failed')
   - `reply_error` (text, 200자 제한)
   - `has_reply` (boolean)
   - `reply_submitted_at` (timestamptz)
   - `reply_queued_at` (timestamptz)
   - `draft_reply` (text) — 초안 내용
   - `reply_tone` (text)
   - ❌ `reply_content` — 존재하지 않음, 사용 금지
3. 새 컬럼이 필요하면 Supabase SQL Editor에서 먼저 추가하고 Worker 코드 수정

---

## ✅ 네이버 스마트플레이스 자동답글 완성 구조 (2026-04-27 기준)

### 전체 흐름
```
사용자 "자동발행" 클릭
→ POST /api/review-reply/auto-publish
→ Supabase platform_reviews.reply_status = 'queued'
→ BullMQ 큐(platform-jobs) 에 job 추가 (payload: user_id, platform_review_id, reply_text, biz_id)
→ Railway Worker 처리
  1. loadCookieData() → platform_credentials.extra_data.naver_session_cookie
  2. Playwright context.addCookies() → SmartPlace 직접 이동으로 로그인 확인
  3. 로그인 실패 시 → 폼 로그인 폴백 (Railway IP 차단 있으면 실패)
  4. /bizes/place/{bizId} 이동 → actualPlaceId 추출
  5. /bizes/place/{actualPlaceId}/reviews 이동 (명시적 리뷰 페이지)
  6. 리뷰 카드 탐색 → "첫 번째 미답변 카드" 선택
  7. "답글 달기" 버튼 클릭 → textarea 입력 → "등록" 클릭
  8. updateReviewStatus() → reply_status='submitted', has_reply=true
→ UI 자동 갱신: "✅ 등록 완료" 뱃지 + 답글 내용 표시
```

### 핵심 설정값
- `bizId`: `10441797` (일산닭칼국수 부천점) — `platform_credentials.platform_store_id`에 저장
- `actualPlaceId`: `10441797` (이 매장은 리다이렉트 없음)
- 쿠키 저장 경로: `/my/platforms/naver_place/session`
- 쿠키 형식: NID_AUT + NID_SES 포함 Cookie 헤더 문자열 붙여넣기 → 자동 파싱

### SmartPlace 선택자 (2026-04-27 확인)
```typescript
reviewCard:    '[class*="Review_single_review"], [class*="Review_container"], ...'
replyButton:   'button:has-text("답글 달기"), button:has-text("답글")'
replyTextarea: 'textarea[placeholder*="답글"], ...'
replySubmit:   'button:has-text("등록"), button:has-text("완료")'
```

### 멀티유저 지원
- 완전 지원. 각 유저별 `user_id`로 `platform_credentials` 개별 저장
- 모든 네이버 플레이스 등록 업종 지원 (음식점 외 카페, 미용실, 병원 등)
- 새 유저 설정: 네이버 계정 연결 → `/my/platforms/naver_place/session` 쿠키 저장 → 사용 가능

### 알려진 한계
- 리뷰 카드를 `platformReviewId`로 정확히 매칭 못함 (SmartPlace DOM에 data-review-id 없음)
- 현재: "첫 번째 미답변 카드" 방식 → 큐에 하나씩 순서대로 넣으면 실제 사용에 문제 없음
- 쿠키 만료 주기: 약 2주 → 주기적 갱신 필요

---

## ✅ reply_status 처리 규칙 (2026-04-27 기준)

### UI에서 "답변완료" 판정 조건
```typescript
// Worker가 has_reply=true를 못 설정했어도 submitted이면 완료 처리
const isReplied = r.has_reply || r.reply_status === 'submitted'
```

### 미답변 카운트 계산 (모든 위치에서 동일하게 적용)
```typescript
// app/api/stores/me/route.ts
const isReplied = r.has_reply || r.reply_status === 'submitted'
if (!isReplied) slot.unreplied_count += 1

// app/api/place/reviews/route.ts
summary.unreplied_count = all.filter((r) => !r.has_reply && r.reply_status !== 'submitted').length

// app/dashboard/page.tsx
const isReplied = (r: RealReview) => r.has_reply || r.reply_status === 'submitted'
const unansweredCount = mergedRealReviews.filter((r) => !isReplied(r)).length
```

### 리뷰 관리 UI (PlatformReviewAdmin.tsx)
- `reply_status === 'submitted'` → "✅ 등록 완료" 뱃지 + 답글 내용 표시 (초안 이어서 편집 숨김)
- `reply_status === 'failed'` → "❌ 등록 실패" 뱃지 + "초안 이어서 편집" 버튼 (재시도 가능)
- `reply_status === 'queued'` → "⚡ 자동 발행 중" 뱃지
