-- ============================================================
-- 로컬루션 19차-1 · 앱 업데이트 내역 (/updates)
-- ============================================================
--
-- 기능
--   - 자영업자 대상 "이번 달 무엇이 새로워졌는지" 타임라인 페이지
--   - 관리자(대표님)가 /admin/updates 에서 직접 CRUD
--   - 공개 SELECT (비로그인 방문자도 /updates 접근 가능)
--
-- 실행
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체 복사 → Run
--   3) 재실행 안전 (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,                  -- "N플레이스 자동 리뷰 프로그램 출시"
  summary      text NOT NULL,                  -- 한두 줄 본문
  highlight    text,                            -- 파란색 강조 라인 ("힘내세요!" 같은)
  category     text NOT NULL DEFAULT 'feature', -- feature | fix | notice | beta
  released_at  date NOT NULL,                  -- 2025-01-15 (UI에서 YYYY.MM 표기)
  active       boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,         -- 같은 달 내 정렬 (큰 수가 위)
  cover_url    text,                            -- (선택) 썸네일/스크린샷 URL
  link_url     text,                            -- (선택) "자세히 보기" 링크
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_updates_released_idx
  ON public.app_updates (released_at DESC, sort_order DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_app_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_app_updates_touch ON public.app_updates;
CREATE TRIGGER trg_app_updates_touch
  BEFORE UPDATE ON public.app_updates
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_updates();

-- ----- RLS -----
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- 공개 SELECT (active = true 만)
DROP POLICY IF EXISTS "app_updates_public_read" ON public.app_updates;
CREATE POLICY "app_updates_public_read" ON public.app_updates
  FOR SELECT USING (active = true);

-- INSERT/UPDATE/DELETE 는 service_role 전용 (Admin API 경로)
-- anon/authenticated 유저의 쓰기는 모두 차단
DROP POLICY IF EXISTS "app_updates_write_none" ON public.app_updates;
CREATE POLICY "app_updates_write_none" ON public.app_updates
  FOR INSERT WITH CHECK (false);

-- ----- 시드 데이터 (대표님이 수정/삭제 가능) -----
-- 배포 직후 /updates 가 텅 비어 보이지 않도록 최소 3건
INSERT INTO public.app_updates (title, summary, highlight, category, released_at, sort_order)
SELECT * FROM (VALUES
  ('블로그·체험단 키워드 순위 추적 출시',
   '체험단이 쓴 글이나 블로그 포스팅이 네이버 인기글에서 몇 위에 있는지 실시간으로 확인할 수 있어요.',
   '마케팅관리 > 블로그 순위 추적에서 바로 등록 가능합니다.',
   'feature', DATE '2026-04-20', 30),
  ('1:1 문의 통합 관리 기능',
   '고객이 남긴 문의를 관리자 페이지에서 종합적으로 관리하고, 답변 작성 시 자동으로 "답변완료" 상태로 전환됩니다.',
   NULL,
   'feature', DATE '2026-04-20', 20),
  ('전국 시/군/구 커뮤니티 확장',
   '지역 커뮤니티가 17개 → 230+ 시/군/구로 확장되어 자영업자들끼리 더 가까운 동네끼리 소통할 수 있습니다.',
   NULL,
   'feature', DATE '2026-04-20', 10)
) AS v(title, summary, highlight, category, released_at, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.app_updates);

-- ============================================================
-- 완료: SELECT * FROM app_updates ORDER BY released_at DESC;
-- ============================================================
