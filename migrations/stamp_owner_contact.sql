-- ============================================================
-- 스탬프 카드 — 사장님 이름/연락처 추가
--   · 손님이 카드에서 사장님께 직접 연락 가능하도록
-- ============================================================

ALTER TABLE stamp_cards
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_phone text;
