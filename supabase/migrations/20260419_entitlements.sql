-- ============================================================
-- 로컬루션 엔타이틀먼트 시스템 · Supabase 스키마
-- ============================================================
--
-- 목적: 사용자가 구독한 모듈을 서버측에서 신뢰성 있게 추적
-- Phase 1 에서 실행. Phase 0 (localStorage) 와 병행 가능.
--
-- 실행 순서:
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체를 복사 붙여넣기
--   3) Run (Ctrl+Enter)
--   4) Verify: SELECT * FROM subscriptions; (빈 결과 정상)
--
-- ⚠️ 재실행 안전 (idempotent)
--   - 이전에 실패한 적 있거나 부분 생성된 상태라도 안전하게 재실행 가능
--   - 데이터가 있다면 DROP TABLE 블록을 주석 처리할 것
-- ============================================================

-- ----- 0. 필수 확장 -----
-- EXCLUDE USING gist 제약조건에 필요 (Supabase 기본 활성화되어 있지만 안전 차원)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----- 0.5 이전 버전 정리 (데이터 없을 때만, Phase 1 개발 초기) -----
-- 테이블에 실제 결제 데이터가 쌓이면 이 블록을 반드시 주석 처리!
DROP VIEW     IF EXISTS public.my_entitlements CASCADE;
DROP FUNCTION IF EXISTS public.has_entitlement(module_id) CASCADE;
DROP TABLE    IF EXISTS public.module_usage   CASCADE;
DROP TABLE    IF EXISTS public.payments       CASCADE;
DROP TABLE    IF EXISTS public.subscriptions  CASCADE;

-- ----- 1. 모듈 ID 타입 정의 -----
-- 코드와 동기화: app/lib/modules.ts 의 ModuleId 타입과 일치해야 함
DO $$ BEGIN
  CREATE TYPE module_id AS ENUM (
    'ai-review',
    'alimtalk',
    'accounting',
    'local-synergy',
    'qr-stamp',
    'keyword',
    'blog-ai',
    'competitor',
    'report',
    'crm',
    'ai-chat',
    'sns-manage'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',       -- 활성 (결제 유효)
    'past_due',     -- 연체 (결제 실패, 유예 기간)
    'paused',       -- 일시정지
    'cancelled',    -- 해지 (현재 기간까지 사용 가능)
    'expired'       -- 만료 (접근 불가)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----- 2. subscriptions 테이블 -----
-- 유저 × 모듈 1:N 구독 관계
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id       module_id    NOT NULL,
  status          subscription_status NOT NULL DEFAULT 'active',
  started_at      timestamptz  NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  cancelled_at    timestamptz,
  -- 토스페이먼츠 연동 필드
  toss_billing_key    text,
  toss_customer_key   text,
  -- 가격 스냅샷 (모듈 가격 변경 후에도 기존 구독자 영향 최소화)
  price_krw       integer      NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- 같은 사용자가 같은 모듈을 중복 구독 불가
-- (Supabase 에서는 enum IN 비교가 partial index WHERE 절에서 STABLE 로 취급되어 IMMUTABLE 위반 →
--  partial 조건 걷어내고 전체 UNIQUE INDEX. 해지된 구독이 한 건 남아있더라도 같은 status 아니면 중복 아님)
-- 대신 status 를 함께 포함해 복합 UNIQUE 로 논리 충돌 방지
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_module_status_key
  ON public.subscriptions (user_id, module_id, status);

-- 조회 성능 인덱스 (partial WHERE 절 제거)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions(current_period_end, status);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- 3. payments 테이블 -----
-- 개별 결제 기록 (영수증, 환불 추적)
CREATE TABLE IF NOT EXISTS public.payments (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid         REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_ids      module_id[]  NOT NULL, -- 한 번 결제에 여러 모듈
  -- 금액 (번들 할인 적용 후)
  subtotal_krw    integer      NOT NULL,
  discount_krw    integer      NOT NULL DEFAULT 0,
  total_krw       integer      NOT NULL,
  -- 토스페이먼츠 메타
  toss_payment_key text,
  toss_order_id    text         UNIQUE,
  toss_method      text,        -- card/transfer/virtualAccount/...
  toss_status      text,        -- READY/IN_PROGRESS/DONE/CANCELED/...
  receipt_url     text,
  failed_reason   text,
  -- 타임스탬프
  requested_at    timestamptz  NOT NULL DEFAULT now(),
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payments(subscription_id);

-- ----- 4. module_usage 테이블 (선택) -----
-- API 호출 횟수·사용량 추적 (쿼터 관리용, Phase 2+)
CREATE TABLE IF NOT EXISTS public.module_usage (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id       module_id    NOT NULL,
  action          text         NOT NULL,    -- 'ai_reply_generated', 'keyword_scan', ...
  count           integer      NOT NULL DEFAULT 1,
  metadata        jsonb        NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

-- date_trunc 는 timestamptz 입력일 때 STABLE 이라 인덱스 표현식 불가 → created_at 그대로
-- 월별 집계 쿼리는 WHERE created_at >= date_trunc('month', now()) 형태로 하면 이 인덱스 활용됨
CREATE INDEX IF NOT EXISTS idx_module_usage_user_month
  ON public.module_usage(user_id, module_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_usage  ENABLE ROW LEVEL SECURITY;

-- ----- subscriptions -----
-- 유저는 자기 구독만 읽기 가능
DROP POLICY IF EXISTS "users read own subscriptions" ON public.subscriptions;
CREATE POLICY "users read own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 쓰기는 서비스 롤만 (결제 웹훅을 거쳐야 함)
-- anon/authenticated 는 INSERT/UPDATE/DELETE 불가 (RLS가 기본 거부)

-- ----- payments -----
DROP POLICY IF EXISTS "users read own payments" ON public.payments;
CREATE POLICY "users read own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ----- module_usage -----
DROP POLICY IF EXISTS "users read own usage" ON public.module_usage;
CREATE POLICY "users read own usage"
  ON public.module_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 뷰 & 헬퍼 함수
-- ============================================================

-- 현재 활성 엔타이틀먼트 뷰 (프론트엔드용)
CREATE OR REPLACE VIEW public.my_entitlements AS
SELECT
  s.module_id,
  s.status,
  s.started_at,
  s.current_period_end AS renews_at,
  s.price_krw,
  s.cancelled_at
FROM public.subscriptions s
WHERE s.user_id = auth.uid()
  AND s.status IN ('active', 'past_due');

GRANT SELECT ON public.my_entitlements TO authenticated;

-- 특정 모듈 보유 여부 체크 함수 (RPC에서 사용)
CREATE OR REPLACE FUNCTION public.has_entitlement(p_module_id module_id)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND module_id = p_module_id
      AND status IN ('active', 'past_due')
      AND current_period_end > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_entitlement(module_id) TO authenticated;

-- ============================================================
-- 초기 데이터 (테스트용)
-- ============================================================
-- 실제 운영 시 삭제. Phase 1 개발 중에만 사용.
--
-- INSERT INTO public.subscriptions (user_id, module_id, price_krw)
-- VALUES (auth.uid(), 'ai-review', 990), (auth.uid(), 'qr-stamp', 990);

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT * FROM public.my_entitlements;
-- SELECT public.has_entitlement('ai-review');
