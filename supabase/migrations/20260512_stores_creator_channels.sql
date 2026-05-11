-- v38: stores 테이블에 creator_channels JSONB 컬럼 추가
--   · 매장 없는 마케터·블로거·1인 사업자의 개인 채널 URL 저장
--   · 키: homepage_url, blog_url, instagram_url, threads_url, youtube_channel_url

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS creator_channels JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN stores.creator_channels IS
  '마케터·블로거 본인 채널 URL — { homepage_url, blog_url, instagram_url, threads_url, youtube_channel_url }';

-- 인덱스 불필요 (작은 JSONB, 단순 read/write)
