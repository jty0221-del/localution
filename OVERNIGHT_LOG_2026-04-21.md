# OVERNIGHT LOG — 2026-04-21

## 요약표

| 차수 | 작업 | 파일 | 상태 |
|------|------|------|------|
| 23차-SEO(1/4) | opengraph-image.tsx 신규 생성 | app/opengraph-image.tsx | ✅ 완료 |
| 23차-SEO(2/4) | OG/Twitter 이미지 메타 추가 | app/layout.tsx | ✅ 완료 |
| 23차-SEO(3/4) | JSON-LD 구조화 데이터 삽입 | app/page.tsx | ✅ 완료 |
| 23차-SEO(4/4) | sitemap 3개 라우트 추가 | app/sitemap.ts | ✅ 완료 |
| 28차-1 | /api/stores/me 통합 GET 엔드포인트 신설 | app/api/stores/me/route.ts | ✅ 완료 |
| 28차-2 | platform-accounts POST 성공시 stores 자동 upsert | app/api/platform-accounts/route.ts | ✅ 완료 |
| 28차-3a | /review-admin 서버 연결 상태 병합 | app/review-admin/page.tsx | ✅ 완료 |
| 28차-3b | /settings StoreTab·ConnectTab 서버 통합 | app/settings/page.tsx | ✅ 완료 |
| 28차-4 | /settings Kakao Maps 위젯 추가 (SmartMapBox) | app/settings/page.tsx | ✅ 완료 |
| 29차-1 | /marketing/card-news 레이아웃 통일 (Sidebar + PageHeader + Footer) | app/marketing/card-news/page.tsx | ✅ 완료 |
| 23차-3 | Railway Worker 스캐폴딩 + Redis 서비스 생성 | worker/ (9 files) | ✅ 인프라 배포, ⏳ ENV 3개 수동 대기 |
| 30차-18 | dashboard canonicalConnections 가 reviews/rating 덮어쓰지 않도록 보존 + /api/stores/me naver_place 연결 판정 확장 | app/dashboard/page.tsx, app/api/stores/me/route.ts | ✅ 완료 (0b2dbe8, 5af647f) |
| 30차-19 | AI 답글 재작성 — review_id 로 stores+사진 자동 로드 + SEO 키워드 추론 + Claude Vision | app/api/ai-review-reply/route.ts | ✅ 완료 (8338c99) |
| 30차-20 | 원클릭 자동 등록 버튼 (생성→복사→스마트플레이스 탭) + handleAiReply review_id 전환 | app/review-admin/naver/page.tsx | ✅ 완료 (782aeb0) |
| 30차-21 | 댓글 초안→편집→자동등록 2단 시스템 전면 재구성 + 프롬프트 절제 + Worker 큐 인프라 | supabase/migrations/30cha21_platform_reviews_draft_columns.sql, app/api/ai-review-reply/route.ts, app/api/review-reply/draft/route.ts, app/api/review-reply/submit/route.ts, app/api/place/reviews/route.ts, app/review-admin/naver/page.tsx | ✅ 완료 |
| 30차-22 | 초안 일괄 생성 + 3 플랫폼 2단 플로우 확장 + connect 미니멀 로그인 UI | app/api/review-reply/bulk-draft/route.ts, app/review-admin/components/PlatformReviewAdmin.tsx, app/review-admin/naver/page.tsx, app/review-admin/baemin/page.tsx, app/review-admin/yogiyo/page.tsx, app/review-admin/coupang/page.tsx, app/my/platforms/[platform]/connect/page.tsx | ✅ 완료 |
| 30차-23 | 리뷰 UX 통합 개선 — 사진 썸네일/라이트박스 + 기간 필터(7/30/전체) + 헤더 카피 네이버 중심 + 대시보드 실데이터 통합 | app/review-admin/components/PlatformReviewAdmin.tsx, app/api/place/reviews/route.ts, app/dashboard/page.tsx | ✅ 완료 (22b8694 / 2918f12 / fda29e9) |
| 31차-1 | Kakao Map 플랫폼 추가(5번째) — DB/슬러그/대시보드/connect/리뷰어드민/worker 전파 | app/lib/platform-credentials.ts, app/lib/connections.ts, app/my/platforms/page.tsx, app/my/platforms/[platform]/connect/page.tsx, app/api/review-reply/bulk-draft/route.ts, app/review-admin/page.tsx, app/review-admin/kakao/page.tsx, app/dashboard/page.tsx, worker/src/jobs/index.ts | ✅ 완료 (bfc4cf3 / 4b9088f / 6b59ee3 / 02f46a3 / 9965d32 / 0f5e574 / 43aa6c2 / 6ac3aa5 / 716bd70) |
| 31차-2 | /settings/profile 서버 단일 진실원 동기화 — `/api/stores/me` 연동 + 연결 플랫폼 뱃지 | app/settings/profile/page.tsx | ✅ 완료 (c0f4a07) |
| 31차-3 | 카카오맵 공개 리뷰 수집기 — panel3 JSON 파서 + 수집 API + PlatformReviewAdmin.collectEndpoint 옵션 | app/lib/kakao-place.ts, app/api/place/kakao/collect/route.ts, app/review-admin/components/PlatformReviewAdmin.tsx | ✅ 완료 (9271f4f / 4a7b5af / 5d42435) |

---

## 23차 — SEO 최적화 (2026-04-21)

### 작업 배경
localution.co.kr 구글 검색 노출 개선을 위한 SEO 기본기 적용.
기존에 title/description/canonical/robots 는 있었으나
og:image 누락, JSON-LD 없음, sitemap 불완전 상태였음.

### 변경 내역

#### 23차-SEO(1/4) — opengraph-image.tsx 신규 생성
- `app/opengraph-image.tsx` 신규 파일 추가
- `next/og` ImageResponse 사용, 1200×630 OG 썸네일 자동 생성
- 파란 그라디언트 배경 + 한국어 타이틀/서브타이틀
- `/opengraph-image` 경로로 서빙됨

#### 23차-SEO(2/4) — layout.tsx OG 이미지 메타 추가
- `openGraph.images` 배열 추가 → `/opengraph-image` 연결
- `twitter.card` = `summary_large_image` 설정
- `twitter.images` 추가

#### 23차-SEO(3/4) — page.tsx JSON-LD 구조화 데이터
- `<script type="application/ld+json">` 삽입 (dangerouslySetInnerHTML)
- Schema.org @graph: SoftwareApplication, Organization, WebSite, FAQPage
- SoftwareApplication: 가격 990원, applicationCategory LocalBusiness
- FAQPage: 3개 Q&A (로컬루션이란, 비용, 지역)

#### 23차-SEO(4/4) — sitemap.ts 라우트 추가
- `marketing/blog-tracking` (priority 0.7, weekly)
- `updates` (priority 0.7, weekly)
- `partner-points` (priority 0.6, monthly)

### 구글 Search Console 권장 후속 작업
- [ ] Search Console에서 sitemap 재제출
- [ ] URL 검사 → 인덱스 요청 (홈페이지)
- [ ] og:image 미리보기 확인 (opengraph.xyz)

---

## 28차 — 매장정보 단일 진실원 + 지도 위젯 (2026-04-22)

### 작업 배경
`/my/platforms` 에서 아이디/비번으로 플랫폼을 연결해도
`/review-admin`, `/settings`, `/qr-admin` 이 각자 다른 소스(localStorage)만 보고 있어서
"연결했는데 다른 페이지에 안 뜬다" 이슈 상시 발생.
→ 서버(`platform_credentials` + `stores`)가 단일 진실원이 되도록 아키텍처 통일.
→ 추가로 `/settings` 매장정보 탭에 카카오 지도 위젯 장착.

### 변경 내역

#### 28차-1 — /api/stores/me 통합 GET 엔드포인트 신설
- `app/api/stores/me/route.ts` 신규
- `requireUser()` 기반 인증, `platform_credentials` + `place_targets` + `stores` 3개 테이블 통합 조회
- account_id 마스킹(앞 2 + *** + 뒤 2), 비밀번호 절대 미반환
- 각 서브쿼리 try/catch 격리 (부차 쿼리 실패해도 메인 데이터 정상 응답 원칙)
- 응답: `{ ok, store, platforms[4], naver_link, map }`
- 배포 커밋 `04f9669`

#### 28차-2 — platform-accounts POST 성공시 stores 자동 upsert
- `app/api/platform-accounts/route.ts` POST 핸들러 확장
- `savePlatformCredentials` 성공 후 `stores` 테이블 upsert
- 기존 store 존재하면 name/naver_place_id/naver_url 업데이트, 없으면 insert (slug 자동 생성)
- 실패해도 연결 자체는 성공 응답 (non-fatal, console.warn)
- 배포 커밋 `2998206`

#### 28차-3a — /review-admin 서버 연결 상태 병합
- `app/review-admin/page.tsx` 수정
- `serverPlatforms` + `serverNaverLink` state 추가
- mount 시 `/api/stores/me` fetch → 서버 연결 상태 우선 반영
- platform slug 매핑: naver_place↔naver, coupangeats↔coupang
- stats useMemo 가 useConnections(local) + serverPlatforms 병합 (any connected = true)
- 배포 커밋 `0918afe`

#### 28차-3b — /settings StoreTab + ConnectTab 서버 통합
- `app/settings/page.tsx` 대대적 개편
- StoreTab: `/api/stores/me` 로 form 초기값 하이드레이션, 저장 시 `/api/stores/register` POST, 연결된 플랫폼 뱃지 표시
- ConnectTab: 서버 플랫폼 4종(naver_place/baemin/yogiyo/coupangeats) 카드는 `/my/platforms/{slug}/connect` 으로 리다이렉트, 레거시 4종(google/kakao/yeoshin/hometax) 은 localStorage 유지
- 카드에 서버 계정 ID 마스킹 + 연결 시각 표시
- 배포 커밋 `b332b70`

#### 28차-4 — /settings Kakao Maps 위젯 장착
- `KakaoMapBox({ address })` 컴포넌트 신규 (Dapi v2 SDK, services 라이브러리)
- `SmartMapBox` 선택기: `NEXT_PUBLIC_KAKAO_MAP_KEY` 있으면 Kakao, 없으면 Naver 폴백
- StoreTab 이 `<SmartMapBox address={mapAddress} />` 렌더 (주소 없으면 안내 메시지)
- Kakao(1순위) + Naver(폴백) 두 키 가이드를 API 키 발급 안내 박스에 병기
- 배포 커밋 `b332b70` (28차-3b 와 동일 커밋)

### 스모크 테스트 결과
- `/api/stores/me` (비로그인) → 401 ✅ (기대 동작)
- `/review-admin`, `/settings`, `/qr-admin`, `/my/platforms` → 307 로그인 리다이렉트 ✅ (빌드 성공)
- Vercel 배포 성공, 런타임 오류 없음

### 사용자 액션 필요 (수동)
- [ ] Kakao Developers (https://developers.kakao.com) 앱 생성 → JavaScript 키 발급
- [ ] Kakao 앱 → 플랫폼 → Web → 사이트 도메인에 `https://www.localution.co.kr` 등록
- [ ] Vercel → Settings → Environment Variables → `NEXT_PUBLIC_KAKAO_MAP_KEY=발급받은_JS_키` 추가 (Production)
- [ ] Vercel Redeploy → `/settings` 매장정보 탭에서 지도 표시 확인

---

## 29차 — /marketing/card-news 레이아웃 통일 (2026-04-22)

### 작업 배경
카드뉴스 페이지가 좌측 사이드바 없이 단독 레이아웃이라 타 페이지와 이질감.
`/marketing/blog-tracking` 과 동일한 Sidebar + PageHeader + Footer 구조로 통일.

### 변경 내역
- `force-dynamic` 추가
- Sidebar 마운트 + `ml-[220px]` 본문 오프셋
- 기존 핑크 그라디언트 히어로 → `<PageHeader variant="pink">` (공용 컴포넌트)
- 마케팅 관리 > 인스타 캐러셀 카드뉴스 브레드크럼 추가
- Footer 하단 추가
- 배포 커밋 `4ecad48`

---

## 23차-3 — Railway Worker 인프라 (2026-04-22)

### 작업 배경
23차 PRD 의 멀티 플랫폼(네이버·배민·요기요·쿠팡이츠) 자동화를 위해
Vercel(Next.js API)과 분리된 장시간 실행 Playwright 워커가 필요.
Railway Hobby 플랜에서 BullMQ 기반 큐잉 + Docker 빌드 사용.

### 변경 내역 — GitHub

`worker/` 디렉토리 스캐폴딩 9개 파일 추가 (push_23cha3_worker_scaffold.js):

| 파일 | 역할 |
|------|------|
| `worker/package.json` | bullmq 5 / ioredis 5 / playwright 1.47 / pino / supabase-js |
| `worker/tsconfig.json` | strict TS, ES2022, outDir=dist |
| `worker/Dockerfile` | `mcr.microsoft.com/playwright:v1.47.0-jammy` 베이스 |
| `worker/.dockerignore` | node_modules / dist / .env 제외 |
| `worker/railway.json` | builder DOCKERFILE 힌트 |
| `worker/README.md` | 구조·환경변수·로컬 개발 가이드 |
| `worker/src/index.ts` | BullMQ Worker 엔트리 + 헬스체크 HTTP(/health) |
| `worker/src/jobs/index.ts` | 플랫폼 라우터 (naver_place/baemin/yogiyo/coupangeats) |
| `worker/src/adapters/base.ts` | 공통 어댑터 인터페이스 + BrowserContext 헬퍼 |

### 변경 내역 — Railway

프로젝트 `localution-worker` (ID `70e9580f-1e8b-458d-aa55-41e2512ca9cd`):

| 서비스 | 타입 | 상태 |
|--------|------|------|
| `redis` | image `redis:7-alpine` | ✅ SUCCESS 배포 |
| `worker` | GitHub repo `jty0221-del/localution` / branch `main` / rootDir `/worker` | ⏳ ENV 3개 대기 |

Worker 서비스 환경변수 (skipDeploys=true 로 세팅):
- ✅ `REDIS_URL` = `redis://${{redis.RAILWAY_PRIVATE_DOMAIN}}:6379`
- ✅ `NODE_ENV` = `production`
- ✅ `WORKER_CONCURRENCY` = `2`
- ✅ `LOG_LEVEL` = `info`

### 잡 플로우 설계

```
Vercel API (답글 등록 요청)
  ↓ BullMQ Queue 'platform-jobs' 에 job push
  ↓
Redis (Railway)
  ↓
Worker (Railway, Playwright)
  ↓ platform 분기 → 어댑터 실행
  ↓
    naver_place / baemin / yogiyo / coupangeats
  ↓ 세션 쿠키 복호화 → 브라우저 자동화
  ↓ 결과를 Supabase 에 저장
```

현재 어댑터는 stub 상태 (23차-4~5 에서 실제 구현).

### 사용자 액션 필요 (수동)

Railway 대시보드 → `worker` 서비스 → Variables 에 아래 3개 추가
(값은 Vercel → localution → Settings → Environment Variables 에서 복사):

- [ ] `SUPABASE_URL` = `https://XXX.supabase.co` (NEXT_PUBLIC_SUPABASE_URL 동일)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Supabase service_role 키
- [ ] `ENCRYPTION_KEK_HEX` = 23차-2 에서 생성한 32바이트 KEK (64 hex chars)

3개 저장하면 Railway 가 자동으로 Dockerfile 빌드 → Worker 시작.
로그에 `worker ready` + `redis connected` 확인.

---

## 30차-18 — 대시보드 리뷰 미노출 재진단 + 수정 (2026-04-22)

### 증상
30차-17 배포 이후에도 "리뷰 20건 수집됐다는 알림은 오는데 대시보드 카드에는 안 보임" 재발.

### 원인
**원인 A — `app/dashboard/page.tsx`**
- canonicalConnections useEffect 가 naver 미연결 판정시 `rating:null, reviews:null` 까지 함께 덮어씀.
- `reloadStoresMe()` 가 막 set 한 `reviews:20` 집계를 다음 틱에 지워버림.

**원인 B — `app/api/stores/me/route.ts`**
- naver_place 를 `platform_credentials` 에만 있으면 "연결됨" 으로 간주.
- 유저가 `/settings StoreTab` 에서 URL 만 붙여 넣어 등록한 경우 `stores.naver_place_id` 에는 있지만 platform_credentials 는 비어 있음 → server 가 `connected:false` 내려보냄 → useConnections 훅이 canonical 로 전파 → 대시보드 카드가 집계 지움.

### 수정
- **dashboard/page.tsx**: canonical effect 에서 `connected:false` 만 해제, rating/reviews 는 보존. 코멘트 30차-18 주석 박아둠.
- **stores/me/route.ts**: naver_place 연결 판정을 `platform_credentials` + `place_targets`(naverLink) + `stores.naver_place_id` + `platform_reviews` 존재까지 확장. 어느 경로로 등록했든 "연결됨" 으로 판정.

---

## 30차-19 — AI 답글 재작성 (커뮤니케이션 전문가 + SEO + Vision) (2026-04-22)

### 작업 배경
> 사용자 요청: "리뷰 정말 좋은데 답글이 해당글과 사진을 분석하여 커뮤니케이션 전문가로써 우리 매장에 네이버 플레이스 SEO와 상위노출에 필요한 키워드를 합리적으로 추론하여 작성 바람"

프롬프트 한 줄 수정이 아니라, 매장 컨텍스트(지역·업종·메인키워드·description) + 리뷰 사진 URL 까지 LLM 이 봐야 "정말 우리 매장 사람이 쓴 것" 같은 답글이 나옴.

### 변경 내역 — `app/api/ai-review-reply/route.ts` 전면 재작성
- **자동 로드**: `requireUser()` + `createServiceClient()` → stores(name/category/address/main_keyword/sub_keywords/description) + platform_reviews(content/photos/rating) 를 `review_id` 만으로 끌어옴. description 컬럼 없는 환경은 2단 select fallback.
- **SEO 키워드 조합**: `extractRegionFromAddress()` 로 "○○시 ○○구 ○○동" 파싱 → `buildSeoKeywords()` 에서 지역+업종 / 지역+메인키워드 / 메인키워드 / 매장명 / sub_keywords dedupe 후 시스템 프롬프트에 주입.
- **모델 분기**: 사진 있으면 `claude-sonnet-4-6` Vision (URL 참조), 없으면 `claude-haiku-4-5-20251001` 텍스트. Vision URL 거부 시 텍스트 전용 재시도 fallback.
- **사진 전용 전략**: empty / photo_only / positive 분기 각각에 "사진에 보이는 메뉴·플레이팅·분위기 직접 언급" 가이드 포함.
- **호환성**: 예전 프론트의 `review_text` / `store_name` / `tone` 플랫 파라미터도 받도록 하위 호환.

---

## 30차-20 — AI 답글 원클릭 자동 등록 (단기 UX) (2026-04-22)

### 변경 내역 — `app/review-admin/naver/page.tsx`
- **handleAiReply**: 기존 `review_text / reviewer_name / rating / store_name / tone` 플랫 바디 → `review_id + review + rating + aiSettings{tone,length}` 로 전환. 백엔드가 DB 에서 사진·매장 컨텍스트 자동 로드.
- **⚡ 원클릭 자동 등록 버튼**: `handleOneClickReply()` 신설. 생성 완료 → 클립보드 자동 복사 → `https://new.smartplace.naver.com/` 새 탭 오픈까지 한 번에. 토스트로 "붙여넣기만 하면 돼요" 안내.
- **✨ 먼저 미리보기 버튼**: 기존 "AI 답글 생성" 플로우 (생성만, 복사는 별도 버튼) 유지.

### 장기 플랜
- 23차-4 (NaverPlaceAdapter MVP) + Railway Worker Playwright 완성 시 실제 submit 까지 자동화. 현재는 복사+탭 오픈까지만 자동.

---

## 30차-21 — 댓글 초안→편집→자동등록 2단 시스템 전면 재구성 (2026-04-22)

### 사용자 피드백
> "원클릭 자동 등록 버튼을 만들어준거 확인했는데 전체적으로 시스템을 바꿔야 할것으로 보임. 댓글 초안 생성하기를 만들어서 ... 이후 초안생성이 완료 되면 AI 초안 수정과 이대로 등록하기 버튼 2가지로 나뉘게 만들고 그걸 통해서 이대로 등록하기 버튼 누르면 자동으로 네이버에 댓글을 등록할 수 있게 만들어줘"
>
> + "너무 많은 키워드와 미사어구가 달리지 않도록"

30차-20 원클릭 버튼은 "생성→복사→네이버 탭" 까지는 해줬지만 사용자가 초안을 확인·수정할 틈이 없었고, 키워드 + 미사여구가 너무 많이 끼어 들어가는 프롬프트 과다 이슈가 있었음.

### 변경 내역

#### 30차-21(1) — SQL migration: platform_reviews 초안/큐 컬럼 7개 추가
- `supabase/migrations/30cha21_platform_reviews_draft_columns.sql` 신규
- 컬럼: `draft_reply`(text) / `reply_status`(text default 'none') / `reply_tone`(text) / `reply_queued_at` / `reply_submitted_at` / `reply_error` / `reply_attempts`(int default 0)
- 상태 enum CHECK: `none | draft | queued | submitting | submitted | failed`
- 부분 인덱스: `(platform, reply_queued_at) WHERE reply_status='queued'` — Worker 픽업 최적화
- **⚠️ 수동 실행 대기**: Supabase SQL Editor 에서 실행해야 함

#### 30차-21(2) — `/api/ai-review-reply` 프롬프트 절제 강화
- 기존 SEO 블록(lines 313~)의 "2~4개 자연 노출" 규칙 → **"딱 1~2개만 골라서 자연스럽게 녹이세요"** 로 강화
- 추가 규칙:
  - 같은 키워드 2번 이상 등장 금지 (검색 스팸 역효과)
  - "매장명" 또는 "지역+업종" 조합은 답글 전체에서 1회만
  - 4~6문장 이내 권장
  - 인사말은 "안녕하세요, ○○입니다" 수준 1줄
  - "정말 너무" / "완전 진짜" / "최고의" 같은 겹수식어 금지
  - 키워드가 문맥상 어색하면 차라리 빼라

#### 30차-21(3) — `POST /api/review-reply/draft` 신규
- 초안 저장 전용 엔드포인트. body: `{ review_id, draft, tone? }`
- `requireUser()` + 본인 소유 검증 + queued/submitting/submitted 상태에서는 수정 거부
- update: `draft_reply`, `reply_status='draft'`, `reply_tone`, `reply_error=null`

#### 30차-21(4) — `POST /api/review-reply/submit` 신규
- "이대로 등록하기" → Worker 큐 등록. body: `{ review_id }`
- 조건 체크: 본인 소유 + `has_reply=false` + `draft_reply` 존재 + `reply_status in (none,draft,failed)`
- update: `reply_status='queued'`, `reply_queued_at=now()`
- 네이버 어댑터(23차-4) 미완 상태에 대한 투명한 note 응답 포함

#### 30차-21(5) — `/api/place/reviews` GET 확장
- 초안/상태 컬럼 7개 추가 반환: `draft_reply, reply_status, reply_tone, reply_queued_at, reply_submitted_at, reply_error, reply_attempts`
- UI 가 상태 배지/편집박스/재진입 처리에 사용

#### 30차-21(6) — `/review-admin/naver` 페이지 전면 리팩터
- 기존 2버튼("⚡ 원클릭 자동 등록" + "✨ 먼저 미리보기") 제거
- **초기 상태**: 리뷰 카드 아래 단일 "✍️ 댓글 초안 생성" 버튼
- **생성 후**: 편집 가능한 `<textarea>` + 톤 선택 + 3버튼:
  - "🔁 AI 초안 수정" — 재생성
  - "✅ 이대로 등록하기" — Worker 큐 등록
  - "닫기" — 편집창 종료
- **재진입**: draft 가 있으면 "📝 초안 이어서 편집" 버튼으로 노출 (60자 미리보기)
- **상태 배지**: draft / queued / submitting / submitted / failed 색상 뱃지
- queued 상태 알림: "Worker 가 네이버에 올려드려요"
- failed 상태 시 `reply_error` 빨간 박스 표시

### 큐 → 실제 submit 연결 플랜
현재 Railway Worker 어댑터(23차-4)는 stub 상태. `reply_status='queued'` 행은 DB 에 쌓이지만 Worker 가 아직 픽업하지 않음. 23차-4 완성 시 자동으로:
1. Worker 가 4시간 polling 또는 realtime trigger 로 `queued` 행 감지
2. `reply_status='submitting'` 으로 마킹
3. Playwright 로 스마트플레이스 로그인 + 답글 submit
4. 성공 → `reply_status='submitted'` + `reply_submitted_at=now()` + `has_reply=true`
5. 실패 → `reply_status='failed'` + `reply_error=...` + `reply_attempts+=1`

### 배포 스크립트
`scripts/push_30cha21_review_reply_draft_queue_system.js` — 6개 파일 일괄 커밋

---

## 30차-22 — 초안 일괄 생성 + 3 플랫폼 2단 플로우 확장 + connect 미니멀 로그인 UI (2026-04-22)

### 사용자 피드백
> "B로 할꺼 같음 또한 이미지처럼 배민/요기요/쿠팡이츠 리뷰관리 페이지에도 동일하게 플로우를 적용하고 https://www.localution.co.kr/my/platforms 여기에 연결할 때 저런형태의 양식으로 변경해줘 네이버도 그렇게 해서 정리"

30차-21 배포 완료 직후, 대표가 (A) 일괄 선택 체크박스 (B) 초안 일괄 생성 중에서 **B 채택**. 동시에 3 플랫폼 동일 플로우 확장과 connect 화면 미니멀 로그인 UI 요청.

### 변경 내역

#### 30차-22(1) — `POST /api/review-reply/bulk-draft` 신규
- 미답변(has_reply=false) + 상태(none|draft|failed) 리뷰 id 목록을 최대 50개 반환
- 실제 AI 호출은 클라이언트가 순차 수행 (서버 타임아웃 회피)
- 응답 형태: `{ ok, platform, total, candidates: [{ id, has_draft, reply_status }] }`

#### 30차-22(2) — `app/review-admin/components/PlatformReviewAdmin.tsx` 신규 공통 컴포넌트
- 30차-21 네이버 페이지 600 줄 로직을 **플랫폼 config 주입형** 재사용 컴포넌트로 추출
- props: `platform / uiKey / label / color / bg / textColor / icon / iconLetter / supportsFetch / connectHref`
- 내부 기능 (공통):
  - /api/stores/me 로 해당 플랫폼 연결 상태 + 집계 로드
  - /api/place/reviews?platform= 로 리뷰 목록 로드
  - /api/ai-review-reply → /api/review-reply/draft 순차 호출 (단일 초안)
  - /api/review-reply/submit (이대로 등록)
  - **/api/review-reply/bulk-draft 후보 조회 → 클라이언트 순차 반복 실행 (진행률 + 중단 버튼)**
  - 평점/상태 필터, 통계 카드, 초기 진입 버튼, 편집 textarea, 톤 선택, 상태 배지
  - supportsFetch=true (naver_place) 만 "지금 수집" 노출 — 배민/요기요/쿠팡은 Worker 대기 (23차-5)

#### 30차-22(3) — 네이버 페이지 공통 컴포넌트 wrapper 로 축약
- `/review-admin/naver/page.tsx` 600 줄 → **23 줄**
- config: naver_place / naver / #03C75A / supportsFetch=true / connectHref=/my/platforms/naver_place/connect

#### 30차-22(4) — 배민/요기요/쿠팡이츠 신규 2단 플로우 페이지
- `/review-admin/baemin/page.tsx` 전면 재작성 → 공통 컴포넌트 wrapper (#2AC1BC, 🍔, 배)
- `/review-admin/yogiyo/page.tsx` 전면 재작성 → 공통 컴포넌트 wrapper (#FA0050, 🛵, 요)
- `/review-admin/coupang/page.tsx` 전면 재작성 → 공통 컴포넌트 wrapper (#FF4B30, 🚀, 쿠)
- 기존 localStorage 기반 연결 판정 / /api/baemin-reviews 레거시 코드 전부 제거
- 모두 platform_reviews 테이블 + 30차-21 draft/submit 파이프라인으로 통합

#### 30차-22(5) — `/my/platforms/[platform]/connect` 미니멀 로그인 UI 리디자인
- **STEP 1** (대리권 위임 동의 3 체크박스) 유지 + 상단에 컬러 로고 아이콘 추가
- **STEP 2** (자격증명 입력) 을 모바일 앱 로그인 화면 카피:
  - 좌측 상단 STEP 배지 + 우측 상단 X 닫기 버튼
  - 컬러 로고 아이콘 (w-14 h-14 rounded-2xl) + 브랜드 색상
  - 큰 타이틀: "{플랫폼} 리뷰 관리를 위해 로그인이 필요해요" (shortLabel 사용 — "배민" / "요기요" / "쿠팡이츠" / "네이버")
  - 라벨 없는 input (placeholder 로만 안내) + 반투명 회색 배경
  - 비밀번호 입력 eye 아이콘 토글 (SVG)
  - 풀너비 "로그인" 버튼 — 배민/요기요/쿠팡은 이미지처럼 파스텔 라벤더(#E8E0FF / #4C3D8F), 네이버는 브랜드 그린
  - 하단 "{플랫폼} 아이디, 비밀번호를 까먹었다면?" + "아이디 찾기 >" / "비밀번호 찾기 >" 2버튼 (배민은 통합 1버튼)
  - 하단 보안 안내 "AES-256-GCM 암호화"
- 선택 입력(storeName) 제거 — stores.name 은 platform-accounts POST 후 자동 upsert (28차-2) 로 커버

### 배포 결과
`scripts/push_30cha22_bulk_draft_and_minimal_login.js` — 7개 파일 일괄 커밋
- da2e9f7: bulk-draft API
- 87576ce: PlatformReviewAdmin 공통 컴포넌트
- e146a6c: naver wrapper
- 9c8d02b / 959a4b3 / 3a43757: baemin / yogiyo / coupang wrapper
- cc6d8a0: connect 미니멀 로그인 UI

### 다음 단계 (미해결)
- 23차-5 Worker 어댑터 완성 시 배민/요기요/쿠팡 "지금 수집" 및 `queued → submitted` 루프 실제 가동
- 30차-21 SQL 마이그레이션은 이미 Supabase 에서 실행 완료 (Success. No rows returned 확인)

---

## 30차-23 — 리뷰 UX 통합 개선 + 대시보드 실데이터 통합 (2026-04-22)

### 작업 배경
사용자 요청 5개:
1. `/review-admin/naver` 에 리뷰 사진이 나오지 않음 → 사진 썸네일 + 라이트박스
2. 리뷰가 20건까지만 보임 → 기간 필터(7/30/전체) + limit 상한 1000
3. 상단 "연결된 매장 · AI 답글 2단 플로우" 카피가 네이버 플레이스 맥락과 안 맞음 → 네이버 플레이스 중심 안내 재작성
4. `/dashboard` 의 "플랫폼별 별점·리뷰 현황" 에서도 실제 리뷰 미노출 → 플랫폼별 최신 2건 미니 카드
5. `/dashboard` 하단 "최근 리뷰" 샘플 데이터 → 전 플랫폼 통합 실데이터 + AI 답글 진입점

### 변경 내역

#### 30차-23-1/2/3 — `app/review-admin/components/PlatformReviewAdmin.tsx`
- review 타입에 `photos: string[]` + `photoCount: number` 추가 (기존 count-only → URL 배열)
- `lightboxUrl` 상태 + 클릭 시 확대 모달 (`<dialog>` 스타일 fullscreen overlay)
- 썸메일 그리드: 최대 10장 + 11장째부터 `+N` 오버레이 뱃지, `referrerPolicy="no-referrer"` 로 네이버 CDN 차단 우회
- `period` 상태 (7 | 30 | all) + URLSearchParams 기반 fetch: `limit=1000&period=${period}`
- 네이버 플레이스 전용 서브타이틀: "공개 리뷰 자동 수집 · 미답변 리뷰에 사장님 답글 작성"
- 네이버 공개 GraphQL 의 키워드 리뷰 특성(rating=null) 안내 카드 + 원본 리뷰 페이지 외부 링크 추가

#### 30차-23-2 — `app/api/place/reviews/route.ts`
- `limit`: 기본 30 → 200, 상한 100 → 1000
- `period` 파라미터 추가: `7` / `30` / `all` (기본 all) → posted_at 기준 서버사이드 필터
- `unreplied_only=1` 파라미터 추가 → `has_reply=false` 자동 필터
- 기간 필터는 Supabase `.gte('posted_at', ISO)` 로 구현해 대량 조회에도 DB 단 카트오프 적용

#### 30차-23-4/5 — `app/dashboard/page.tsx`
- `platformReviews: Record<string, RealReview[]>` 상태 + `loadPlatformReviews()` 콜백
- 연결된 플랫폼이 바뀌면 `/api/place/reviews?platform=X&limit=30&period=all` 병렬 로드
- `mergedRealReviews`: 전 플랫폼 리뷰 머지 + `posted_at` 기준 DESC 정렬
- 감정 집계 / 미답변 카운트 / 부정 미답변 카운트 → `hasRealReviews` 여부로 실데이터 ↔ RECENT_REVIEWS(데모) 자동 스위치
- 좌측 "플랫폼별 별점·리뷰 현황" 카드: 플랫폼 행 하단에 최신 2건 미니 렌더 (작성자·별점·시간·미답변 배지) + "전체보기" 링크
- 하단 "최근 리뷰": 전 플랫폼 통합 10건 표시, 집계 플랫폼 배지 행 추가, 각 리뷰별 "AI 답글" 버튼이 `openAIReplyFromReal()` 통해 기존 AIReplyModal 로 연결 (RealReview → `{ platform, name, rating, text, time, replied, color }` 변환)
- `timeAgo()` / `dbPlatformToId()` 헬퍼 추가
- `handleCollectNaverReviews` 성공 후 `loadPlatformReviews(['naver_place'])` 즉시 호출 → 수집 버튼 누르면 아래 리뷰 목록도 즉시 갱신

### 배포 정보
- `scripts/push_30cha23_reviews_ux_dashboard.js` — 3 파일 일괄 PUT
- commit: `22b8694` (PlatformReviewAdmin) / `2918f12` (reviews route) / `fda29e9` (dashboard)

### 영향 범위
- 네이버 플레이스 공개 리뷰에 한정해 실데이터 반영 (Worker 미완 플랫폼은 연결만 되면 빈 배열 반환 → UI 는 플랫폼 행만 표시)
- 23차-5 Worker 어댑터 완성 시 배민/요기요/쿠팡이츠 실데이터도 자동으로 좌측 카드·하단 통합 리뷰에 섞여 들어감 (코드 수정 불필요)

### 다음 단계 (미해결)
- 23차-5 Worker 실제 수집 후 통합 리뷰가 4개 플랫폼 전부 섞여 뜨는지 확인
- `/dashboard` 좌측 카드에서 "AI 답글" 클릭 시 AIReplyModal → 실제 게시는 네이버 플레이스만 지원 (배민/요기요/쿠팡은 30차-22 draft 큐에 묶여 있으므로 UX 분기 필요할 수 있음)

---

## 31차 — Kakao Map 플랫폼 통합 + 프로필 서버 동기화 (2026-04-22)

### 작업 배경
1. **5번째 플랫폼 — 카카오맵**: 기존 4플랫폼(naver_place / baemin / yogiyo / coupangeats) 체계에 카카오맵 추가 요청. ID/PW 로그인 + `place.map.kakao.com/{id}#review` URL 기반 리뷰 수집. 대시보드부터 전 페이지까지 한 번에 전파.
2. **`/settings/profile` 서버 동기화**: `/settings` 에서 플랫폼을 연결해도 `/settings/profile` 이 로컬스토리지만 참조해 "방금 연결한 플랫폼이 프로필에 안 뜨는" 이슈. 28차 아키텍처(stores = 단일 진실원) 일관성 회복.
3. **카카오맵 공개 리뷰 수집 MVP**: 네이버의 `/api/place/reviews/fetch` 가 네이버 전용이라 카카오 전용 수집기가 필요. 로그인 기반 전체 수집은 Worker 적재, 우선은 panel3 임베디드 최근 리뷰(3~5건)로 MVP.

### 변경 내역

#### 31차-1 — Kakao Map 플랫폼 전파 (9 파일)

**app/lib/platform-credentials.ts**
- `PLATFORM_SLUGS` 에 `kakao_map` 추가
- `PLATFORM_LABEL` 에 `kakao_map: '카카오맵'` 추가
- 암호화/저장 패스 재활용 (AES-256-GCM)

**app/lib/connections.ts**
- `CANONICAL_MAP` 에 `kakao_map → kakao` 정규화 엔트리
- `buildPlaceUrl(kakao_map, id)` → `https://place.map.kakao.com/{id}#review` 자동 생성

**app/my/platforms/page.tsx**
- `PLATFORMS` 배열에 카카오맵 카드(🟡 #FEE500) 추가
- `/my/platforms/kakao_map/connect` 로 라우팅

**app/my/platforms/[platform]/connect/page.tsx**
- `PLATFORM_META.kakao_map` 등록 (라벨/로고 placeholder/가이드 문구 포함)
- placeholder: `https://place.map.kakao.com/616380187`

**app/api/review-reply/bulk-draft/route.ts**
- `VALID_PLATFORMS` 에 `kakao_map` 추가해 일괄 초안 생성 파이프도 5플랫폼 지원

**app/review-admin/page.tsx**
- `slugToKey()` 매핑에 `kakao_map → kakao` 추가 → 허브 카드에서 카카오맵 행 표시

**app/review-admin/kakao/page.tsx (NEW wrapper)**
- `PlatformReviewAdmin` 공통 컴포넌트 호출 + `collectEndpoint: '/api/place/kakao/collect'` 지정
- `supportsFetch: true` 로 공개 수집 버튼 활성화 (색: #FEE500, bg: #FFFBE5)

**app/dashboard/page.tsx**
- `KakaoMapLogo` 컴포넌트 (🟡 원형 이니셜 "카")
- 플랫폼 요약 행 / 연결 모달 / 상세 모달 전부 `kakao_map` 분기 추가
- ConnectModal `apiEndpoint` 에 `kakao_map → /api/platforms/kakao` 라인 (legacy stub 체계 유지)
- 더미 데이터 "카카오맵" 행 제거 → 연결 상태 기반 동적 렌더

**worker/src/jobs/index.ts**
- `Platform` 유니온 타입에 `kakao_map` 추가
- `run()` 스위치에 `case 'kakao_map': return stubRun('KakaoMapAdapter', ...)` 추가 (실제 Playwright 어댑터는 23차-5 후속)

#### 31차-2 — /settings/profile 서버 단일 진실원 동기화

**app/settings/profile/page.tsx (전체 재작성)**
- `loadServer()` 콜백: mount 시 `/api/stores/me` GET → store.name/description/address/hours/phone 으로 폼 초기화
- `connectedPlatforms` 파생 상태: `platforms[]` 중 `connected || review_count > 0` 필터링, `PLATFORM_COLOR` 맵으로 뱃지 컬러 렌더
- `handleSave()`: `/api/stores/register` POST 로 서버 upsert + 로컬스토리지 병기 유지 (캐시 워밍용)
- 연결 플랫폼 섹션 신설: 뱃지 UI (naver_place=초록 / kakao_map=노랑 / baemin=민트 / yogiyo=빨강 / coupangeats=파랑)
- 로컬전용 코드 제거 → 항상 서버가 진실원, 로컬은 fallback

#### 31차-3 — 카카오맵 공개 리뷰 수집기 (panel3 기반)

**app/lib/kakao-place.ts (NEW · 7KB)**
- `extractKakaoPlaceId(input)`: URL/숫자 양방향 파싱
- `lookupKakaoPlace(input)`: 장소 메타(이름/주소/별점/리뷰수/좌표) 조회 — verify 용
- `fetchKakaoVisitorReviews(placeId)`: panel3 JSON `kakaomap_review.reviews[]` 파싱 → `{reviewId, authorName, rating, body, visitedAt, postedAt, photos[]}` 배열
- **핵심 발견: `pf: web` 헤더 필수** — `Accept: application/json` 만으로는 406 Not Acceptable. `pf: web` 헤더가 있어야 JSON 응답 해금. curl 로 헤더 조합 실험으로 확인.
- `parseDateKST()`: `"2026-04-21 18:42:38"` → ISO KST 변환

**app/api/place/kakao/collect/route.ts (NEW)**
- `POST` — body `{ place_id? }` 수용, 없으면 자동 탐색: `platform_credentials(platform='kakao_map').platform_store_id` → `stores.kakao_place_id` 순
- 공개 리뷰 UPSERT: `platform_reviews` 테이블에 `onConflict: 'platform,platform_review_id'` 로 멱등 저장
- `author_mask()` 로 닉네임 마스킹(앞 1글자 + *** + 끝 1글자), 원문도 `author_name` 에 저장
- `raw_snapshot` 에 panel3 원본 JSON 보존
- `GET` — `?place={url|id}` 로 lookup verify 용도 (저장 안 함)
- `requireUser()` 기반 인증, `runtime = 'nodejs'` 고정

**app/review-admin/components/PlatformReviewAdmin.tsx**
- `PlatformConfig` 에 `collectEndpoint?: string` 옵션 추가
- `collectNow()` 수정: `const endpoint = config.collectEndpoint || '/api/place/reviews/fetch'` — 기본은 네이버용, 카카오는 custom 지정
- 이후 다른 플랫폼(배민/요기요/쿠팡)도 공개 수집기 생기면 `collectEndpoint` 만 덮으면 됨 → 확장성 확보

### panel3 API 발견 로그
1. 초기 `https://place-api.map.kakao.com/places/panel3/{id}` 직접 호출 → 406 Not Acceptable
2. `User-Agent: Mozilla/5.0 (...)` 만 추가 → 여전히 406
3. `Accept: application/json` 추가 → 여전히 406
4. **`pf: web` 헤더 추가 → 200 OK + JSON 반환** ✅
5. `kakaomap_review.reviews[]` 에 최근 3~5건 포함, 각 리뷰 `contents / star_rating / photos / meta.owner.nickname / meta.visit_date`
6. 페이지네이션 엔드포인트 `.../reviews` `.../kakaomapReviews` 양쪽 404 — panel3 임베디드만 공개 API. 전체 이력은 Worker 로그인 필요.

### 배포 정보
- `scripts/push_31_kakao_map.js` — 13 파일 일괄 PUT (dotenv 부트스트랩 · sha 선조회 · 커밋별 메시지 분리)
- 배포 결과: 13/13 모두 성공
  - `app/lib/platform-credentials.ts` — `bfc4cf3`
  - `app/lib/connections.ts` — `4b9088f`
  - `app/my/platforms/page.tsx` — `6b59ee3`
  - `app/my/platforms/[platform]/connect/page.tsx` — `02f46a3`
  - `app/api/review-reply/bulk-draft/route.ts` — `9965d32`
  - `app/lib/kakao-place.ts` — `9271f4f`
  - `app/api/place/kakao/collect/route.ts` — `4a7b5af`
  - `app/review-admin/components/PlatformReviewAdmin.tsx` — `5d42435`
  - `app/review-admin/kakao/page.tsx` — `43aa6c2`
  - `app/review-admin/page.tsx` — `0f5e574`
  - `app/dashboard/page.tsx` — `6ac3aa5`
  - `worker/src/jobs/index.ts` — `716bd70`
  - `app/settings/profile/page.tsx` — `c0f4a07`

### 영향 범위
- **`/my/platforms`**: 카카오맵 카드 추가 (5개 타일 그리드)
- **`/my/platforms/kakao_map/connect`**: 아이디/비번 + 카카오맵 URL 입력 폼 (PLATFORM_META 기반)
- **`/review-admin`**: 허브 카드에 카카오맵 행 표시
- **`/review-admin/kakao`**: 공개 수집 버튼 + 초안 생성/편집/등록 2단 플로우 즉시 동작
- **`/dashboard`**: 상단 플랫폼 요약 / 연결 모달 / 상세 모달 카카오맵 분기
- **`/settings/profile`**: 서버 동기화 완료 → 어디서 연결하든 프로필에서 뱃지로 확인
- **Worker**: `kakao_map` 작업이 들어와도 stub 이라 에러 없이 skip (adapter 완성 대기)
- **DB**: `platform_reviews.platform = 'kakao_map'` 행 수집 시작 (수집 버튼 1회 누르면 최근 3~5건 UPSERT)

### 다음 단계 (미해결)
- Kakao JS 키 수동 등록 완료 후 `/dashboard` + `/settings` SmartMapBox 카카오맵 카드 실제 지도 렌더 확인
- `KakaoMapAdapter` (Railway Worker) Playwright 로그인 + 전체 리뷰 이력 수집 어댑터 구현 (23차-5 후속)
- panel3 응답에 `tips[]` (다른 종류의 리뷰 블록) 포함되는 경우 있음 — 필요 시 `fetchKakaoVisitorReviews` 에 `tips` 병합 로직 추가
- `cron/collect-all` 추가 시 `'kakao_map'` 도 루프에 포함해 자동 수집 스케줄링

---

*최종 업데이트: 2026-04-22 31차 배포 완료 (Kakao Map 5번째 플랫폼 통합 + /settings/profile 서버 동기화 + panel3 공개 수집기)*
