-- Enable Supabase Realtime on the game tables.
--
-- Adds players, games, and matches to the `supabase_realtime` publication so the
-- dashboard can subscribe to INSERT/UPDATE/DELETE and refresh live on every open
-- device when the add-match form (or a direct DB change) writes new data.
--
-- Realtime respects RLS: the anon key only receives change events for rows it can
-- SELECT, which the anon read policies in 0001_init.sql already permit.
--
-- `replica identity full` makes UPDATE/DELETE events carry the complete old row
-- (not just the primary key), so subscribers get full payloads. Cheap here given
-- the tables are tiny.

alter publication supabase_realtime add table public.players, public.games, public.matches;

alter table public.players replica identity full;
alter table public.games   replica identity full;
alter table public.matches replica identity full;
