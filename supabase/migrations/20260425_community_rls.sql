-- ============================================================
-- 43차-1 · Community + Points RLS 활성화 (가드판 / 2026-04-25 갱신)
-- ============================================================
-- 배경
--   community_points.sql 122-127 라인의 RLS 가 주석으로 비활성 상태였다.
--   anon 키만으로도 INSERT/UPDATE/DELETE 가 가능해 게시판 변조 위험이 있었음.
--
-- 정책 원칙
--   · SELECT : 공개 게시판이므로 누구나 읽기 허용
--   · INSERT/UPDATE/DELETE : 정책 없음 → 사실상 service role 전용
--       (앱 내 모든 쓰기 경로는 createServiceClient() 를 거치므로 정상 동작)
--       (anon/authenticated 는 RLS 에 막혀 직접 쓰기 불가)
--
-- 안전성 (2026-04-25 갱신)
--   · to_regclass() 가드 추가 → community_points.sql 미실행 환경에서도
--     "relation does not exist" 에러 없이 누락 테이블만 NOTICE 후 skip
--   · 4 테이블 모두 별도 IF 블록으로 격리 — 한 테이블 누락이 전체 중단 안 시킴
--   · 모든 ALTER/CREATE 는 idempotent (DROP IF EXISTS 선행)
--   · 재실행해도 정책 중복 생성되지 않음
-- ============================================================

DO $$
BEGIN
  -- 1) community_posts ─────────────────────────────────────────
  IF to_regclass('public.community_posts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS community_posts_public_select ON public.community_posts';
    EXECUTE 'CREATE POLICY community_posts_public_select ON public.community_posts FOR SELECT USING (true)';
  ELSE
    RAISE NOTICE '[SKIP] public.community_posts 테이블 없음 — community_points.sql 먼저 실행 필요';
  END IF;

  -- 2) community_comments ──────────────────────────────────────
  IF to_regclass('public.community_comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS community_comments_public_select ON public.community_comments';
    EXECUTE 'CREATE POLICY community_comments_public_select ON public.community_comments FOR SELECT USING (true)';
  ELSE
    RAISE NOTICE '[SKIP] public.community_comments 테이블 없음';
  END IF;

  -- 3) community_post_likes ────────────────────────────────────
  IF to_regclass('public.community_post_likes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS community_post_likes_public_select ON public.community_post_likes';
    EXECUTE 'CREATE POLICY community_post_likes_public_select ON public.community_post_likes FOR SELECT USING (true)';
  ELSE
    RAISE NOTICE '[SKIP] public.community_post_likes 테이블 없음';
  END IF;

  -- 4) point_ledger ────────────────────────────────────────────
  --    포인트 원장은 본인 것만 보이게 한다.
  --    · auth.uid() 매칭되는 row 만 SELECT 허용 (Supabase 세션 유저)
  --    · OAuth(localution_user) 사용자는 service role 경유 API 로만 조회 가능
  IF to_regclass('public.point_ledger') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS point_ledger_owner_select ON public.point_ledger';
    EXECUTE 'CREATE POLICY point_ledger_owner_select ON public.point_ledger FOR SELECT USING (user_id IS NOT NULL AND auth.uid() = user_id)';
  ELSE
    RAISE NOTICE '[SKIP] public.point_ledger 테이블 없음';
  END IF;
END $$;

-- ============================================================
-- 검증 쿼리 (실행 후 수동 확인용)
-- ============================================================
-- SELECT relname, relrowsecurity
--   FROM pg_class
--  WHERE relname IN ('community_posts','community_comments','community_post_likes','point_ledger');
-- → 존재하는 테이블 모두 relrowsecurity = true 여야 함
