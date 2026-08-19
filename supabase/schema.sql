-- ═════════════════════════════════════════════════════════════
-- what2eat 커뮤니티 스키마 ①  한줄 리뷰 · 이모지 별점
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전)
-- ═════════════════════════════════════════════════════════════

-- 리뷰 테이블: "유저 1명당 메뉴 1표". 재투표는 (user_id, dish) 유니크로 upsert.
create table if not exists public.menu_reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  dish       text not null,                                   -- 메뉴 이름(키). 주가 바뀌어도 누적됨
  emoji      text not null check (emoji in ('fire','up','meh','skull')),
  score      int  not null check (score between 1 and 4),     -- fire=4 · up=3 · meh=2 · skull=1
  comment    text check (comment is null or char_length(comment) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dish)
);

create index if not exists menu_reviews_dish_idx on public.menu_reviews (dish);

-- updated_at 자동 갱신 트리거
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_reviews_touch on public.menu_reviews;
create trigger menu_reviews_touch
  before update on public.menu_reviews
  for each row execute function public.touch_updated_at();

-- ── 통계 뷰: 메뉴별 이모지 카운트 (앱이 통째로 읽어 캐시 + 랭킹 계산) ──
-- security_invoker=true → 조회 role 의 RLS 를 그대로 적용(아래 public read 정책).
create or replace view public.menu_review_stats
  with (security_invoker = true) as
select
  dish,
  count(*) filter (where emoji = 'fire')  as fire,
  count(*) filter (where emoji = 'up')    as up,
  count(*) filter (where emoji = 'meh')   as meh,
  count(*) filter (where emoji = 'skull') as skull
from public.menu_reviews
group by dish;

-- ── RLS ──
alter table public.menu_reviews enable row level security;

drop policy if exists "reviews public read" on public.menu_reviews;
create policy "reviews public read" on public.menu_reviews
  for select using (true);                       -- 통계/한줄평은 누구나 읽기

drop policy if exists "insert own review" on public.menu_reviews;
create policy "insert own review" on public.menu_reviews
  for insert with check (auth.uid() = user_id);  -- 본인 행만 작성

drop policy if exists "update own review" on public.menu_reviews;
create policy "update own review" on public.menu_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own review" on public.menu_reviews;
create policy "delete own review" on public.menu_reviews
  for delete using (auth.uid() = user_id);

-- ── 권한(anon = 미로그인, authenticated = 익명 로그인 포함) ──
grant select, insert, update, delete on public.menu_reviews to anon, authenticated;
grant select on public.menu_review_stats to anon, authenticated;

-- ── Realtime: 리뷰 변경을 구독해 통계 실시간 갱신 ──
-- (이미 추가돼 있으면 에러가 날 수 있으니 그때는 이 줄만 건너뛰세요.)
alter publication supabase_realtime add table public.menu_reviews;
