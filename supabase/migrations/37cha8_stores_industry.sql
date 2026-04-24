-- 37차-8 · stores.industry 컬럼 (선택)
-- ============================================================
-- /settings/profile 의 "업종" 드롭다운 값을 별도 컬럼에 저장하고 싶을 때 실행.
-- 현재 /api/stores/register 는 industry 를 stores.category 로 매핑해서 저장 중.
-- industry 전용 컬럼을 추가하면 category(자유형/내부분류) 와 분리 가능.
-- ============================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- 기존 category 값을 industry 로 백필 (category 를 별도로 쓰고 있지 않다면)
UPDATE stores
  SET industry = category
  WHERE industry IS NULL
    AND category IS NOT NULL;

-- 참고: app/api/stores/register/route.ts 에서 payload 에 industry 를 넘기면
-- 이후에 category 대신 industry 컬럼에 우선 저장하도록 라우트 수정 가능.
