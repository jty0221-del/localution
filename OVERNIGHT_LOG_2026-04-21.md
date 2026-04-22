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

*최종 업데이트: 2026-04-22 30차-18/19/20 배포 완료 (dashboard 리뷰 wipe 방지 + AI 답글 SEO·Vision + 원클릭 등록)*
