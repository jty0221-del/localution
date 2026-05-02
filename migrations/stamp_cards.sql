-- ============================================================
-- 디지털 스탬프 카드 시스템 (Phase 1)
--   · stamp_cards         : 매장별 스탬프 카드 디자인/설정
--   · stamp_collections   : 손님별 적립 현황
--   · stamp_events        : 적립/보상 이력 (분석용)
--
-- 실행: Supabase SQL Editor 에서 한 번 실행
-- ============================================================

-- 매장별 스탬프 카드 설정 (1 매장 = 1 active 카드)
CREATE TABLE IF NOT EXISTS stamp_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  store_slug text,
  title text NOT NULL DEFAULT '단골 도장 카드',
  description text,
  required_stamps int NOT NULL DEFAULT 10,
  reward_text text NOT NULL DEFAULT '음료 1잔 무료',
  theme_color text DEFAULT '#3182F6',
  bg_pattern text DEFAULT 'dots',
  icon_emoji text DEFAULT '☕',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_cards_user ON stamp_cards(user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_stamp_cards_slug ON stamp_cards(store_slug) WHERE active = true;

-- 손님별 적립 현황
CREATE TABLE IF NOT EXISTS stamp_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stamp_card_id uuid REFERENCES stamp_cards(id) ON DELETE CASCADE,
  store_slug text,
  customer_phone text NOT NULL,
  customer_name text,
  current_stamps int DEFAULT 0,
  total_collected int DEFAULT 0,
  rewards_claimed int DEFAULT 0,
  last_visit_at timestamptz DEFAULT now(),
  enrolled_at timestamptz DEFAULT now(),
  consent_marketing boolean DEFAULT false,
  UNIQUE (stamp_card_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_stamp_collections_phone ON stamp_collections(customer_phone);
CREATE INDEX IF NOT EXISTS idx_stamp_collections_card ON stamp_collections(stamp_card_id);

-- 적립/보상 이력
CREATE TABLE IF NOT EXISTS stamp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES stamp_collections(id) ON DELETE CASCADE,
  stamp_card_id uuid REFERENCES stamp_cards(id) ON DELETE CASCADE,
  event_type text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_events_card ON stamp_events(stamp_card_id, created_at DESC);

-- 60초 내 같은 손님 중복 적립 차단용 트리거 (선택)
-- 클라이언트에서 처리하는 것으로 충분
