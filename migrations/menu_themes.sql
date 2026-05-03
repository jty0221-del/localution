-- ============================================================
-- 메뉴판 테마 (업종별 프리셋 + 커스텀)
--   · stores 테이블에 menu_theme JSONB 컬럼 추가
--   · 기본값은 'default' 프리셋 ID
-- ============================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS menu_theme jsonb DEFAULT NULL;

-- 예시 menu_theme 구조:
-- {
--   "preset": "korean-traditional",   -- 업종 프리셋 ID
--   "custom": {                       -- 사용자 커스텀 (선택)
--     "primary_color": "#3182F6",
--     "accent_color": "#7C3AED",
--     "bg_color": "#FFFFFF",
--     "header_image": "https://...",
--     "font_family": "sans" | "serif",
--     "card_style": "minimal" | "bordered" | "shadow",
--     "category_layout": "tabs" | "sections",
--     "show_signature_badge": true,
--     "show_new_badge": true
--   }
-- }
