-- House Cup seed data: initial players and games (no matches yet).
--
-- IDs are human-readable text slugs, referenced by matches. Avatar/art paths are
-- /public asset paths — the app prefixes them with NEXT_PUBLIC_BASE_PATH at render
-- time, so store them WITHOUT the base path (e.g. '/players/dad.png').
--
-- Safe to re-run: on id conflict every column is refreshed. Edit the names and
-- colors below to taste; the assets already live in house-cup/public/.

insert into public.players (id, name, color, avatar, avatar_position) values
  ('dad',   'Dad',   '#2f80ed', '/players/dad.png',   null),
  ('mom',   'Mom',   '#eb5e9c', '/players/mom.png',   null),
  ('ellie', 'Ellie', '#b07be0', '/players/ellie.png', null),
  ('ollie', 'Ollie', '#f2a541', '/players/ollie.png', null)
on conflict (id) do update
  set name = excluded.name,
      color = excluded.color,
      avatar = excluded.avatar,
      avatar_position = excluded.avatar_position;

insert into public.games (id, name, art) values
  ('catan',    'Catan',          '/games/catan.png'),
  ('handfoot', 'Hand and Foot',  '/games/handfoot.png'),
  ('ticket',   'Ticket to Ride', '/games/ticket.jpeg')
on conflict (id) do update
  set name = excluded.name,
      art = excluded.art;
