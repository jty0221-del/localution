-- ============================================================
-- 2026-08-19 · 경쟁 매장 스냅샷 + 매장 지표 확장 (P2)
--
-- 배경:
--   P0 의 순위 스캐너는 키워드 검색 결과 목록을 통째로 받아온 뒤
--   "내 매장이 몇 번째인가" 만 찾고 나머지를 버렸다.
--   그런데 AdRank / Lumain 이 보여주는 지표는 대부분 경쟁사 대비 상대값이다.
--     · 영수증 리뷰 경쟁률 = 내 방문자리뷰 / TOP10 평균
--     · 블로그 콘텐츠 경쟁률 = 내 블로그리뷰 / TOP10 평균
--     · 검색 깊이 위치 = 내 순위 / 전체 노출 수
--   즉 경쟁 매장 데이터를 저장하지 않으면 이 지표들을 만들 수 없다.
--
-- 이 마이그레이션이 하는 일:
--   1) place_keyword_competitors — 키워드별 상위 경쟁 매장 스냅샷
--   2) place_keyword_ranks 에 파생 지표 컬럼 추가
--   3) place_keyword_targets 에 최신 종합경쟁력 캐시 추가
--
-- RLS: 기존 패턴대로 비활성 (자체 인증 → service role API 에서 user_id 검증)
--
-- 실행: Supabase Dashboard → SQL Editor → 아래 전체 붙여넣기 → Run
-- 재실행 안전 (idempotent)
-- ============================================================

-- ── 1) 경쟁 매장 스냅샷 ──────────────────────────────────────
create table if not exists public.place_keyword_competitors (
  id                bigserial primary key,
  keyword_target_id uuid not null references public.place_keyword_targets(id) on delete cascade,
  user_id           text not null,
  target_id         uuid not null,
  keyword           text not null,
  -- 수집 회차 묶음 — 같은 스캔에서 나온 경쟁사들을 한 덩어리로 조회하기 위함
  batch_ts          timestamptz not null default now(),
  -- 검색 결과에서의 순위 (1-base)
  rank              integer not null,
  place_id          text,
  name              text,
  -- 경쟁사 지표 (검색 응답에 있으면 채우고, 없으면 null)
  visitor_review_count integer,
  blog_review_count    integer,
  rating               numeric(3,2),
  category             text,
  -- 네이버가 응답에 실어 보내는 노출 점수 (totalScore 계열).
  -- 2026-08-19 확인: 이 값 정렬 순서 = 실제 순위. 추정치가 아니라 네이버의 정렬 키.
  -- 비공식 필드라 없을 수 있음 → null 허용, 그때는 자체 산식으로 폴백.
  naver_score          numeric(8,3),
  -- 내 매장인지 표시 — 표에서 하이라이트할 때 사용
  is_mine           boolean not null default false,
  constraint pkc_rank_range check (rank >= 1 and rank <= 1000)
);

create index if not exists idx_pkc_kt_batch  on public.place_keyword_competitors (keyword_target_id, batch_ts desc, rank);
create index if not exists idx_pkc_user      on public.place_keyword_competitors (user_id, batch_ts desc);

-- ── 2) place_keyword_ranks 파생 지표 컬럼 ───────────────────
-- 매번 조인해서 계산하지 않도록 수집 시점에 미리 계산해 둔다.
alter table public.place_keyword_ranks
  add column if not exists save_count            integer,
  add column if not exists photo_count           integer,
  -- 네이버가 직접 준 노출 점수. 있으면 이게 '확정' 지표이고,
  -- 없을 때만 score(자체 산식, '추정')를 대표값으로 쓴다.
  add column if not exists naver_score           numeric(8,3),
  -- 대표 점수의 출처: 'naver' | 'formula' — 화면에서 확정/추정 배지 분기에 사용
  add column if not exists score_source          text,
  -- 경쟁 지표 (전부 0~999 범위의 퍼센트 또는 지수)
  add column if not exists visitor_competitive_pct numeric(7,2),  -- 영수증 리뷰 경쟁률 %
  add column if not exists blog_competitive_pct    numeric(7,2),  -- 블로그 콘텐츠 경쟁률 %
  add column if not exists depth_percentile        numeric(5,2),  -- 검색 깊이 상위 N%
  add column if not exists save_conversion         numeric(7,2),  -- 저장/리뷰 전환 신호
  add column if not exists relevance_signal        numeric(5,2),  -- 카테고리·키워드 연관 신호
  add column if not exists competitiveness         numeric(5,2),  -- 종합 경쟁력 (0~100)
  add column if not exists competitor_count        integer;       -- 비교에 쓴 경쟁사 수

-- ── 3) 매장 스냅샷에도 저장수·사진수 파싱 결과를 쓰기 시작 ──
-- (컬럼은 이미 supabase_migration_v5 에 있으나 미사용 상태였음 — 주석만 남김)
comment on column public.place_snapshots.save_count  is '네이버 플레이스 저장 수 (2026-08-19 부터 수집 시작)';
comment on column public.place_snapshots.photo_count is '네이버 플레이스 사진 수 (2026-08-19 부터 수집 시작)';
comment on column public.place_snapshots.place_score is '매장 기본 점수 0~100 — 순위 제외, app/lib/place-score.ts calcStoreScore()';

-- ── 4) 키워드 타겟에 최신 종합경쟁력 캐시 ───────────────────
alter table public.place_keyword_targets
  add column if not exists last_competitiveness numeric(5,2);

-- ── 5) RLS 비활성 ───────────────────────────────────────────
alter table public.place_keyword_competitors disable row level security;

-- ── 6) 최신 경쟁사 배치 뷰 ──────────────────────────────────
-- 키워드별로 가장 최근 스캔의 경쟁사 목록만 뽑는다.
create or replace view public.place_keyword_competitors_latest as
select c.*
from public.place_keyword_competitors c
join (
  select keyword_target_id, max(batch_ts) as max_ts
  from public.place_keyword_competitors
  group by keyword_target_id
) m
  on m.keyword_target_id = c.keyword_target_id
 and m.max_ts = c.batch_ts;

-- ── 7) PostgREST 스키마 캐시 리로드 ─────────────────────────
notify pgrst, 'reload schema';

-- 끝.
