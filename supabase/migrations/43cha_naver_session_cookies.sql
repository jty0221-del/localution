-- 43차: 네이버 세션 쿠키 저장 테이블
-- Supabase 대시보드 SQL Editor 에서 실행하세요
CREATE TABLE IF NOT EXISTS naver_session_cookies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  cookie_enc  TEXT        NOT NULL,
  cookie_iv   TEXT        NOT NULL,
  cookie_tag  TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS naver_session_cookies_user_id_idx
  ON naver_session_cookies (user_id);
