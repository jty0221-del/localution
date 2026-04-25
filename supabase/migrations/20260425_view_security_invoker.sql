-- ============================================================
-- 43차-3 · 사용자 범위 뷰 security_invoker 적용
-- ============================================================
-- 배경
--   기본적으로 Postgres view 는 정의자(definer) 권한으로 실행되어
--   호출자가 베이스 테이블에 직접 SELECT 권한이 없어도 view 결과를 받을 수 있다.
--   사용자 범위 view (auth.uid() 매칭 등) 는 호출자 권한으로 실행해야
--   베이스 테이블의 RLS 가 제대로 적용된다.
--
-- 대상
--   public.my_customers              (20260420_crm.sql)
--   public.my_entitlements           (20260419_entitlements.sql)
--   public.place_snapshots_latest    (supabase_migration_v5_place_tracking.sql)
--   public.place_targets_with_latest (supabase_migration_v5_place_tracking.sql)
--
-- 안전성
--   ALTER VIEW ... SET (security_invoker = true) 는 view 정의를 바꾸지 않으며
--   기존 권한·grant 를 보존한다. 재실행 안전.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='my_customers') THEN
    EXECUTE 'ALTER VIEW public.my_customers SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='my_entitlements') THEN
    EXECUTE 'ALTER VIEW public.my_entitlements SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='place_snapshots_latest') THEN
    EXECUTE 'ALTER VIEW public.place_snapshots_latest SET (security_invoker = true)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='place_targets_with_latest') THEN
    EXECUTE 'ALTER VIEW public.place_targets_with_latest SET (security_invoker = true)';
  END IF;
END
$$;

-- 검증:
-- SELECT relname, reloptions FROM pg_class
--  WHERE relkind = 'v'
--    AND relnamespace = 'public'::regnamespace
--    AND relname IN ('my_customers','my_entitlements','place_snapshots_latest','place_targets_with_latest');
-- → reloptions 에 'security_invoker=true' 포함되어야 함
