-- House Cup schema: players, games, matches.
--
-- A match records one game night: the date played, who took part, and who won.
-- No seasons. The dashboard reads all three tables with the anon key and can
-- insert new matches with the anon key, so RLS allows anon SELECT on every
-- table and anon INSERT on matches only.
--
-- IDs are text slugs (e.g. 'kevin', 'mario-kart') set explicitly on insert, so
-- seed data and match references stay human-readable.

create table if not exists public.players (
  id              text primary key,
  name            text not null,
  color           text not null,
  avatar          text,
  avatar_position text
);

create table if not exists public.games (
  id   text primary key,
  name text not null,
  art  text
);

create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  played_on       date not null,
  game_id         text not null references public.games (id),
  participant_ids text[] not null,
  winner_id       text not null references public.players (id)
);

create index if not exists matches_played_on_idx on public.matches (played_on desc);
create index if not exists matches_game_id_idx on public.matches (game_id);

-- Row Level Security -----------------------------------------------------------
alter table public.players enable row level security;
alter table public.games   enable row level security;
alter table public.matches enable row level security;

-- Public read on everything (the dashboard is read-only for players/games).
create policy "players anon read" on public.players for select to anon using (true);
create policy "games anon read"   on public.games   for select to anon using (true);
create policy "matches anon read" on public.matches for select to anon using (true);

-- The "add match" form writes as the anon key. Read-only for players/games;
-- inserts are allowed only on matches.
create policy "matches anon insert" on public.matches for insert to anon with check (true);
