-- Backend-only timestamp of when a match row was entered. The user-facing date
-- stays `played_on`; `created_at` is never shown. It exists to break ties when
-- several games are played on the same date, so "recent" ordering resolves
-- same-day games by the order they were entered.

alter table public.matches add column if not exists created_at timestamptz;

-- Backfill existing rows to their played date (midnight) so ordering stays sane.
update public.matches set created_at = played_on::timestamptz where created_at is null;

-- Any insert path (add-match form, MCP, SQL) gets the entry time automatically.
alter table public.matches alter column created_at set default now();
alter table public.matches alter column created_at set not null;
