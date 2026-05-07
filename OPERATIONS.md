# 로컬루션 운영·점검 가이드 (OPERATIONS)

> 새 Claude 세션 시작 시: **CLAUDE.md → DO_NOT_TOUCH.md → OPERATIONS.md** 순으로 읽고 작업 시작.
> 이 문서 = 개발자/서버 관리자 관점의 지속적 점검 체계.

---

## 0. 빠른 참조 (Quick Reference)

| 항목 | 위치 |
|---|---|
| 라이브 사이트 | https://www.localution.co.kr |
| Vercel 대시보드 | https://vercel.com/dashboard |
| Supabase 콘솔 | https://app.supabase.com |
| Railway 워커 | https://railway.app/dashboard |
| GitHub 레포 | jty0221-del/localution |
| 작업 폴더 | C:\Users\pc\Desktop\localution |
| 환경변수 | C:\Users\pc\Desktop\localution\.env.local |
| 빌드/배포 | scripts/push_*.js (node 실행) |

---

## 1. 시스템 아키텍처

```
[ 사용자 (모바일/PC) ]
        ↓
[ Vercel - Next.js 14 App Router ]
   ├── /app/*               (페이지)
   ├── /app/api/*           (API Route Handlers)
   └── /app/components/*    (공용 컴포넌트)
        ↓
[ Supabase (Postgres) ]      [ Railway (워커 봇) ]
   - users / stores             - 네이버/배민/쿠팡이츠/요기요
   - platform_credentials         자동 로그인 + 리뷰 수집
   - reviews / replies          - 답글 자동 등록
   - billing_methods            - cron 스케줄링
```

**핵심 인증 체계**
- `localution_user` HMAC-서명 쿠키 (OAuth: 카카오/네이버/구글)
- Supabase `sb-*-auth-token` 쿠키 (폴백)
- 검증: `app/lib/userAuth.ts` → `requireUser()`

---

## 2. 최근 작업 내역 (2026-05-07 세션)

### 2-1. HarangMarketingPopup 7개 페이지 적용
**파일**: `app/components/HarangMarketingPopup.tsx`
**적용 페이지**:
- /dashboard
- /community
- /qr-admin
- /marketing
- /review-admin
- /settings
- /help

**동작**: 항상 노출 (확장 상태) · 세션 단위 dismiss · CTA → /inquiry?category=마케팅
**금지**: 사장님 직접 운영 홍보 — 텍스트/색상 임의 변경 금지 (`DO_NOT_TOUCH`)

### 2-2. DashboardRightSidebar 320px 확장 + 가독성 강화
**파일**: `app/components/DashboardRightSidebar.tsx`
**핵심 결정**:
- `position: fixed` 유지 (sticky 는 부모 grid context 영향으로 동작 X — 회귀 금지)
- 너비 280 → **320px**
- top-20 ~ bottom-4 로 우측 빈공간 채움
- 하단 240px 여백 확보 → 하랑 팝업(z-40) 가림 방지
- 카드 3개 순서 고정: TOP10 → 알림 → 도움말
- 한국 증시 컬러 (상승=빨강 / 하락=파랑 / 중립=회색)

**대시보드 페이지 변경**: `app/dashboard/page.tsx` 의 `xl:pr-[296px]` → `xl:pr-[336px]`

### 2-3. 플랫폼 연결 로그인 루프 수정
**파일**: `app/my/platforms/[platform]/connect/page.tsx`
**원인**: 모바일 세션 만료 시 401 → `/login` 으로 보내면서 redirect 경로 손실 → 로그인 후 `/dashboard` 로 가서 사장님이 "원래대로 돌아왔다" 인식
**수정**:
1. 페이지 로드 시 `/api/me` 사전 체크 → 401 이면 `/login?redirect=<connect 경로>` 보존
2. `submitConsent` / `submitCredentials` 의 401 → 동일 redirect 처리 (`handleAuthError`)
3. STEP 2 문구: "로그인이 필요해요" → "**배달의민족** 계정으로 로그인해주세요"
4. 안내 박스: "로컬루션 로그인이 아니에요" 명시
5. 버튼: "로그인" → "{플랫폼} 계정으로 연결하기"

---

## 3. 일일 점검 체크리스트 (5분)

매일 아침 출근 직후 한 바퀴:

```
[ ] 1. Vercel 최근 배포 — Failed 빌드 없는가?
       → https://vercel.com/dashboard
[ ] 2. Vercel Functions — 5xx 에러율 < 1% ?
       → 대시보드 → Functions → Errors
[ ] 3. Supabase — DB 사용량 < 80% ?
       → app.supabase.com → Project → Settings → Usage
[ ] 4. Railway 워커 상태 — Running, 메모리 < 80% ?
       → railway.app/dashboard → 각 서비스 Logs
[ ] 5. 라이브 사이트 — 메인/대시보드/플랫폼 연결 페이지 로드 OK ?
       → https://www.localution.co.kr (모바일/PC 둘 다)
[ ] 6. 신규 사장님 가입 — 어제 대비 오늘 추세 ?
       → /admin (관리자 페이지)
[ ] 7. 답글 자동 등록 — 마지막 24h 동안 작동 ?
       → /admin/dashboard 차트
[ ] 8. 카카오톡/이메일 1:1 문의 — 미응답 ?
       → /admin (문의 탭)
```

---

## 4. 주간 점검 체크리스트 (30분, 매주 월요일)

```
[ ] 1. GITHUB_TOKEN 만료 임박 ? (90일 cycle)
       → .env.local 의 token → GitHub Settings → Tokens → 만료일 확인
       → 만료 7일 전부터 갱신 준비
[ ] 2. Vercel 환경변수 동기화
       → 로컬 .env.local 과 Vercel Dashboard → Project → Env 비교
[ ] 3. Supabase 백업 — 자동 백업 정상 ?
       → Database → Backups
[ ] 4. 결제 모듈 — 토스페이먼츠 정상 작동 ?
       → 테스트 키로 결제 시뮬레이션 (settings/플랜 관리)
[ ] 5. 알림 시스템 — Web Push + 카카오톡 발송 로그
       → Vercel Functions Logs 에서 /api/cron/notify 검색
[ ] 6. 자동화 워커별 성공률
       - 네이버 답글 v37 (worker/NAVER_REPLY_SYSTEM_v37.md)
       - 쿠팡이츠 v76 (worker/COUPANGEATS_SYSTEM_v76.md)
       - 배민 / 요기요
       - Threads / 유튜브 커뮤니티 발행
[ ] 7. 사용자 피드백 정리 — /inquiry 새 문의
[ ] 8. 깃허브 레포 PR/Issue 검토
[ ] 9. updates 페이지 (/updates) — 이번 주 배포 내역 정리
       → app/updates/page.tsx FALLBACK_UPDATES 갱신
[ ] 10. 사이트 속도 측정 — Lighthouse 모바일 점수 80+ ?
```

---

## 5. 월간 점검 체크리스트 (2시간, 매월 1일)

```
[ ] 1. 의존성 업데이트
       cd C:\Users\pc\Desktop\localution
       npm outdated
       (Next.js / Supabase SDK / lucide-react 우선)
[ ] 2. 보안 점검
       npm audit
       → 고/심각 취약점은 즉시 패치
[ ] 3. Supabase Row Level Security 정책 점검
       → 모든 사용자 테이블에 RLS 활성화 확인
[ ] 4. DB 인덱스 점검
       → Slow Query Log 확인 (Supabase → Database → Query Performance)
[ ] 5. 비용 최적화
       - Vercel: Bandwidth / Function 호출 추세
       - Supabase: DB Egress / Storage
       - Railway: 메모리 / CPU 사용률
[ ] 6. 백업 검증
       → 실제로 백업으로 복원 가능한지 1회 테스트
[ ] 7. 사용 안 하는 코드 정리
       → DO_NOT_TOUCH.md 추가/제거 항목 검토
[ ] 8. CLAUDE.md / OPERATIONS.md 갱신
       → 새 정책/규칙/주의사항 반영
[ ] 9. 사장님 누적 통계 → 마케팅 보고서
[ ] 10. 도메인/SSL 만료일 확인
```

---

## 6. 환경변수 관리 (.env.local)

```
GITHUB_TOKEN=         # 90일 만료 — 빌드 스크립트용
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # ⚠ 절대 클라이언트 노출 금지
HMAC_COOKIE_SECRET=           # localution_user 쿠키 서명
ENCRYPTION_KEY=               # AES-256-GCM 비밀번호 암호화
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=              # 결제 — 백엔드 전용
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=
KAKAO_REST_KEY=
NAVER_OAUTH_CLIENT_ID=
NAVER_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
NAVER_SEARCH_CLIENT_ID=       # 검색 API
NAVER_SEARCH_CLIENT_SECRET=
```

**중요 규칙**:
- 토큰 값 뒤에 `&& node ...` 같은 명령어 절대 붙이면 안 됨 (CLAUDE.md 명시)
- Vercel Production env 와 로컬 `.env.local` 동기화 필수
- 새 키 추가 시 Vercel Env 에도 추가해야 빌드 통과

---

## 7. DO_NOT_TOUCH 회귀 방지 항목

빌드 에러 수정 / 리팩토링 시 아래 기능들이 덮어써지지 않도록 매번 확인:

| 항목 | 파일 | 핵심 |
|---|---|---|
| HarangMarketingPopup | components/HarangMarketingPopup.tsx | 사장님 직접 홍보 — 텍스트/색상 변경 금지 |
| DashboardRightSidebar | components/DashboardRightSidebar.tsx | position:fixed (sticky X), 카드 3개 순서, 한국 증시 컬러 |
| CommunityWidget | dashboard/page.tsx | RankBadge 앞에 정의, regions-community import 필수 |
| QuickActions / QuickNav | dashboard/page.tsx | **추가 금지** — JSX 호출 X |
| 네이버 답글 v37 | worker/NAVER_REPLY_SYSTEM_v37.md | 14 iteration 작동 시스템, 외부/내부 placeId 분리 |
| 쿠팡이츠 v76 | worker/COUPANGEATS_SYSTEM_v76.md | save-login + APIRequestContext (page.evaluate 금지) |
| Threads 발행 | marketing/threads/page.tsx | SUPABASE_SERVICE_ROLE_KEY 파생 암호화 |
| 알림 시스템 v1 | api/cron/notify | 매 15분 cron + Web Push + 카카오톡 |
| 결제 키 서버 토큰화 | api/billing/me + lib/billing | localStorage 결제 키 제거됨 |
| 이모지 절대 금지 | 모든 UI | lucide-react + 그라데이션 박스만 사용 |

---

## 8. 자주 나오는 버그 패턴

### 8-1. 모바일 세션 만료 → "로그인 루프"
- **증상**: 로그인 후 다른 페이지 가면 다시 로그인 요구 → 로그인 후 dashboard 로 돌아옴
- **원인**: API 가 401 반환했는데 클라이언트가 redirect 경로 보존 안 함
- **해결 패턴**: 모든 보호 페이지 진입 시 `/api/me` 사전 체크 + 401 → `/login?redirect=<현재 경로>`
- **참고 fix**: `app/my/platforms/[platform]/connect/page.tsx` 의 `handleAuthError`

### 8-2. GITHUB_TOKEN 만료 → 빌드 스크립트 401
- **증상**: `node scripts/push_*.js` 실행 시 `Bad credentials (401)`
- **해결**: GitHub → Settings → Developer settings → Personal access tokens → 갱신 → `.env.local` 의 `GITHUB_TOKEN=` 교체

### 8-3. 빌드 스크립트 template literal 정규식 함정
- **금지**: build_*.js 안의 백틱 문자열에 `/regex/` 사용
- **이유**: 이스케이프 2중 처리로 Vercel TypeScript 컴파일 실패
- **해결**: `includes()`, `startsWith()`, `endsWith()` 로 대체 (CLAUDE.md 명시)

### 8-4. Optional chaining 삼항 버그
- **금지**: `obj?.prop !== null` 패턴
- **이유**: `obj=undefined` 일 때 `undefined !== null` → `true` → TypeError
- **해결**: `obj != null && obj.prop !== null` 선행 체크

### 8-5. xl 미만에서 사이드바 카드 사라짐
- **원인**: `DashboardRightSidebar` 가 `hidden xl:block` 이라 1280px 미만 안 보임
- **해결**: `DashboardRightSidebarMobile` 을 main 안에 배치 (이미 적용됨)

### 8-6. 모바일 OAuth 계정 전환 안 됨
- **원인**: 캐시된 OAuth provider 토큰
- **해결**: `?reset=1` 파라미터로 강제 계정 선택 화면 (이미 적용됨)

### 8-7. 한글 URL 깨짐
- **금지**: `break-all` (한글 음절 깨짐)
- **해결**: `decodeURIComponent` 후 `truncate` + 툴팁

---

## 9. 배포 워크플로우

### 9-1. 일반 변경
```bash
# 1. 작업 폴더 이동
cd C:\Users\pc\Desktop\localution

# 2. 로컬 TS 검증
npx tsc --noEmit

# 3. 푸시 스크립트 작성 (scripts/push_<feature>.js)
#    - pushFile() 함수 패턴 사용
#    - 새 파일은 SHA 없이 PUT
#    - 기존 파일은 SHA 조회 후 PUT

# 4. 배포
node scripts/push_<feature>.js

# 5. 1-2분 대기 후 Vercel 빌드 로그 확인
#    https://vercel.com/dashboard

# 6. 라이브 검증
#    https://www.localution.co.kr
```

### 9-2. 빌드 실패 시 긴급 대응
1. Vercel 빌드 로그에서 에러 파일·라인 메모
2. `scripts/fix_<파일명>.js` 작성 (해당 부분만 교체)
3. `node scripts/fix_*.js` 즉시 배포
4. 빌드 성공 확인 후 본 작업 재개

### 9-3. 신규 기능 배포 루틴
1. 코드 작업
2. `app/updates/page.tsx` FALLBACK_UPDATES 갱신
3. (선택) DB `updates` 테이블에 INSERT
4. 푸시 → 빌드 → 라이브 검증

---

## 10. 모니터링 알림 체계

### 10-1. 자동 알림 권장 설정
- **Vercel**: Project → Settings → Notifications → Build Failed (Email + Slack)
- **Supabase**: Database → Settings → Alerts → CPU/Storage 80% 임계
- **Railway**: Service → Settings → Deploy Failure 알림
- **UptimeRobot** 등으로 https://www.localution.co.kr 5분 ping (선택)

### 10-2. 자체 모니터링 페이지
- `/admin` — 관리자 대시보드
- `/admin/dashboard` — 차트/통계
- `/review-admin/stats` — 답글 성공률
- `/api/health` (있으면) — 헬스체크

---

## 11. 새 Claude 세션 시작 권장 프롬프트

새 대화창에 붙여넣기:

```
로컬루션 작업 시작합니다. 다음 순서로 컨텍스트 파악 후 진행:

1. C:\Users\pc\Desktop\CLAUDE.md (이모지 금지 / 디자인 / 빌드 규칙)
2. C:\Users\pc\Desktop\localution\DO_NOT_TOUCH.md (회귀 방지)
3. C:\Users\pc\Desktop\localution\OPERATIONS.md (운영 가이드)
4. C:\Users\pc\.claude\projects\C--Users-pc-Desktop----\memory\MEMORY.md (자동 메모리)

특히 주의:
- 명시 지시 외 변경 절대 금지
- 이전 상태 되돌리기 금지
- UI 에 이모지 금지 (lucide-react + 그라데이션 박스만)
- PC + 모바일 양쪽 가독성 4단계 (375/768/1280/1920) 체크
- 푸시 후 Vercel 빌드 로그 확인

오늘 할 작업: [여기에 구체 작업 명시]
```

---

## 12. 비상 연락 / 롤백 절차

### 12-1. 라이브 사이트 다운 시
1. Vercel → Deployments → 직전 성공 빌드 → "Promote to Production"
2. 동시에 Supabase / Railway 상태 확인
3. 원인 파악 후 fix 스크립트 → 재배포

### 12-2. DB 데이터 사고
1. Supabase → Database → Backups → Point-in-Time Recovery
2. 최근 30분 / 1시간 / 1일 시점으로 복원
3. 사용자 영향 범위 파악 → 공지

### 12-3. 자동화 워커 멈춤
1. Railway → 해당 서비스 → Logs 확인
2. Restart → 그래도 안 되면 Redeploy
3. 워커별 가이드 (`worker/*_SYSTEM_v*.md`) 참조

---

## 13. 핵심 페이지 / 파일 맵

```
app/
├── (app)/                  # 라우트 그룹
├── dashboard/page.tsx      # 메인 대시보드 ⭐
├── community/page.tsx      # 지역 커뮤니티 ⭐
├── qr-admin/page.tsx       # QR 관리
├── marketing/              # 마케팅 (블로그 / 키워드 / 분석)
├── review-admin/           # 리뷰 통합 관리 ⭐
├── settings/page.tsx       # 매장/알림/AI/연동/플랜 ⭐
├── help/page.tsx           # 도움말
├── my/platforms/           # 플랫폼 연결 hub ⭐
│   ├── page.tsx                 # 카드 목록
│   └── [platform]/connect/      # 4단계 연결 플로우
├── admin/                  # 관리자 전용
├── api/
│   ├── auth/               # 카카오/네이버/구글 OAuth + 로그아웃
│   ├── me/                 # 현재 로그인 사용자
│   ├── platform-accounts/  # 자격증명 CRUD
│   ├── stores/me/          # 매장 정보 단일 진실원
│   ├── billing/            # 결제 (토스)
│   ├── cron/               # 스케줄 (15분 알림 등)
│   └── place/reviews/      # 리뷰 통합 피드
├── components/
│   ├── Sidebar.tsx                  # 좌측 네비
│   ├── PageHeader.tsx               # 통일 헤더
│   ├── HarangMarketingPopup.tsx     # 사장님 홍보 팝업 ⭐
│   ├── DashboardRightSidebar.tsx    # 우측 사이드바 ⭐
│   ├── SlideAdBanner.tsx            # 상단 롤링
│   ├── OnboardingChecklist.tsx
│   └── PlatformLogo.tsx
└── lib/
    ├── userAuth.ts              # requireUser()
    ├── adminAuth.ts             # createServiceClient()
    ├── cookieSigning.ts         # HMAC 검증
    ├── platform-credentials.ts  # AES-256-GCM 암호화
    ├── connections.ts           # useConnections() hook
    ├── points.ts                # 포인트 룰
    ├── industry-catalog.ts      # 업종 카탈로그
    └── settings-tabs.ts         # 설정 탭 정의
```

---

## 14. 변경 이력 (이 문서 자체)

- 2026-05-07: 최초 작성 (HarangPopup 7페이지 + 사이드바 320px + 플랫폼 연결 redirect fix 반영)
- 2026-05-07: 배달 플랫폼 cron 1일1번 → 15분 단위 변경 (75차 트래픽 절감 정책 의도적 변경 — iproyal 8GB 잔액 활용)
  - vercel.json `delivery-reviews-fetch` schedule: `0 4 * * *` → `*/15 * * * *`
  - cron payload `days_back: 30` → `days_back: 1` (15분 윈도우 + 24h 만 fetch 로 트래픽 ~90% 절감)
  - jobId dedupe bucket: hour → 15분 (`Date.now() / 900_000`)
  - 예상 트래픽: 사용자당 ~10MB/일 = 30 user × 30일 = ~9GB/월
  - 첫 수집 (180일) 은 collect API 가 별도 처리 — cron 부하 영향 X

---

**문서 갱신 규칙**: 새 기능 배포 / 정책 변경 / 회귀 방지 항목 추가 시 이 문서 갱신.
세션 종료 직전 1분만 투자해도 다음 세션의 컨텍스트 비용을 크게 줄임.
