-- ============================================================
-- low_rating_threshold 0~5 허용 (이전 1~5)
-- 0 = 강제 알림 사실상 끄기 (별점이 0 이하인 리뷰는 없으므로)
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

alter table public.user_notification_prefs
  drop constraint if exists user_notification_prefs_low_rating_threshold_check;

alter table public.user_notification_prefs
  add constraint user_notification_prefs_low_rating_threshold_check
  check (low_rating_threshold between 0 and 5);
