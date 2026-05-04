-- app_updates 테이블 — 업데이트 내역 관리
CREATE TABLE IF NOT EXISTS public.app_updates (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT    NOT NULL,
  summary      TEXT    NOT NULL,
  highlight    TEXT,
  category     TEXT    NOT NULL DEFAULT 'feature'
               CHECK (category IN ('feature','fix','notice','beta')),
  released_at  DATE    NOT NULL DEFAULT CURRENT_DATE,
  active       BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT     NOT NULL DEFAULT 0,
  cover_url    TEXT,
  link_url     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_updates_released_at ON public.app_updates(released_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_updates_active      ON public.app_updates(active) WHERE active = true;

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (비로그인 방문자)
CREATE POLICY "public_read_updates" ON public.app_updates
  FOR SELECT USING (active = true);

-- 서비스 롤 전체 접근
CREATE POLICY "service_full_updates" ON public.app_updates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
