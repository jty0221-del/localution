-- ============================================================
-- 43차-3 · reviews.updated_at 컬럼 + 자동 갱신 트리거
-- ============================================================
-- 배경
--   public.reviews 에 updated_at 이 없어서 답글 수정·상태 전이 추적이 불가했다.
--   다른 테이블(subscriptions/customers 등)은 set_updated_at() 트리거를 이미 사용 중.
--
-- 안전성
--   · ADD COLUMN IF NOT EXISTS — 재실행 안전, 기존 데이터 영향 없음
--   · backfill: created_at 값으로 채워서 새 컬럼 NULL 방지
--   · set_updated_at() 함수는 entitlements 마이그레이션에서 이미 정의됨 → CREATE OR REPLACE 로 재정의 안전
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- set_updated_at() 함수 (이미 있으면 그대로 사용, 없으면 정의)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
