-- ============================================================
-- QR 코드 테이블 — 사장님이 만든 리뷰/주문/명함 등 QR 코드 목록
--   · localStorage(localution.qr_list) 대체
--   · 사장님 본인 매장 QR만 관리 (RLS)
--   · 스캔/리뷰 카운트는 추후 분석 데이터로 활용
-- ============================================================

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                            -- QR 이름 (예: "테이블 1번 리뷰 QR")
  purpose TEXT NOT NULL DEFAULT 'review',        -- review / menu / order / card / wifi / etc
  review_url TEXT,                               -- 연결된 URL
  scans INT NOT NULL DEFAULT 0,                  -- 스캔 횟수
  reviews INT NOT NULL DEFAULT 0,                -- 리뷰 등록 횟수
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_created ON qr_codes(user_id, created_at DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION qr_codes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qr_codes_updated_at ON qr_codes;
CREATE TRIGGER qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION qr_codes_set_updated_at();

-- RLS: 본인 데이터만 접근 가능
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_codes_select_own" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_insert_own" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_update_own" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_delete_own" ON qr_codes;

CREATE POLICY "qr_codes_select_own" ON qr_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "qr_codes_insert_own" ON qr_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "qr_codes_update_own" ON qr_codes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "qr_codes_delete_own" ON qr_codes
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE qr_codes IS '사장님 QR 코드 목록 (localStorage 대체)';
COMMENT ON COLUMN qr_codes.purpose IS 'QR 용도: review/menu/order/card/wifi/etc';
COMMENT ON COLUMN qr_codes.review_url IS 'QR 스캔 시 이동할 URL';
