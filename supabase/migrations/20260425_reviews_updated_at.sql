-- ============================================================
-- 43차-3 · reviews.updated_at 컬럼 + 자동 갱신 트리거 (가드판 / 2026-04-25 갱신)
-- ============================================================
-- 배경
--   public.reviews 에 updated_at 이 없어서 답글 수정·상태 전이 추적이 불가했다.
--   다른 테이블(subscriptions/customers 등)은 set_updated_at() 트리거를 이미 사용 중.
--
-- 안전성 (2026-04-25 갱신)
--   · to_regclass() 가드 추가 → schema.sql 미실행 환경에서도 에러 없이 skip
--   · ADD COLUMN IF NOT EXISTS — 재실행 안전, 기존 데이터 영향 없음
--   · backfill: DEFAULT now() 로 새 컬럼 NULL 방지
--   · set_updated_at() 함수는 entitlements 마이그레이션에서 이미 정의됨 →
--     CREATE OR REPLACE 로 재정의 안전
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()';
  ELSE
    RAISE NOTICE '[SKIP] public.reviews 테이블 없음 — schema.sql 먼저 실행 필요';
  END IF;
END $$;

-- set_updated_at() 함수 (이미 있으면 그대로 사용, 없으면 정의)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews';
    EXECUTE 'CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='reviews' AND column_name='updated_at';
-- SELECT tgname FROM pg_trigger WHERE tgrelid='public.reviews'::regclass AND tgname='trg_reviews_updated_at';
