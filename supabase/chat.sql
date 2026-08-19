-- ═════════════════════════════════════════════════════════════
-- what2eat 커뮤니티 스키마 ②  실시간 채팅 + 맛집 추천 카드
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전)
-- ═════════════════════════════════════════════════════════════

-- 채팅 메시지: 자유 대화(kind='chat')와 맛집 추천 카드(kind='rec')를 한 테이블에.
--   맛집 추천은 rec_place(가게명) + rec_category(walk=도보 / delivery=배달) + rec_link(선택),
--   body 에는 한줄평/본문이 들어갑니다.
create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  nickname     text not null check (char_length(nickname) <= 20),
  affiliation  text check (affiliation is null or char_length(affiliation) <= 20),  -- 선택 소속
  kind         text not null default 'chat' check (kind in ('chat', 'rec')),
  body         text check (body is null or char_length(body) <= 500),
  rec_place    text check (rec_place is null or char_length(rec_place) <= 60),      -- 맛집 가게명
  rec_category text check (rec_category is null or rec_category in ('walk', 'delivery')),
  rec_link     text check (rec_link is null or char_length(rec_link) <= 300),
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_created_idx on public.chat_messages (created_at);

-- ── RLS ──
alter table public.chat_messages enable row level security;

drop policy if exists "chat public read" on public.chat_messages;
create policy "chat public read" on public.chat_messages
  for select using (true);                        -- 채팅은 누구나 읽기

drop policy if exists "chat insert own" on public.chat_messages;
create policy "chat insert own" on public.chat_messages
  for insert with check (auth.uid() = user_id);   -- 본인만 작성

drop policy if exists "chat delete own" on public.chat_messages;
create policy "chat delete own" on public.chat_messages
  for delete using (auth.uid() = user_id);        -- 본인 메시지만 삭제

-- ── 권한(anon = 미로그인, authenticated = 익명 로그인 포함) ──
grant select, insert, delete on public.chat_messages to anon, authenticated;

-- ── Realtime ──
-- (이미 추가돼 있으면 에러가 날 수 있으니 그때는 이 줄만 건너뛰세요.)
alter publication supabase_realtime add table public.chat_messages;
