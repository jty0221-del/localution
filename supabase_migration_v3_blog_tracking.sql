-- ============================================================
-- 로컬루션 18차-1 · 블로그/체험단 글 키워드 순위 추적
-- ============================================================
--
-- 기능
--   - 체험단·직접 발행 블로그 글의 네이버 통합검색 인기글 순위 추적
--   - 수동 즉시 조회 + 매일 자동 크론 체크
--   - 사용자별 RLS 분리
--
-- 실행
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체 복사 → Run
--   3) 재실행 안전 (IF NOT EXISTS / OR REPLACE)
--
-- 의존 테이블
--   - auth.users (user_id FK)
-- ============================================================

-- ----- 1. 추적 타겟 테이블 -----
CREATE TABLE IF NOT EXISTS public.blog_tracking_targets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL,                       -- 표시용 라벨 ("4월 강남 식당 체험단 1번")
  keyword     text NOT NULL,                       -- 검색 키워드
  target_url  text NOT NULL,                       -- 원본 블로그 글 URL
  blog_id     text NOT NULL,                       -- blog.naver.com/{blogId}
  post_id     text NOT NULL,                       -- 숫자 postId
  memo        text,
  tags        text[] DEFAULT '{}'::text[],         -- 체험단/직영/광고 등 라벨링
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword, target_url)            -- 같은 사용자가 동일 (키워드,URL) 중복 등록 방지
);

CREATE INDEX IF NOT EXISTS blog_tracking_targets_user_active_idx
  ON public.blog_tracking_targets (user_id, active);

-- ----- 2. 순위 체크 이력 테이블 -----
CREATE TABLE IF NOT EXISTS public.blog_tracking_history (
  id          bigserial PRIMARY KEY,
  target_id   uuid NOT NULL REFERENCES public.blog_tracking_targets(id) ON DELETE CASCADE,
  checked_at  timestamptz NOT NULL DEFAULT now(),
  rank        int,                                  -- NULL = 미노출
  section     text NOT NULL DEFAULT 'popular_post', -- popular_post | blog_tab | not_found
  source      text NOT NULL DEFAULT 'naver_mobile', -- 어디서 크롤링했는지 (향후 pc 추가)
  total_found int,                                  -- 해당 키워드 노출 총 개수 (디버그용)
  note        text                                  -- 오류시 메시지
);

CREATE INDEX IF NOT EXISTS blog_tracking_history_target_checked_idx
  ON public.blog_tracking_history (target_id, checked_at DESC);

-- ----- 3. updated_at 자동 갱신 트리거 -----
CREATE OR REPLACE FUNCTION public.touch_blog_tracking_targets()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_blog_tracking_targets_touch ON public.blog_tracking_targets;
CREATE TRIGGER trg_blog_tracking_targets_touch
  BEFORE UPDATE ON public.blog_tracking_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_blog_tracking_targets();

-- ----- 4. RLS -----
ALTER TABLE public.blog_tracking_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tracking_history ENABLE ROW LEVEL SECURITY;

-- targets: 본인 행만 CRUD
DROP POLICY IF EXISTS "btt_select_own" ON public.blog_tracking_targets;
CREATE POLICY "btt_select_own" ON public.blog_tracking_targets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "btt_insert_own" ON public.blog_tracking_targets;
CREATE POLICY "btt_insert_own" ON public.blog_tracking_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "btt_update_own" ON public.blog_tracking_targets;
CREATE POLICY "btt_update_own" ON public.blog_tracking_targets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "btt_delete_own" ON public.blog_tracking_targets;
CREATE POLICY "btt_delete_own" ON public.blog_tracking_targets
  FOR DELETE USING (auth.uid() = user_id);

-- history: 본인 타겟의 이력만 조회, 쓰기는 서비스 롤(크론 + API)
DROP POLICY IF EXISTS "bth_select_own" ON public.blog_tracking_history;
CREATE POLICY "bth_select_own" ON public.blog_tracking_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_tracking_targets t
      WHERE t.id = blog_tracking_history.target_id
        AND t.user_id = auth.uid()
    )
  );

-- insert는 service_role 로만 (API 라우트에서 supabaseAdmin 사용)
DROP POLICY IF EXISTS "bth_insert_none" ON public.blog_tracking_history;
CREATE POLICY "bth_insert_none" ON public.blog_tracking_history
  FOR INSERT WITH CHECK (false);

-- ----- 5. 최신 순위 조회 뷰 (UI에서 간단 사용) -----
CREATE OR REPLACE VIEW public.blog_tracking_latest AS
SELECT
  t.id              AS target_id,
  t.user_id,
  t.label,
  t.keyword,
  t.target_url,
  t.blog_id,
  t.post_id,
  t.tags,
  t.active,
  t.created_at,
  h.rank            AS latest_rank,
  h.section         AS latest_section,
  h.checked_at      AS latest_checked_at,
  h.total_found     AS latest_total_found
FROM public.blog_tracking_targets t
LEFT JOIN LATERAL (
  SELECT rank, section, checked_at, total_found
  FROM public.blog_tracking_history
  WHERE target_id = t.id
  ORDER BY checked_at DESC
  LIMIT 1
) h ON true;

-- 뷰에는 RLS 상속 (Supabase 는 뷰에 security_invoker 필요 · PG15+)
ALTER VIEW public.blog_tracking_latest SET (security_invoker = true);

-- ============================================================
-- 완료: SELECT * FROM blog_tracking_latest; (본인 행만 반환되어야 함)
-- ============================================================
