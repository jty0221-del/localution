-- ============================================================
-- 30차-13: stores.user_id uuid → text 타입 변경
--   - 에러: invalid input syntax for type uuid: "sYPfuRm7xe26q1-nZgDmk5vW0_P3YoNKJCq3lwEr1nc"
--   - 원인: localution custom auth(localution_user) 는 자체 nanoid 사용 — uuid 불일치
--
-- 3차 시도 수정사항:
--   - stores 뿐 아니라 '다른 테이블에서 stores 를 참조하는 정책' 까지 의존성으로 걸림
--     예: reviews 의 `exists (select from stores where stores.user_id = auth.uid())`
--   - pg_policies 를 순회하며 stores 관련 정책을 전부 자동 백업 → DROP → ALTER → RECREATE
--   - auth.uid()(uuid) vs user_id(text) 타입 불일치는 fallback 으로 자동 캐스팅 치환
--
-- 실행 위치: Supabase SQL Editor
-- ============================================================

do $$
declare
  rec record;
  backup_sqls text[] := array[]::text[];
  backup_tbls text[] := array[]::text[];
  backup_names text[] := array[]::text[];
  cmd_idx int;
  create_cmd text;
  fallback_cmd text;
  ok_count int := 0;
  fail_count int := 0;
begin
  -- 1) stores 관련 정책 전부 수집 (stores 테이블 자체 + stores 를 참조하는 cross-table 정책)
  for rec in
    select
      schemaname, tablename, policyname, permissive,
      cmd::text as cmd_text,
      roles::text[] as roles_arr,
      qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (tablename = 'stores'
           or qual ~ 'stores'
           or with_check ~ 'stores')
    order by tablename, policyname
  loop
    -- CREATE POLICY SQL 조립
    create_cmd := format('create policy %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    if rec.permissive = 'RESTRICTIVE' then
      create_cmd := create_cmd || ' as restrictive';
    end if;
    create_cmd := create_cmd || ' for ' || rec.cmd_text;
    if rec.roles_arr is not null and array_length(rec.roles_arr, 1) > 0 then
      create_cmd := create_cmd || ' to ' || array_to_string(rec.roles_arr, ', ');
    end if;
    if rec.qual is not null then
      create_cmd := create_cmd || ' using (' || rec.qual || ')';
    end if;
    if rec.with_check is not null then
      create_cmd := create_cmd || ' with check (' || rec.with_check || ')';
    end if;

    backup_sqls  := array_append(backup_sqls,  create_cmd);
    backup_tbls  := array_append(backup_tbls,  rec.tablename);
    backup_names := array_append(backup_names, rec.policyname);

    -- DROP
    execute format('drop policy %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    raise notice 'Dropped: public.%.%', rec.tablename, rec.policyname;
  end loop;

  raise notice '--- Total % policies dropped ---', coalesce(array_length(backup_sqls, 1), 0);

  -- 2) user_id 컬럼 uuid → text
  execute 'alter table public.stores alter column user_id type text using user_id::text';
  raise notice 'ALTERed stores.user_id → text';

  -- 3) 정책 복구 (원본 실패 시 auth.uid() → auth.uid()::text fallback)
  for cmd_idx in 1..coalesce(array_length(backup_sqls, 1), 0) loop
    begin
      execute backup_sqls[cmd_idx];
      ok_count := ok_count + 1;
      raise notice 'OK   : %.%', backup_tbls[cmd_idx], backup_names[cmd_idx];
    exception when others then
      -- auth.uid() 를 auth.uid()::text 로 치환 (이미 ::뒤에 뭔가 붙은 건 제외)
      fallback_cmd := regexp_replace(backup_sqls[cmd_idx], 'auth\.uid\(\)(?!::)', 'auth.uid()::text', 'g');
      begin
        execute fallback_cmd;
        ok_count := ok_count + 1;
        raise notice 'CAST : %.% (auth.uid() → ::text)', backup_tbls[cmd_idx], backup_names[cmd_idx];
      exception when others then
        fail_count := fail_count + 1;
        raise warning 'FAIL : %.% | ERROR: %', backup_tbls[cmd_idx], backup_names[cmd_idx], sqlerrm;
        raise warning '     SQL: %', backup_sqls[cmd_idx];
      end;
    end;
  end loop;

  raise notice '=== DONE: % recreated, % failed ===', ok_count, fail_count;
end $$;

-- 4) stores RLS 보장 + 안전 정책 보강
alter table public.stores enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores'
  ) then
    create policy "stores_all_own" on public.stores
      for all
      using (auth.uid()::text = user_id)
      with check (auth.uid()::text = user_id);
    raise notice 'Added fallback policy stores_all_own';
  end if;
end $$;

-- 5) PostgREST schema cache 리로드
notify pgrst, 'reload schema';
