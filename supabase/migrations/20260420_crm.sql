-- ============================================================
-- 로컬루션 CRM 시스템 · Supabase 스키마 (Phase 1)
-- ============================================================
--
-- 목적: 고객관리 데이터(localStorage → Supabase) 영속화
-- 대응 코드: app/customers/page.tsx (LS_KEY = 'localution.customers')
--
-- 실행 순서:
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체를 복사 붙여넣기
--   3) Run (Ctrl+Enter)
--   4) Verify: SELECT * FROM customers; (빈 결과 정상)
--
-- ⚠️ 재실행 안전 (idempotent)
--   - 데이터가 이미 있다면 DROP 블록을 주석 처리할 것
-- ============================================================

-- ----- 0.5 이전 버전 정리 (데이터 없을 때만) -----
DROP VIEW     IF EXISTS public.my_customers        CASCADE;
DROP TABLE    IF EXISTS public.customer_messages   CASCADE;
DROP TABLE    IF EXISTS public.customer_visits     CASCADE;
DROP TABLE    IF EXISTS public.customers           CASCADE;

-- ----- 1. customers 테이블 -----
-- 로그인한 사용자(사장님)가 등록한 고객 목록
CREATE TABLE IF NOT EXISTS public.customers (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 클라이언트 로컬 ID (localStorage 마이그레이션 시 1:1 매핑에 사용)
  legacy_id       text,
  -- 고객 기본 정보
  name            text         NOT NULL,
  phone           text,
  memo            text         NOT NULL DEFAULT '',
  -- 태그: 'VIP' | '단골' | '신규' | '휴면' | '블랙리스트'
  tags            text[]       NOT NULL DEFAULT ARRAY[]::text[],
  -- 집계 필드 (customer_visits 에서 업데이트하는 캐시)
  visits_count    integer      NOT NULL DEFAULT 0,
  total_spend_krw integer      NOT NULL DEFAULT 0,
  last_visit_at   timestamptz,
  -- 타임스탬프
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- 사용자별 고객 조회 (가장 흔한 쿼리 패턴)
CREATE INDEX IF NOT EXISTS idx_customers_user
  ON public.customers(user_id, updated_at DESC);

-- 전화번호 중복 체크 (같은 사장님이 같은 번호 중복 등록 방지) — 부분 인덱스 대신 복합 UNIQUE
-- phone 이 NULL 이면 UNIQUE 가 자연스럽게 무시됨 (Postgres 기본 동작)
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_phone_key
  ON public.customers(user_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- legacy_id 매핑용 (localStorage → DB 이관 시)
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_legacy_key
  ON public.customers(user_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- updated_at 자동 갱신 트리거 (entitlements 에서 이미 정의된 함수 재사용)
-- public.set_updated_at() 가 없으면 여기서 정의
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- 2. customer_visits 테이블 -----
-- 개별 방문/주문 기록 (QR 스탬프, POS 연동, 수기 입력)
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id     uuid         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  -- 방문 메타
  amount_krw      integer      NOT NULL DEFAULT 0,
  source          text         NOT NULL DEFAULT 'manual',  -- 'manual' | 'qr_stamp' | 'pos' | 'order'
  memo            text         NOT NULL DEFAULT '',
  metadata        jsonb        NOT NULL DEFAULT '{}'::jsonb,
  -- 타임스탬프
  visited_at      timestamptz  NOT NULL DEFAULT now(),
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_customer
  ON public.customer_visits(customer_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_user
  ON public.customer_visits(user_id, visited_at DESC);

-- ----- 3. customer_messages 테이블 -----
-- 단체/개별 메시지 발송 기록 (알림톡·SMS 히스토리 · Phase 2+)
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 수신자: 개별(customer_id) 또는 일괄 발송(null + recipient_count)
  customer_id     uuid         REFERENCES public.customers(id) ON DELETE SET NULL,
  recipient_count integer      NOT NULL DEFAULT 1,
  -- 메시지
  channel         text         NOT NULL DEFAULT 'alimtalk', -- 'alimtalk' | 'sms' | 'kakao'
  template        text,
  body            text         NOT NULL,
  status          text         NOT NULL DEFAULT 'queued',   -- 'queued' | 'sent' | 'failed'
  failed_reason   text,
  -- 타임스탬프
  sent_at         timestamptz,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_user
  ON public.customer_messages(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

-- ----- customers: 본인만 CRUD 가능 -----
DROP POLICY IF EXISTS "users read own customers"   ON public.customers;
DROP POLICY IF EXISTS "users insert own customers" ON public.customers;
DROP POLICY IF EXISTS "users update own customers" ON public.customers;
DROP POLICY IF EXISTS "users delete own customers" ON public.customers;

CREATE POLICY "users read own customers"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own customers"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own customers"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- ----- customer_visits -----
DROP POLICY IF EXISTS "users read own visits"   ON public.customer_visits;
DROP POLICY IF EXISTS "users insert own visits" ON public.customer_visits;
DROP POLICY IF EXISTS "users update own visits" ON public.customer_visits;
DROP POLICY IF EXISTS "users delete own visits" ON public.customer_visits;

CREATE POLICY "users read own visits"
  ON public.customer_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own visits"
  ON public.customer_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own visits"
  ON public.customer_visits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own visits"
  ON public.customer_visits FOR DELETE
  USING (auth.uid() = user_id);

-- ----- customer_messages: 읽기+쓰기 본인, 상태 업데이트는 서비스 롤에서 -----
DROP POLICY IF EXISTS "users read own messages"   ON public.customer_messages;
DROP POLICY IF EXISTS "users insert own messages" ON public.customer_messages;

CREATE POLICY "users read own messages"
  ON public.customer_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own messages"
  ON public.customer_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 방문 기록 시 customers 집계 필드 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_customer_stats()
RETURNS trigger AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  IF v_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.customers c
  SET
    visits_count    = COALESCE((SELECT COUNT(*) FROM public.customer_visits WHERE customer_id = v_customer_id), 0),
    total_spend_krw = COALESCE((SELECT SUM(amount_krw) FROM public.customer_visits WHERE customer_id = v_customer_id), 0),
    last_visit_at   = (SELECT MAX(visited_at) FROM public.customer_visits WHERE customer_id = v_customer_id),
    updated_at      = now()
  WHERE c.id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_visits_recalc_ins ON public.customer_visits;
CREATE TRIGGER trg_visits_recalc_ins
  AFTER INSERT ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.recalc_customer_stats();

DROP TRIGGER IF EXISTS trg_visits_recalc_upd ON public.customer_visits;
CREATE TRIGGER trg_visits_recalc_upd
  AFTER UPDATE ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.recalc_customer_stats();

DROP TRIGGER IF EXISTS trg_visits_recalc_del ON public.customer_visits;
CREATE TRIGGER trg_visits_recalc_del
  AFTER DELETE ON public.customer_visits
  FOR EACH ROW EXECUTE FUNCTION public.recalc_customer_stats();

-- ============================================================
-- 뷰 (프론트엔드 편의용)
-- ============================================================
CREATE OR REPLACE VIEW public.my_customers AS
SELECT
  id,
  legacy_id,
  name,
  phone,
  memo,
  tags,
  visits_count,
  total_spend_krw,
  last_visit_at,
  created_at,
  updated_at
FROM public.customers
WHERE user_id = auth.uid();

GRANT SELECT ON public.my_customers TO authenticated;

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name LIKE 'customer%';
-- 기대: customers / customer_visits / customer_messages (3 rows)
--
-- SELECT * FROM public.my_customers;    -- 0 rows 기대
