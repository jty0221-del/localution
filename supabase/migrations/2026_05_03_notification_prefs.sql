-- ============================================================
-- 알림 시스템 — Phase 1: 사용자별 알림 설정 + 발송 이력
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

-- 1. user_notification_prefs — 사용자별 알림 설정
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- 알림 켜기/끄기
  review_alerts_enabled boolean not null default true,
  customer_alerts_enabled boolean not null default true,
  report_alerts_enabled boolean not null default false,

  -- 별점 필터 (사용자가 review_alerts_enabled=false 라도 항상 발송)
  low_rating_force_alert boolean not null default true,
  low_rating_threshold smallint not null default 3 check (low_rating_threshold between 1 and 5),

  -- 채널 (복수 선택 가능)
  channel_web_push boolean not null default true,
  channel_kakao_talk boolean not null default false,
  channel_email boolean not null default false,

  -- Web Push 구독 정보 (PushSubscription JSON)
  web_push_subscription jsonb default null,

  -- KakaoTalk OAuth — talk_message scope 동의 후 받은 토큰
  kakao_access_token text default null,
  kakao_refresh_token text default null,
  kakao_token_expires_at timestamptz default null,

  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. notification_log — 발송 이력 (중복 발송 방지 + 디버그)
create table if not exists public.notification_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,  -- 'review_new' | 'review_low_rating' | 'customer_new' | 'report_weekly' 등
  channel text not null,  -- 'web_push' | 'kakao_talk' | 'email'
  ref_id text default null,  -- platform_review_id 등 참조 ID
  payload jsonb default null,  -- 보낸 메시지 내용
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text default null,
  sent_at timestamptz not null default now()
);

-- 중복 발송 방지: 같은 user + 같은 kind + 같은 ref_id 는 한 번만
create unique index if not exists notification_log_dedupe_idx
  on public.notification_log(user_id, kind, ref_id, channel)
  where ref_id is not null;

create index if not exists notification_log_user_sent_at_idx
  on public.notification_log(user_id, sent_at desc);

-- 3. RLS — 사용자는 본인 prefs 만 읽기/쓰기 가능
alter table public.user_notification_prefs enable row level security;

create policy "users_select_own_prefs" on public.user_notification_prefs
  for select using (auth.uid() = user_id);

create policy "users_upsert_own_prefs" on public.user_notification_prefs
  for insert with check (auth.uid() = user_id);

create policy "users_update_own_prefs" on public.user_notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification_log 은 service role 만 (사용자가 직접 변조 못 하게)
alter table public.notification_log enable row level security;
create policy "users_read_own_log" on public.notification_log
  for select using (auth.uid() = user_id);
-- INSERT 는 service role 만 가능 (정책 없음 → 차단)

-- 4. updated_at 자동 갱신 트리거
create or replace function public.touch_user_notification_prefs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_notification_prefs on public.user_notification_prefs;
create trigger trg_touch_user_notification_prefs
  before update on public.user_notification_prefs
  for each row execute function public.touch_user_notification_prefs();

-- 끝.
