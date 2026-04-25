-- ============================================================
-- 43차-2 · inquiries 테이블 (홈 문의 영속 저장)
-- ============================================================
-- 기존 app/api/inquiry/route.ts 는 in-memory store 를 썼기 때문에
-- Vercel 콜드스타트마다 데이터가 유실되었음. Supabase 로 이관.
--
-- 정책
--   · 모든 접근은 service role 경유 API 라우트 → RLS 는 anon/authenticated 모두 차단
--   · 본인 조회는 GET /api/inquiry?mine=true&ids=... 가 id 매칭으로 처리
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text         NOT NULL,
  contact       text         NOT NULL DEFAULT '',
  category      text         NOT NULL DEFAULT '일반문의',
  message       text         NOT NULL,
  status        text         NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','replied','completed')),
  reply         text,
  replied_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created
  ON public.inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created
  ON public.inquiries(status, created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
-- 정책 추가하지 않음 → service role 만 접근 가능
