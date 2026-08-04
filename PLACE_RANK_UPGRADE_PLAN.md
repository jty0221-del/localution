# 플레이스 순위 기능 업그레이드 플랜 (AdRank 벤치마킹)

> **작성일** 2026-08-04
> **목표 기간** 약 4주 (여유롭게, Phase 단위로 하나씩 배포·확인)
> **벤치마크** AdRank (new.adrank.co.kr) — 사장님이 지정한 7개 화면
> **원칙** 한 Phase = 한 PR = 한 배포. 배포 후 사장님 확인 → 다음 Phase.

---

## 0. 현재 상태 진단 (2026-08-04 조사 결과)

### 0-1. 페이지별 실태

| 페이지 | 사이드바 라벨 | 실데이터 여부 | 순위(rank) |
|---|---|---|---|
| `app/marketing/place` | 플레이스 진단 | 실데이터 (스크래핑+DB) | 없음 — 리뷰수·평점만 |
| `app/marketing/keyword-rank` | 플레이스(실시간) | **전부 목업** (API 호출 0개) | 하드코딩 |
| `app/marketing/keyword-score` | 플레이스 분석 | **전부 목업** (API 호출 0개) | 하드코딩 |
| `app/marketing/naver-ads` | 키워드 조회/분석 | 실데이터 (네이버 광고 API) | 해당없음 (입찰가 순위) |

**결론: 플레이스 키워드 순위를 실측·저장하는 파이프라인이 존재하지 않는다.**
목업 두 페이지는 스스로 "데모" 배너를 띄우고 있음.

### 0-2. 이미 있어서 재활용 가능한 자산

| 자산 | 경로 | 상태 |
|---|---|---|
| 순위 스캔 로직 | `app/api/naver-rank/route.ts` | **완성됐으나 고아** — 지역검색 API로 1~100위 상호명 매칭 |
| 추적 대상 테이블 | `place_targets` | 사용 중 (user_id + place_id UNIQUE) |
| 스냅샷 테이블 | `place_snapshots` | 사용 중. `place_score` / `photo_count` / `save_count` 컬럼은 **스키마에만 있고 미사용** |
| 일일 크론 | `app/api/cron/place-tracking-daily` | 가동 중 (KST 05:30, 최대 30타겟/회) |
| 진입·이탈 판정 로직 | `app/lib/rank-events.ts` | `bandOf()` / `deriveEvent()` — entered / dropped / band_change |
| **참조 모델 (완성형)** | `blog_tracking_*` 3테이블 + `app/lib/naver-rank.ts` + `cron/blog-tracking-daily` | 블로그 순위는 시계열까지 완비 |
| 차트 | 인라인 SVG 관행 (`SparklineChart`, `TrendChart`) | recharts는 설치돼 있으나 마케팅 페이지에선 미사용 |

### 0-3. 없어서 새로 만들어야 하는 것

1. **키워드별 순위 시계열 저장소** — `place_keyword_targets` + `place_keyword_ranks`
2. **노출점수 산식** — AdRank의 "점수"에 해당하는 자체 공식
3. **키워드 순위 일일 크론** — `/api/naver-rank` 를 실제로 호출하는 주체

---

## 1. Phase 로드맵

각 Phase 는 독립 배포 가능. 앞 Phase 완료 후 다음으로.

| Phase | 내용 | 의존 | 예상 |
|---|---|---|---|
| **P0** | 순위 데이터 파이프라인 (DB + API + 크론 + 점수 산식) | — | 1일 |
| **P1** | 플레이스 모니터링 — 카드 그리드 (keyword-rank 실데이터 전환) | P0 | 1일 |
| **P2** | 대시보드 순위 요약 위젯 (KPI 4카드 + 7일 표) | P0 | 0.5일 |
| **P3** | 플레이스 진단 리뉴얼 (추이 차트 + 레이더 + 히트맵) | P0 | 1.5일 |
| **P4** | 플레이스 분석 — 경쟁 매장 정렬표 (keyword-score 실데이터 전환) | P0 | 1.5일 |
| **P5** | 통합검색 — 여러 키워드 그룹 비교 | P0 | 1일 |
| **P6** | 파워링크 키워드 조합 생성기 | 없음 (독립) | 0.5일 |
| **P7** | 요금제 페이지 리뉴얼 | 없음 (독립) | 0.5일 |

**P6 / P7 은 백엔드 의존이 전혀 없어** 언제든 끼워 넣을 수 있음 (사장님이 급하면 먼저 진행 가능).

---

## 2. Phase 0 — 순위 데이터 파이프라인 (선행 필수)

이게 없으면 P1~P5 의 모든 차트가 또 가짜 데이터가 된다.

### 2-1. 신규 테이블 2개

```
place_keyword_targets
  id            uuid pk
  user_id       text
  target_id     uuid  -> place_targets(id) CASCADE
  keyword       text        -- 예: "부천 가발"
  enabled       bool default true
  created_at    timestamptz
  updated_at    timestamptz
  UNIQUE(target_id, keyword)

place_keyword_ranks
  id            bigserial pk
  keyword_target_id uuid -> place_keyword_targets(id) CASCADE
  user_id       text
  target_id     uuid
  keyword       text
  rank          int         -- 1~100, 미노출은 null
  total         int         -- 스캔한 총 후보 수
  score         numeric(5,2)-- 노출점수 (아래 산식)
  visitor_review_count int
  blog_review_count    int
  rating        numeric(3,2)
  source        text        -- 'cron' | 'manual'
  ts            timestamptz default now()
  INDEX (target_id, keyword, ts DESC)
```

`place_snapshots.place_score` 는 매장 전체 종합점수용으로 별도 활용.

### 2-2. 노출점수 산식 (자체 정의)

AdRank 의 점수는 그들 자체 모델이라 복제 불가. 로컬루션 공식은 투명하게 공개:

```
score = 40 * rankFactor + 25 * blogFactor + 25 * visitorFactor + 10 * ratingFactor

rankFactor    = rank 있으면 max(0, (101 - rank) / 100), 미노출이면 0
blogFactor    = min(1, log10(1 + blog_review_count) / 3)      -- 1000건 ≈ 만점
visitorFactor = min(1, log10(1 + visitor_review_count) / 3)
ratingFactor  = rating 있으면 (rating - 3) / 2 clamp 0~1, 없으면 0.5
```

- 0~100 범위
- 순위가 가장 큰 비중(40%) — 실제로 매출에 직결
- 리뷰는 로그 스케일 (1000건 매장과 5000건 매장 차이가 과대평가되지 않게)
- **산식은 `app/lib/place-score.ts` 한 곳에만 두고 서버·클라 공용**

### 2-3. 신규/수정 파일

| 파일 | 작업 |
|---|---|
| `supabase/migrations/2026_08_04_place_keyword_ranks.sql` | 신규 — 테이블 2개 + 인덱스 + RLS |
| `app/lib/place-score.ts` | 신규 — 점수 산식 단일 출처 |
| `app/api/place/keywords/route.ts` | 신규 — 키워드 타겟 CRUD (GET/POST/DELETE) |
| `app/api/place/keyword-rank/route.ts` | 신규 — 단건 즉시 조회 (수동 새로고침) |
| `app/api/place/keyword-history/route.ts` | 신규 — 키워드별 순위 시계열 조회 |
| `app/api/cron/place-rank-daily/route.ts` | 신규 — 일일 순위 수집 크론 |
| `vercel.json` | 크론 등록 (KST 06:00 = UTC 21:00) |

`/api/naver-rank` 의 스캔 로직은 `app/lib/place-rank.ts` 로 추출해 크론과 API 가 공유.

### 2-4. 사장님 수동 작업 1건

Supabase Dashboard → SQL Editor 에서 마이그레이션 SQL 실행 필요.
(파일 경로가 아니라 **파일 안의 SQL 내용**을 복사해서 붙여넣어야 함)

---

## 3. Phase 1 — 플레이스 모니터링 (카드 그리드)

**대상**: `app/marketing/keyword-rank/page.tsx` (목업 → 실데이터)

AdRank 화면 참고 요소:
- 상단 탭: 표 / 차트 / 요일 / 시트
- 검색 + 필터 + 등록 한도 표시 + "플레이스 등록" 버튼
- 2열 카드 그리드. 카드 1개 = 매장 1개
  - 썸네일 + 매장명 + 외부링크 아이콘
  - 키워드 선택 드롭다운
  - 새로고침 / 수정 버튼
  - 최근 7일 표: 일자 / 순위(변동) / 전체 / 블로그 / 방문자 / 점수

로컬루션 적용 시:
- 목업 `ROW_TEMPLATES` 전부 제거, `/api/place/keywords` + `/api/place/keyword-history` 연동
- 데모 배너 삭제
- 순위 색상 구간은 기존 로직 유지 (1~3 파랑 / 4~5 초록 / 6~10 주황 / 11~20 빨강 / 21+ 회색)
- 이모지 금지 → lucide 아이콘 (`RefreshCw`, `Pencil`, `ExternalLink`, `Plus`, `Filter`, `Download`)

---

## 4. Phase 2 — 대시보드 순위 요약 위젯

**대상**: `app/dashboard/page.tsx` (2250줄 — 기존 위젯 보존 주의)

추가 요소:
- **KPI 4카드** — `rank-events.ts` 의 `bandOf()` / `deriveEvent()` 재활용
  - TOP5 키워드 (진입률 %) — Trophy, 파랑
  - 신규 진입 (지난 7일) — TrendingUp, 레드
  - 이탈 (지난 7일) — TrendingDown, 앰버
  - 유지 (유지율 %) — CheckCircle2, 그린
- 매장 선택 드롭다운 + 최근 7일 순위 표

**주의**: `CLAUDE.md` 의 대시보드 보존 규칙 — `CommunityWidget`, `syncKeywordsFromRank()` 덮어쓰지 말 것.

---

## 5. Phase 3 — 플레이스 진단 리뉴얼

**대상**: `app/marketing/place/page.tsx` (907줄)

기존 34항목 체크리스트는 **유지**하고 그 위에 데이터 섹션 추가:

1. **순위·점수 이중축 라인차트** — 좌축 순위(역순, 1위가 위), 우축 점수
2. **리뷰 진단 / 종합 진단** 텍스트 요약 박스 (경고 / 주의 / 양호 3단계)
3. **상위 10개 매장 대비 레이더차트** — 블로그 / 방문자 / 점수 3축, 내 매장 vs 상위 평균
4. **변화 추이 3개 미니 area 차트** — 노출점수 / 방문자 리뷰 / 블로그 리뷰
5. **노출 키워드 히트맵 표** — 키워드 × 날짜, 순위 + 변동 화살표, 5위 이내 토글
6. **다음 액션 CTA 3개** — 경쟁 매장 분석 / 모니터링 등록 / 개선 가이드

차트는 레포 관행대로 **인라인 SVG 자체 구현** (recharts 안 씀).

---

## 6. Phase 4 — 플레이스 분석 (경쟁 매장 정렬표)

**대상**: `app/marketing/keyword-score/page.tsx` (목업 → 실데이터)

- 키워드 검색 + 분석 개수 선택(30/50/90) + 분석하기 버튼
- 메타 라인: 월간 검색량 (PC / 모바일) · 경쟁도 · 노출 페이지 수
  → `/api/marketing/naver-keyword-detail` 재활용 가능
- 정렬 가능 표: 순위 / 매장명 / 주소 / 방문리뷰 / 블로그리뷰 / 저장수 / 종합점수 / 순위점수
- **내 매장 행 하이라이트 + MY 배지**
- 급상승(10위 이상 상승) 행 하이라이트
- 각 수치 옆 전일 대비 변동 화살표

---

## 7. Phase 5 — 통합검색

여러 키워드를 그룹으로 묶어 한 화면에서 노출/미노출 비교.
- 탭: 표 / 시트
- 그룹 추가 / 월 선택
- 노출 N / 미노출 M 요약
- 빈 상태 UI (등록된 그룹 없음 + 그룹 추가 CTA)

---

## 8. Phase 6 — 파워링크 키워드 조합 생성기 (독립)

**백엔드 불필요. 순수 프론트 조합 로직.**

- STEP 1: 광고그룹 ID 입력 (선택)
- STEP 2: 키워드 4필드 (형용어구 / 지역·위치 / 서브 키워드 / 접미사)
- STEP 3: 조합 순서 선택 — 단일 4 / 2단 12 / 3단 24 / 4단 24 (순열)
- 조합 생성 → 결과 리스트 + CSV 다운로드
- 입찰가 조회 탭은 기존 `/api/marketing/naver-ads?type=bid` 재활용

신규 경로 제안: `app/marketing/powerlink/page.tsx`

---

## 9. Phase 7 — 요금제 페이지 리뉴얼 (독립)

- 3플랜 카드 (기간 토글 1/2/3개월, 할인 배지, MOST POPULAR 강조)
- 플랜별 기능 비교 표
- FAQ 아코디언

---

## 10. 공통 준수 사항 (CLAUDE.md)

- **이모지 절대 금지** — UI · 코드 · 문서 · 채팅 답변 전부. lucide-react 아이콘만.
- 아이콘 박스: `w-9 h-9 rounded-xl bg-gradient-to-br from-X to-Y shadow-sm` + 흰색 lucide `size={16} strokeWidth={2.5}`
- 색상: `#3182F6` 블루 / `#7C3AED` 퍼플 / `#059669` 그린 / `#F59E0B` 앰버 / `#DC2626` 레드
- 라운드: 카드 `rounded-2xl`, 버튼·입력 `rounded-xl`, 작은 박스 `rounded-lg`
- 그림자 `shadow-sm` 기본
- `PageHeader` 컴포넌트 사용 (icon / title / subtitle / variant / right / badge)
- 모바일 반응형 (`grid-cols-1 lg:grid-cols-2` 등)
- 기호는 `·` `→` `1)` `2)` 만 허용

---

## 11. 진행 기록

| Phase | 상태 | PR | 배포일 | 비고 |
|---|---|---|---|---|
| P0 | 대기 | — | — | Supabase 마이그레이션 수동 실행 필요 |
| P1 | 대기 | — | — | |
| P2 | 대기 | — | — | |
| P3 | 대기 | — | — | |
| P4 | 대기 | — | — | |
| P5 | 대기 | — | — | |
| P6 | 대기 | — | — | 독립 — 순서 조정 가능 |
| P7 | 대기 | — | — | 독립 — 순서 조정 가능 |

---

## 12. 운영 인프라 메모 (2026-07-31 사고 기록)

순위 수집은 외부 의존이 많아 아래 3개 결제가 끊기면 전부 멈춘다.

| 서비스 | 용도 | 끊기면 |
|---|---|---|
| Anthropic API | AI 답글 생성 | 답글 생성 실패 (HTTP 400 credit) |
| Railway | 워커 서버 (Playwright) | 답글 등록 큐 정체 |
| IPRoyal | 한국 주거용 프록시 | 네이버 접근 차단 (HTTP 402) |

**전부 자동 충전(auto top-up) 켜둘 것.** 순위 수집 크론도 같은 프록시를 쓰게 되면 동일 리스크를 가진다.
