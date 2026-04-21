-- ============================================================
-- 30차-13: stores.user_id uuid → text 타입 변경
--   - 에러: invalid input syntax for type uuid: "sYPfuRm7xe26q1-nZgDmk5vW0_P3YoNKJCq3lwEr1nc"
--   - 원인: localution 은 custom auth (localution_user cookie) 기반이라
--           user_id 에 Supabase auth.uid() 가 아닌 자체 nanoid 문자열이 들어감
--   - 해결: user_id uuid → text 로 변경 + RLS 정책도 text 비교로 재설정
--   - 원칙: 새 테이블은 무조건 text, 기존 uuid 컬럼은 발견 즉시 마이그레이션
--
-- 실행 위치: Supabase SQL Editor (프로젝트 콘솔)
-- ============================================================

-- 1. RLS 정책 임시 제거 — user_id 타입 의존 정책 있으면 ALTER COLUMN 실패 방지
drop policy if exists "stores_select_own"   on public.stores;
drop policy if exists "stores_insert_own"   on public.stores;
drop policy if exists "stores_update_own"   on public.stores;
drop policy if exists "stores_delete_own"   on public.stores;
drop policy if exists "stores_all_own"      on public.stores;
drop policy if exists "stores_owner_access" on public.stores;
drop policy if exists "Users can view own stores"   on public.stores;
drop policy if exists "Users can insert own stores" on public.stores;
drop policy if exists "Users can update own stores" on public.stores;
drop policy if exists "Users can delete own stores" on public.stores;

-- 2. user_id 컬럼 uuid → text (기존 uuid 값도 text 로 안전 캐스팅)
alter table public.stores
  alter column user_id type text using user_id::text;

-- 3. RLS 정책 복구 (text 비교)
--    실제 API 는 전부 service role 로 접근해서 RLS 우회하지만,
--    혹시 anon 쿼리가 섞일 경우 대비해 '자기 것만 조회/수정' 정책 유지
alter table public.stores enable row level security;

create policy "stores_all_own" on public.stores
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 4. schema cache 리로드 (PostgREST)
notify pgrst, 'reload schema';
