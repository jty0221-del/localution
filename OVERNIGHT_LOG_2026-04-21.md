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

*최종 업데이트: 2026-04-22 28차 완료*
