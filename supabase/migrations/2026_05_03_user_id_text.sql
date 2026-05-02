-- ============================================================
-- fix: user_id 컬럼 타입 uuid → text
-- 이 프로젝트는 Supabase auth.users (uuid) 가 아닌 자체 user 식별자 (text/nanoid) 사용
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

-- 1. RLS 정책 제거 (auth.uid() 가 uuid 반환 → 우리 text user_id 와 호환 안 됨)
drop policy if exists "users_select_own_prefs" on public.user_notification_prefs;
drop policy if exists "users_upsert_own_prefs" on public.user_notification_prefs;
drop policy if exists "users_update_own_prefs" on public.user_notification_prefs;
drop policy if exists "users_read_own_log"     on public.notification_log;

-- 2. foreign key 제거 (auth.users(id) 는 uuid)
alter table public.user_notification_prefs
  drop constraint if exists user_notification_prefs_user_id_fkey;
alter table public.notification_log
  drop constraint if exists notification_log_user_id_fkey;

-- 3. 컬럼 타입 변경 uuid → text
alter table public.user_notification_prefs
  alter column user_id type text using user_id::text;
alter table public.notification_log
  alter column user_id type text using user_id::text;

-- 4. RLS 끄기 (모든 접근이 service role API 를 통해서만 → user_id 검증은 API 측)
alter table public.user_notification_prefs disable row level security;
alter table public.notification_log        disable row level security;

-- 끝.
