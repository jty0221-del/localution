-- ============================================================
-- 스탬프 카드 단계별 보상 (군만두/탕수육 패턴)
--   · 5회 = 군만두 무료
--   · 10회 = 탕수육 무료
--   · etc.
--
-- stamp_cards 테이블에 milestones 컬럼 추가
-- ============================================================

ALTER TABLE stamp_cards
  ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]'::jsonb;

-- milestones 형식 예시:
-- [
--   {"at": 5,  "reward": "군만두 무료", "claimed": false},
--   {"at": 10, "reward": "탕수육 무료", "claimed": false}
-- ]

-- stamp_collections 에 claimed_milestones 추가 (손님별 어떤 단계를 받았는지)
ALTER TABLE stamp_collections
  ADD COLUMN IF NOT EXISTS claimed_milestones jsonb DEFAULT '[]'::jsonb;

-- claimed_milestones 형식 예시:
-- [{"at": 5, "claimed_at": "2026-05-01T..."}]
