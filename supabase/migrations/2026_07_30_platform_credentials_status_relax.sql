-- ============================================================
-- 2026-07-30 hotfix: platform_credentials.last_login_status CHECK 제약 완화
--
-- 배경:
--   · 사장님이 네이버 매장 연결 STEP 3 에서
--     "new row for relation platform_credentials violates check constraint
--      platform_credentials_last_login_status_check" 에러 발생
--   · 원인: 초기 스키마의 check 제약은 'ok' | 'captcha' | 'blocked' |
--     'wrong_pw' | 'two_factor' | 'unknown_error' 정도만 허용했는데,
--     이후 코드가 발전하면서 다음 값들이 추가로 쓰이게 됨:
--       'success', 'success:save-login', 'success:public_api',
--       'success:cookies-refreshed-by-admin', 'success:save-login:admin-retry',
--       'pending_worker_login', 'credentials_invalid', 'account_locked'
--   · 어플리케이션 코드는 이런 다양한 상태를 표현하는데 반해 DB 제약이
--     구식 값들만 허용해서 INSERT/UPDATE 실패
--
-- 조치: 기존 제약 제거 → 코드에서 실제 쓰는 값들을 포괄하도록 새로 추가.
--       NULL 은 계속 허용 (연결 직후 로그인 시도 전).
--
-- 실행: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- 배포 시점: 언제 실행해도 무관 (구제약 사라져도 신값들이 write 성공)
-- ============================================================

alter table public.platform_credentials
  drop constraint if exists platform_credentials_last_login_status_check;

alter table public.platform_credentials
  add constraint platform_credentials_last_login_status_check
  check (
    last_login_status is null or last_login_status in (
      -- 초기 스키마 값 (기존 데이터 호환)
      'ok', 'captcha', 'blocked', 'wrong_pw', 'two_factor', 'unknown_error',
      'credentials_invalid', 'account_locked',
      -- 이후 코드에서 도입한 상태값
      'success',
      'success:save-login',
      'success:public_api',
      'success:cookies-refreshed-by-admin',
      'success:save-login:admin-retry',
      'pending_worker_login'
    )
    -- 혹시 다른 워커 도입 시 접두어로 확장할 수 있도록 prefix 도 허용
    or last_login_status like 'success:%'
    or last_login_status like 'error:%'
    or last_login_status like 'pending:%'
  );

-- PostgREST schema cache 리로드
notify pgrst, 'reload schema';
