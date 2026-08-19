-- ═════════════════════════════════════════════════════════════
-- what2eat 커뮤니티 스키마 ②  실시간 채팅 + 맛집 추천 카드
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전)
-- ═════════════════════════════════════════════════════════════

-- 채팅 메시지: 4개 카드(탭)를 kind 로 구분해 한 테이블에 저장합니다.
--   kind = 'chat'(자유대화) | 'rec'(맛집리스트) | 'mingle'(밍글링·소모임) | 'owner'(주인장께 톡톡).
--   맛집(rec)은 rec_place(가게명) + rec_category(walk=워크인 / delivery=배달) + rec_link(선택),
--   밍글링(mingle)은 mingle_title(이벤트명) + mingle_when(시간) + mingle_where(장소) + mingle_cap(인원),
--   자유대화/주인장께 톡톡은 body(본문)만 사용합니다.
create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  nickname     text not null check (char_length(nickname) <= 20),
  affiliation  text check (affiliation is null or char_length(affiliation) <= 20),  -- 선택 소속
  kind         text not null default 'chat' check (kind in ('chat', 'rec', 'mingle', 'owner')),
  body         text check (body is null or char_length(body) <= 500),
  rec_place    text check (rec_place is null or char_length(rec_place) <= 60),      -- 맛집 가게명
  rec_category text check (rec_category is null or rec_category in ('walk', 'delivery')),
  rec_link     text check (rec_link is null or char_length(rec_link) <= 300),
  mingle_title text check (mingle_title is null or char_length(mingle_title) <= 60),  -- 밍글링 이벤트명
  mingle_when  text check (mingle_when  is null or char_length(mingle_when)  <= 60),  -- 시간
  mingle_where text check (mingle_where is null or char_length(mingle_where) <= 60),  -- 장소
  mingle_cap   text check (mingle_cap   is null or char_length(mingle_cap)   <= 30),  -- 인원
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_created_idx on public.chat_messages (created_at);

-- ── kind 확장 마이그레이션 ── (기존 테이블에 밍글링/주인장께 톡톡 값을 허용)
--   이미 만들어진 테이블은 위 create 문이 건너뛰어지므로, 아래에서 CHECK 제약을 갱신합니다.
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages
  add constraint chat_messages_kind_check check (kind in ('chat', 'rec', 'mingle', 'owner'));

-- ── 밍글링 구조화 컬럼 ── (기존 테이블에 이벤트명/시간/장소/인원 추가)
alter table public.chat_messages add column if not exists mingle_title text;
alter table public.chat_messages add column if not exists mingle_when  text;
alter table public.chat_messages add column if not exists mingle_where text;
alter table public.chat_messages add column if not exists mingle_cap   text;

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

-- ── Realtime ── (이미 등록돼 있어도 에러 없이 넘어가도록 가드)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
