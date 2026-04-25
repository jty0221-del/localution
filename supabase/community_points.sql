-- =====================================================================
-- Localution · Community + Points 스키마 (14차 배포용)
-- =====================================================================
-- 설계 원칙
--  · 지역 게시판: 전국 + 구/시 단위. posts.region_id NULL ⇒ 전국
--  · 포인트: append-only ledger. view 로 총합 계산
--  · 초반 인플레이션 방지 차원에서 룰 상수는 앱 레이어(app/lib/points.ts)에
--    선언하고, 룰 키만 ledger 에 저장
-- =====================================================================

-- 1) 지역 마스터 ─────────────────────────────────────────────────────
create table if not exists public.community_regions (
  id            text primary key,             -- 예: 'nationwide','seoul-gangnam'
  label         text not null,                -- '전국', '강남구'
  parent_label  text,                         -- '서울', '부산', null(=전국)
  sort_order    int  not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 2) 게시글 ───────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id           bigserial primary key,
  user_id      uuid,                          -- auth.users.id (FK 생략 - 외부 OAuth 병행)
  author_name  text,
  author_email text,
  region_id    text references public.community_regions(id),
  category     text not null check (category in ('tip','qna','success','free','notice')),
  title        text not null,
  content      text not null,
  media        jsonb not null default '[]'::jsonb,
  likes        int  not null default 0,
  featured     boolean not null default false,
  featured_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_cp_region_created on public.community_posts(region_id, created_at desc);
create index if not exists idx_cp_category       on public.community_posts(category);
create index if not exists idx_cp_featured       on public.community_posts(featured) where featured = true;

-- 3) 댓글 ─────────────────────────────────────────────────────────────
create table if not exists public.community_comments (
  id           bigserial primary key,
  post_id      bigint not null references public.community_posts(id) on delete cascade,
  user_id      uuid,
  author_name  text,
  author_email text,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_cc_post on public.community_comments(post_id, created_at);

-- 4) 좋아요 ───────────────────────────────────────────────────────────
create table if not exists public.community_post_likes (
  post_id    bigint not null references public.community_posts(id) on delete cascade,
  user_email text   not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_email)
);

-- 5) 포인트 원장(ledger) ──────────────────────────────────────────────
--    rule_key 는 앱 레이어 POINT_RULES 의 키를 그대로 저장한다.
create table if not exists public.point_ledger (
  id          bigserial primary key,
  user_email  text not null,
  user_id     uuid,
  rule_key    text not null,              -- 'POST_CREATE','COMMENT_CREATE','POST_FEATURED' 등
  delta       int  not null,              -- +/- 포인트
  ref_type    text,                       -- 'post','comment','manual'
  ref_id      bigint,
  memo        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pl_user_created on public.point_ledger(user_email, created_at desc);
create unique index if not exists uq_pl_rule_ref on public.point_ledger(user_email, rule_key, ref_type, ref_id)
  where ref_type is not null and ref_id is not null;
-- ⇑ 동일 게시글/댓글에 동일 룰이 중복 적립되는 것 방지(인기글 500p 중복 방지 포함)

-- 6) 유저별 포인트 합계 뷰 ────────────────────────────────────────────
create or replace view public.v_user_points as
  select user_email,
         coalesce(sum(delta), 0) as balance,
         count(*)                as txn_count,
         max(created_at)         as last_txn_at
    from public.point_ledger
   group by user_email;

-- =====================================================================
-- SEED: 지역 (전국 + 17 구·시)
-- =====================================================================
insert into public.community_regions (id, label, parent_label, sort_order) values
  ('nationwide',       '전국',          null,     0),

  ('seoul-gangnam',    '강남구',        '서울',   10),
  ('seoul-songpa',     '송파구',        '서울',   11),
  ('seoul-seocho',     '서초구',        '서울',   12),
  ('seoul-mapo',       '마포구',        '서울',   13),
  ('seoul-yongsan',    '용산구',        '서울',   14),
  ('seoul-seongdong',  '성동구',        '서울',   15),

  ('busan-haeundae',   '해운대구',      '부산',   30),
  ('busan-suyeong',    '수영구',        '부산',   31),
  ('busan-dongnae',    '동래구',        '부산',   32),

  ('gyeonggi-bundang', '성남 분당구',   '경기',   50),
  ('gyeonggi-suwon',   '수원시',        '경기',   51),
  ('gyeonggi-goyang',  '고양시',        '경기',   52),
  ('gyeonggi-hwaseong','화성시',        '경기',   53),

  ('incheon-songdo',   '송도(연수구)',  '인천',   70),

  ('daegu-suseong',    '수성구',        '대구',   80),
  ('daejeon-yuseong',  '유성구',        '대전',   90),
  ('gwangju-seogu',    '서구',          '광주',  100),
  ('jeju-city',        '제주시',        '제주',  120)
on conflict (id) do nothing;

-- =====================================================================
-- RLS — supabase/migrations/20260425_community_rls.sql 에서 활성화
-- =====================================================================
-- 신규 배포 시 위 마이그레이션을 반드시 함께 실행할 것.
--   · community_posts/comments/post_likes : 공개 SELECT, 쓰기는 service role 전용
--   · point_ledger                        : 본인 row 만 SELECT
