-- ============================================================
-- 메뉴 임포트 작업 추적 (Phase 2 - Option A: Worker 비동기 처리)
--   · 사장님이 "네이버에서 가져오기" 버튼 → 워커 큐에 잡 enqueue
--   · 워커가 Playwright + 사장님 세션으로 smartplace.naver.com 접근
--   · 결과를 이 테이블에 저장 → 웹이 폴링
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  place_id text,
  booking_business_id text,
  status text NOT NULL DEFAULT 'queued',  -- queued | running | success | failed
  items jsonb DEFAULT '[]'::jsonb,
  error_code text,
  error_message text,
  job_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_menu_imports_user ON menu_imports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_imports_status ON menu_imports(status) WHERE status IN ('queued', 'running');
