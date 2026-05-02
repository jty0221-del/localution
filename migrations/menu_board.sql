-- ============================================================
-- 디지털 메뉴판 시스템 (Phase 2)
--   · menu_items : 매장별 메뉴 항목
--   · 다국어: name_ko, name_en, name_ja, name_zh + desc 동일
--
-- 실행: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  store_slug text,
  category text,
  name_ko text NOT NULL,
  name_en text,
  name_ja text,
  name_zh text,
  desc_ko text,
  desc_en text,
  desc_ja text,
  desc_zh text,
  price int NOT NULL DEFAULT 0,
  image_url text,
  is_signature boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_soldout boolean DEFAULT false,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_user ON menu_items(user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_slug ON menu_items(store_slug) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(store_slug, category, display_order);
