-- ============================================================
-- 30차-21: platform_reviews 테이블에 답글 초안/큐 관리 컬럼 추가
--
--   목적: "댓글 초안 생성 → 수정 → 이대로 등록 → 네이버 자동 submit" 2단 플로우
--
--   컬럼 설계:
--     - draft_reply          text          AI 가 생성한 최신 초안 (사용자가 편집한 최종본 포함)
--     - reply_status         text          'none' | 'draft' | 'queued' | 'submitting' | 'submitted' | 'failed'
--     - reply_tone           text          'warm' | 'polite' | 'formal' (마지막 생성 톤 기록)
--     - reply_queued_at      timestamptz   사용자가 "이대로 등록하기" 누른 시각
--     - reply_submitted_at   timestamptz   실제 네이버 submit 성공 시각
--     - reply_error          text          submit 실패 시 사유 (Worker 가 기록)
--     - reply_attempts       int           submit 재시도 횟수 (기본 0)
--
--   Worker 픽업 규칙 (23차-4 NaverPlaceAdapter):
--     · WHERE platform='naver_place' AND reply_status='queued' ORDER BY reply_queued_at ASC LIMIT 1
--     · 픽업 시 reply_status='submitting' 으로 마크
--     · 성공 시 reply_status='submitted' + reply_submitted_at=now() + has_reply=true
--     · 실패 시 reply_status='failed' + reply_error=... + reply_attempts+=1
--
-- 실행 위치: Supabase SQL Editor
-- ============================================================

alter table public.platform_reviews
  add column if not exists draft_reply         text,
  add column if not exists reply_status        text    default 'none',
  add column if not exists reply_tone          text,
  add column if not exists reply_queued_at     timestamptz,
  add column if not exists reply_submitted_at  timestamptz,
  add column if not exists reply_error         text,
  add column if not exists reply_attempts      integer default 0;

-- Worker 가 큐잉된 리뷰를 빠르게 조회하기 위한 부분 인덱스
create index if not exists idx_platform_reviews_queued
  on public.platform_reviews (platform, reply_queued_at)
  where reply_status = 'queued';

-- 상태 CHECK 제약 (Supabase 는 check constraint 를 alter 로 add 가능)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_reviews_reply_status_check'
  ) then
    alter table public.platform_reviews
      add constraint platform_reviews_reply_status_check
      check (reply_status in ('none','draft','queued','submitting','submitted','failed'));
  end if;
end $$;

-- schema cache 강제 리로드
notify pgrst, 'reload schema';
