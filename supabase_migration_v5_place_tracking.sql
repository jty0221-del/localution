-- ============================================================
-- 로컬루션 22차-2 · 네이버 플레이스 추적 (place_targets + place_snapshots)
-- ============================================================
--
-- 기능
--   - 사용자가 등록한 네이버 플레이스 지점 지속 모니터링
--   - 리뷰수/평점/카테고리 등 스냅샷 일자별 저장 → 추이 차트
--   - 수동 즉시 새로고침 + 매일 자동 크론 체크 (B-2)
--   - 사용자별 RLS 분리 (user_id = text, Google OAuth sub)
--
-- 실행
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체 복사 → Run
--   3) 재실행 안전 (IF NOT EXISTS / OR REPLACE)
--
-- 참조 메모리
--   - feedback_supabase_user_id_type.md → user_id text 사용
--   - feedback_api_secondary_query_isolation.md → 부차 쿼리 격리
-- ============================================================

-- ----- 1. 추적 타겟 테이블 -----
CREATE TABLE IF NOT EXISTS public.place_targets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  place_id        text NOT NULL,                       -- 네이버 placeId (숫자 문자열)
  category        text NOT NULL DEFAULT 'restaurant',  -- URL path 용 카테고리 (lookup 시 hint)
  category_name   text,                                -- 실제 업종명 (JSON category)
  name            text NOT NULL,
  road_address    text,
  phone           text,
  thumbnail_url   text,
  memo            text,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS place_targets_user_enabled_idx
  ON public.place_targets (user_id, enabled);

-- ----- 2. 스냅샷 이력 테이블 -----
CREATE TABLE IF NOT EXISTS public.place_snapshots (
  id                    bigserial PRIMARY KEY,
  target_id             uuid NOT NULL REFERENCES public.place_targets(id) ON DELETE CASCADE,
  user_id               text NOT NULL,                -- RLS 편의상 중복 저장
  place_id              text NOT NULL,
  ts                    timestamptz NOT NULL DEFAULT now(),
  visitor_review_count  int,
  blog_review_count     int,
  rating                numeric(3,2),
  photo_count           int,
  save_count            int,
  place_score           numeric(5,2),                  -- 체크리스트 점수 저장 (선택)
  source                text NOT NULL DEFAULT 'manual',-- manual | cron | import
  raw_info              jsonb,                         -- PlaceInfo 원본 보관
  note                  text
);

CREATE INDEX IF NOT EXISTS place_snapshots_target_ts_idx
  ON public.place_snapshots (target_id, ts DESC);

CREATE INDEX IF NOT EXISTS place_snapshots_user_ts_idx
  ON public.place_snapshots (user_id, ts DESC);

CREATE INDEX IF NOT EXISTS place_snapshots_place_ts_idx
  ON public.place_snapshots (place_id, ts DESC);

-- ----- 3. updated_at 자동 갱신 트리거 -----
CREATE OR REPLACE FUNCTION public.touch_place_targets()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_place_targets_touch ON public.place_targets;
CREATE TRIGGER trg_place_targets_touch
  BEFORE UPDATE ON public.place_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_place_targets();

-- ----- 4. RLS (auth.uid()::text 비교 패턴) -----
ALTER TABLE public.place_targets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_snapshots ENABLE ROW LEVEL SECURITY;

-- targets: 본인 행만 CRUD
DROP POLICY IF EXISTS "pt_select_own" ON public.place_targets;
CREATE POLICY "pt_select_own" ON public.place_targets
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "pt_insert_own" ON public.place_targets;
CREATE POLICY "pt_insert_own" ON public.place_targets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "pt_update_own" ON public.place_targets;
CREATE POLICY "pt_update_own" ON public.place_targets
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "pt_delete_own" ON public.place_targets;
CREATE POLICY "pt_delete_own" ON public.place_targets
  FOR DELETE USING (auth.uid()::text = user_id);

-- snapshots: 본인 것만 SELECT/INSERT (DELETE는 target CASCADE 로 처리)
DROP POLICY IF EXISTS "ps_select_own" ON public.place_snapshots;
CREATE POLICY "ps_select_own" ON public.place_snapshots
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "ps_insert_own" ON public.place_snapshots;
CREATE POLICY "ps_insert_own" ON public.place_snapshots
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ----- 5. 최신 스냅샷 뷰 (target당 가장 최근 1개) -----
DROP VIEW IF EXISTS public.place_snapshots_latest;
CREATE VIEW public.place_snapshots_latest AS
  SELECT DISTINCT ON (target_id)
    id,
    target_id,
    user_id,
    place_id,
    ts,
    visitor_review_count,
    blog_review_count,
    rating,
    photo_count,
    save_count,
    place_score,
    source
  FROM public.place_snapshots
  ORDER BY target_id, ts DESC;

-- ----- 6. 타겟 + 최신 스냅샷 조인 뷰 (UI 한방 쿼리용) -----
DROP VIEW IF EXISTS public.place_targets_with_latest;
CREATE VIEW public.place_targets_with_latest AS
  SELECT
    t.id,
    t.user_id,
    t.place_id,
    t.category,
    t.category_name,
    t.name,
    t.road_address,
    t.phone,
    t.thumbnail_url,
    t.memo,
    t.enabled,
    t.created_at,
    t.updated_at,
    s.ts                    AS last_ts,
    s.visitor_review_count  AS last_visitor_review,
    s.blog_review_count     AS last_blog_review,
    s.rating                AS last_rating,
    s.place_score           AS last_place_score,
    s.source                AS last_source
  FROM public.place_targets t
  LEFT JOIN public.place_snapshots_latest s ON s.target_id = t.id;

-- ============================================================
-- 실행 검증 쿼리 (선택)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name IN ('place_targets','place_snapshots');
-- SELECT policyname FROM pg_policies WHERE tablename IN ('place_targets','place_snapshots');
