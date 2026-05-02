-- ============================================================
-- QR 리뷰 활동 추적 — 손님이 QR 스캔 후 리뷰 작성 흐름 통계
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

-- 1. qr_review_logs — 손님 이벤트 추적
create table if not exists public.qr_review_logs (
  id bigserial primary key,

  -- 매장 식별 (slug 만 필수, store_id 는 매핑 보조)
  store_slug text not null,
  store_id uuid default null,
  user_id text default null,  -- 사장님 user_id (조회 빠르게 — denormalized)

  -- 이벤트 타입
  event_type text not null check (event_type in (
    'scan',              -- QR 스캔 (페이지 진입)
    'receipt_uploaded',  -- 영수증 업로드
    'receipt_verified',  -- 영수증 OCR 매장 일치
    'photo_uploaded',    -- 사진 업로드
    'ai_generated',      -- AI 리뷰 생성 성공
    'submitted_naver',   -- 네이버 등록 클릭
    'submitted_google',  -- 구글 등록 클릭
    'submitted_kakao'    -- 카카오 등록 클릭
  )),

  -- 메타데이터 (jsonb — 자유 형식)
  -- scan: { ua_short, referrer }
  -- receipt_*: { items_count, total }
  -- photo_uploaded: { count }
  -- ai_generated: { tone, length, ai_source: 'ai'|'fallback' }
  -- submitted_*: { rating, has_receipt, has_photo, char_count }
  meta jsonb default null,

  -- 손님 식별 (개인정보 NO — 해시만)
  visitor_hash text default null,  -- IP+UA 해시 (같은 손님 중복 추적용)
  device_kind text default null,    -- 'mobile' | 'tablet' | 'desktop'

  created_at timestamptz not null default now()
);

-- 2. 인덱스 — 사장님 매장별 + 시간순 빠른 조회
create index if not exists qr_review_logs_store_slug_created_idx
  on public.qr_review_logs(store_slug, created_at desc);

create index if not exists qr_review_logs_user_id_created_idx
  on public.qr_review_logs(user_id, created_at desc)
  where user_id is not null;

create index if not exists qr_review_logs_event_type_idx
  on public.qr_review_logs(store_slug, event_type, created_at desc);

-- 3. RLS — 사장님은 본인 매장 logs 만 조회. INSERT 는 service role 만 (API 측에서 검증)
alter table public.qr_review_logs disable row level security;
-- 모든 INSERT/SELECT 는 service role API 통해서만. 사용자 직접 접근 차단.

-- 끝.
