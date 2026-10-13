-- ═════════════════════════════════════════════════════════════
-- what2eat 커뮤니티 스키마 ③  할로윈 호박 터뜨리기 랭킹 (2026)
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전)
--
--   사람(익명 로그인 user_id)당 1행, 최고 점수만 남깁니다.
--   테이블에 직접 쓰는 권한은 주지 않고, submit_halloween_score() 로만 기록합니다.
--     · 점수 범위 0~200 (30초 게임에서 정상적으로 나올 수 있는 값보다 넉넉하게)
--     · 같은 사람이 25초 안에 다시 제출하면 거절 (게임 한 판이 30초)
--     · 2026-11-01 00:00 KST 이후 제출 거절 (src/lib/halloween.js 의 end 와 같은 값)
--   ※ 점수는 브라우저에서 계산되므로 개발자도구로 조작하는 것까지 막지는 못합니다.
--     상품 지급 전에 상위권 기록을 한 번 눈으로 확인하세요.
-- ═════════════════════════════════════════════════════════════

create table if not exists public.halloween_scores (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  nickname       text not null check (char_length(nickname) between 1 and 20),
  affiliation    text check (affiliation is null or char_length(affiliation) <= 20),
  best_score     int  not null check (best_score between 0 and 200),
  plays          int  not null default 1,
  best_at        timestamptz not null default now(),   -- 최고점 달성 시각 (동점 정렬용)
  last_played_at timestamptz not null default now()
);

create index if not exists halloween_scores_rank_idx on public.halloween_scores (best_score desc, best_at asc);

-- ── RLS: 누구나 읽기, 직접 쓰기는 불가 ──
alter table public.halloween_scores enable row level security;

drop policy if exists "halloween public read" on public.halloween_scores;
create policy "halloween public read" on public.halloween_scores
  for select using (true);

grant select on public.halloween_scores to anon, authenticated;

-- ── 점수 제출 RPC ──
create or replace function public.submit_halloween_score(
  p_score int,
  p_nickname text,
  p_affiliation text default null
)
returns table (my_best int, my_rank bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid  uuid := auth.uid();
  prev timestamptz;
  nick text := left(btrim(coalesce(p_nickname, '')), 20);
  aff  text := nullif(left(btrim(coalesce(p_affiliation, '')), 20), '');
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if now() >= timestamptz '2026-11-01 00:00:00+09' then
    raise exception 'event closed';
  end if;
  if p_score is null or p_score < 0 or p_score > 200 then
    raise exception 'invalid score';
  end if;
  if nick = '' then
    nick := '익명의 호박';
  end if;

  select h.last_played_at into prev from public.halloween_scores h where h.user_id = uid;
  if prev is not null and now() - prev < interval '25 seconds' then
    raise exception 'too fast';
  end if;

  insert into public.halloween_scores as h (user_id, nickname, affiliation, best_score, plays, best_at, last_played_at)
  values (uid, nick, aff, p_score, 1, now(), now())
  on conflict (user_id) do update set
    nickname       = excluded.nickname,
    affiliation    = excluded.affiliation,
    plays          = h.plays + 1,
    last_played_at = now(),
    best_at        = case when excluded.best_score > h.best_score then now() else h.best_at end,
    best_score     = greatest(h.best_score, excluded.best_score);

  return query
    select s.best_score,
           (select count(*) + 1 from public.halloween_scores o
             where o.best_score > s.best_score
                or (o.best_score = s.best_score and o.best_at < s.best_at))
    from public.halloween_scores s
    where s.user_id = uid;
end;
$$;

revoke all on function public.submit_halloween_score(int, text, text) from public;
grant execute on function public.submit_halloween_score(int, text, text) to authenticated;

-- ── Realtime (랭킹 실시간 갱신) ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'halloween_scores'
  ) then
    alter publication supabase_realtime add table public.halloween_scores;
  end if;
end $$;

-- ── 오픈 직전 초기화 ──
--   미리보기(?halloween=1)로 테스트한 기록을 지우려면 10/26 오픈 직전에 아래 한 줄을 실행하세요.
-- truncate table public.halloween_scores;
