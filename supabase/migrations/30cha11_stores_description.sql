-- ============================================================
-- 30차-11: stores 테이블에 description 컬럼 추가
--   - 매장 소개 전문(최대 2000자) 보관
--   - 기존 `desc` 네이밍은 SQL 예약어라 Supabase schema cache 에
--     반영 안 되는 이슈가 있어 `description` 으로 통일
--   - /api/stores/register POST 시 insert 됨
--   - /api/stores/me GET 에서 select 로 반환됨
--
-- 실행 위치: Supabase SQL Editor (프로젝트 콘솔)
-- ============================================================

alter table public.stores
  add column if not exists description text;

-- 기존 `desc` 컬럼이 이미 존재하는 예외 케이스 대응 —
-- 값이 있으면 description 으로 이관
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stores' and column_name = 'desc'
  ) then
    execute 'update public.stores set description = coalesce(description, "desc") where "desc" is not null';
    -- desc 컬럼은 예약어 충돌 소지가 있어 drop
    execute 'alter table public.stores drop column "desc"';
  end if;
end $$;

-- schema cache 강제 리로드
notify pgrst, 'reload schema';
