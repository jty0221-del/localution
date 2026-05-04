-- ============================================================
-- Threads 자동발행 시스템 (2026-05-05)
-- ============================================================

-- 1. Threads OAuth 계정 (유저당 1개, 장기토큰 저장)
CREATE TABLE IF NOT EXISTS public.threads_accounts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           TEXT NOT NULL,
  threads_user_id   TEXT NOT NULL,
  username          TEXT,
  -- AES-256-GCM 2단 암호화 (platform_credentials 와 동일 구조)
  token_encrypted   TEXT NOT NULL,
  token_iv          TEXT NOT NULL,
  token_tag         TEXT NOT NULL,
  dek_encrypted     TEXT NOT NULL,
  dek_iv            TEXT NOT NULL,
  dek_tag           TEXT NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  refreshed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_accounts_user_id ON public.threads_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_accounts_expires_at ON public.threads_accounts(expires_at);

ALTER TABLE public.threads_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_threads_accounts" ON public.threads_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Threads 포스트 (draft / scheduled / publishing / published / failed)
CREATE TABLE IF NOT EXISTS public.threads_posts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          TEXT NOT NULL,
  text_content     TEXT NOT NULL,
  hashtags         TEXT[] DEFAULT '{}',
  image_url        TEXT,
  media_type       TEXT NOT NULL DEFAULT 'TEXT' CHECK (media_type IN ('TEXT','IMAGE')),
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','scheduled','publishing','published','failed')),
  scheduled_at     TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  threads_post_id  TEXT,
  container_id     TEXT,
  error_message    TEXT,
  retry_count      INT NOT NULL DEFAULT 0,
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','card_news')),
  card_news_topic  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_posts_user_id ON public.threads_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_posts_status ON public.threads_posts(status);
CREATE INDEX IF NOT EXISTS idx_threads_posts_scheduled
  ON public.threads_posts(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE public.threads_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_threads_posts" ON public.threads_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
