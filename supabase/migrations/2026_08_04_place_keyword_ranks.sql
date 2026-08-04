-- ============================================================
-- 2026-08-04 · 플레이스 키워드 순위 추적 (AdRank 벤치마킹 Phase 0)
--
-- 배경:
--   · 로컬루션에는 "네이버 플레이스 키워드 순위"를 실측·저장하는
--     파이프라인이 없었다.
--     - /marketing/keyword-rank, /marketing/keyword-score 는 100% 목업
--     - place_snapshots 는 리뷰수·평점만 저장 (rank 컬럼 자체가 없음)
--   · 블로그 순위(blog_tracking_*)는 이미 시계열까지 완비되어 있으므로
--     그 구조를 플레이스로 복제한다.
--
-- 신규 테이블 2개:
--   1) place_keyword_targets — "어떤 매장의 어떤 키워드를 추적할지"
--   2) place_keyword_ranks   — 그 키워드의 일자별 순위·점수 시계열
--
-- RLS 정책:
--   이 프로젝트는 Supabase Auth 가 아닌 자체 인증(localution_user, text id)을
--   쓰므로 auth.uid()(uuid) 기반 RLS 가 동작하지 않는다.
--   기존 마이그레이션(2026_05_03_user_id_text.sql, 30cha13_*)과 동일하게
--   RLS 를 끄고 service role API 계층에서 user_id 를 검증한다.
--
-- 실행: Supabase Dashboard → SQL Editor → 아래 전체 붙여넣기 → Run
-- 재실행 안전 (idempotent)
-- ============================================================

-- ── 1) 추적 대상 키워드 ──────────────────────────────────────
create table if not exists public.place_keyword_targets (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  target_id   uuid not null references public.place_targets(id) on delete cascade,
  keyword     text not null,
  enabled     boolean not null default true,
  -- 마지막 수집 결과 캐시 (목록 화면에서 조인 없이 바로 보여주기 위함)
  last_rank   integer,
  last_score  numeric(5,2),
  last_checked_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint place_keyword_targets_keyword_not_blank check (length(btrim(keyword)) > 0),
  constraint place_keyword_targets_uniq unique (target_id, keyword)
);

create index if not exists idx_pkt_user      on public.place_keyword_targets (user_id);
create index if not exists idx_pkt_target    on public.place_keyword_targets (target_id);
create index if not exists idx_pkt_enabled   on public.place_keyword_targets (enabled, updated_at);

-- ── 2) 순위 시계열 ──────────────────────────────────────────
create table if not exists public.place_keyword_ranks (
  id                bigserial primary key,
  keyword_target_id uuid not null references public.place_keyword_targets(id) on delete cascade,
  user_id           text not null,
  target_id         uuid not null,
  keyword           text not null,
  -- 순위: 1~100. 미노출이면 null (0 아님 — 0 과 미노출을 구분해야 함)
  rank              integer,
  -- 스캔한 후보 총 개수
  total             integer,
  -- 노출점수 0~100 (app/lib/place-score.ts 산식)
  score             numeric(5,2),
  -- 점수 계산에 쓰인 원자료 (나중에 산식이 바뀌어도 재계산 가능하게 보존)
  visitor_review_count integer,
  blog_review_count    integer,
  rating               numeric(3,2),
  -- 어떤 전략으로 측정했는지: map_api | mobile_list | local_openapi | none
  method            text,
  source            text not null default 'cron',
  note              text,
  ts                timestamptz not null default now(),
  constraint place_keyword_ranks_rank_range check (rank is null or (rank >= 1 and rank <= 1000)),
  constraint place_keyword_ranks_source_check check (source in ('cron', 'manual', 'import'))
);

-- 차트·표 조회 패턴: 특정 키워드의 최근 N일치를 시간 내림차순으로
create index if not exists idx_pkr_kt_ts     on public.place_keyword_ranks (keyword_target_id, ts desc);
create index if not exists idx_pkr_target_ts on public.place_keyword_ranks (target_id, ts desc);
create index if not exists idx_pkr_user_ts   on public.place_keyword_ranks (user_id, ts desc);

-- ── 3) RLS 비활성 (service role API 에서 user_id 검증) ──────
alter table public.place_keyword_targets disable row level security;
alter table public.place_keyword_ranks   disable row level security;

-- ── 4) 최신 1건 뷰 (목록 화면용) ────────────────────────────
create or replace view public.place_keyword_latest as
select distinct on (r.keyword_target_id)
  r.keyword_target_id,
  r.user_id,
  r.target_id,
  r.keyword,
  r.rank,
  r.total,
  r.score,
  r.visitor_review_count,
  r.blog_review_count,
  r.rating,
  r.method,
  r.ts
from public.place_keyword_ranks r
order by r.keyword_target_id, r.ts desc;

-- ── 5) PostgREST 스키마 캐시 리로드 ─────────────────────────
notify pgrst, 'reload schema';

-- 끝.
