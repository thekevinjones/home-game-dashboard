-- Support multiple winners per match (team games). Replaces the single
-- winner_id column with a winner_ids text[] that mirrors participant_ids, so a
-- team game can record every player who won together.

alter table public.matches add column if not exists winner_ids text[];

-- Backfill existing rows: the lone winner becomes a one-element array.
update public.matches
  set winner_ids = array[winner_id]
  where winner_ids is null and winner_id is not null;

alter table public.matches alter column winner_ids set default '{}';
alter table public.matches alter column winner_ids set not null;

-- winner_ids fully replaces winner_id; dropping it also drops its FK constraint.
-- (participant_ids likewise has no FK, so this keeps the two arrays consistent.)
alter table public.matches drop column if exists winner_id;
