-- ============================================================
-- Billing methods 테이블 — 사용자 결제 수단 + 토스 빌링 키 안전 저장
--   · 클라이언트 localStorage에서 제거 → 서버 측 보관
--   · billing_key (토스 빌링 키) 는 서비스 롤로만 접근 (RLS 없음)
--   · customer_key 는 user_id 기반 deterministic 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_methods (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_key TEXT NOT NULL,                  -- 토스 customerKey (cust_<uuid앞8자>)
  billing_key TEXT,                            -- 토스 billingKey (정기결제 인증 후 받는 토큰)
  card_name TEXT,                              -- 카드 표시명 (사용자 노출용)
  card_last4 TEXT,                             -- 카드 마지막 4자리
  card_company TEXT,                           -- 카드사 (BC/신한/삼성 등)
  registered_at TIMESTAMPTZ,                   -- 빌링 등록 시각
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION billing_methods_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS billing_methods_updated_at ON billing_methods;
CREATE TRIGGER billing_methods_updated_at
  BEFORE UPDATE ON billing_methods
  FOR EACH ROW EXECUTE FUNCTION billing_methods_set_updated_at();

-- RLS 활성화 — 본인 데이터만 조회 가능
ALTER TABLE billing_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_methods_select_own" ON billing_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "billing_methods_insert_own" ON billing_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "billing_methods_update_own" ON billing_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "billing_methods_delete_own" ON billing_methods
  FOR DELETE USING (auth.uid() = user_id);

-- 코멘트
COMMENT ON TABLE billing_methods IS '사용자 결제 수단 + 토스 빌링 키 (localStorage 대체, 보안 강화)';
COMMENT ON COLUMN billing_methods.customer_key IS '토스 customerKey — user_id 기반 deterministic';
COMMENT ON COLUMN billing_methods.billing_key IS '토스 billingKey — 정기결제 인증 토큰. 서비스 롤만 접근';
COMMENT ON COLUMN billing_methods.card_name IS '사용자 노출용 카드 표시명 (예: "BC카드 ****1234")';
