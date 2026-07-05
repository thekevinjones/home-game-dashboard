// Data layer for the House Cup dashboard, backed by Supabase.
//
// Three tables — players, games, matches — hold the data (a match records the
// date played, who took part, and who won; no seasons). `loadData()` fetches
// all three; `insertMatch()` records a new result. Everything the dashboard
// shows is DERIVED from those rows by the pure selector functions below, which
// take the fetched arrays as arguments (no module-level state), so the same
// logic runs on the client after every fetch.

import { getSupabase } from "./supabase";

export type PlayerId = string;
export type GameId = string;

export interface Player {
  id: PlayerId;
  name: string;
  /** Accent color — used for the ring, bars, and initials fallback. */
  color: string;
  /** Optional photo path/URL; falls back to colored initials. */
  avatar?: string;
  /** CSS object-position for the avatar crop, e.g. "50% 20%". */
  avatarPosition?: string;
}

export interface Game {
  id: GameId;
  name: string;
  /** Optional cover-art path/URL; falls back to a gradient tile. */
  art?: string;
}

export interface Match {
  id: string;
  /** ISO date the night was played, e.g. "2026-07-04". */
  date: string;
  gameId: GameId;
  /** Everyone who played (includes the winner). */
  participantIds: PlayerId[];
  winnerId: PlayerId;
}

// --- DB row shapes + mapping (snake_case in Postgres -> camelCase app types) --

interface PlayerRow {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  avatar_position: string | null;
}
interface GameRow {
  id: string;
  name: string;
  art: string | null;
}
interface MatchRow {
  id: string;
  played_on: string;
  game_id: string;
  participant_ids: string[];
  winner_id: string;
}

const mapPlayer = (r: PlayerRow): Player => ({
  id: r.id,
  name: r.name,
  color: r.color,
  avatar: r.avatar ?? undefined,
  avatarPosition: r.avatar_position ?? undefined,
});
const mapGame = (r: GameRow): Game => ({ id: r.id, name: r.name, art: r.art ?? undefined });
const mapMatch = (r: MatchRow): Match => ({
  id: r.id,
  date: r.played_on,
  gameId: r.game_id,
  participantIds: r.participant_ids,
  winnerId: r.winner_id,
});

// --- Fetch & insert ----------------------------------------------------------

export interface DashboardData {
  players: Player[];
  games: Game[];
  matches: Match[];
}

export async function loadData(): Promise<DashboardData> {
  const sb = getSupabase();
  const [players, games, matches] = await Promise.all([
    sb.from("players").select("id,name,color,avatar,avatar_position").order("name"),
    sb.from("games").select("id,name,art").order("name"),
    sb
      .from("matches")
      .select("id,played_on,game_id,participant_ids,winner_id")
      .order("played_on", { ascending: false }),
  ]);
  if (players.error) throw players.error;
  if (games.error) throw games.error;
  if (matches.error) throw matches.error;
  return {
    players: (players.data as PlayerRow[]).map(mapPlayer),
    games: (games.data as GameRow[]).map(mapGame),
    matches: (matches.data as MatchRow[]).map(mapMatch),
  };
}

export interface NewMatch {
  date: string;
  gameId: string;
  participantIds: string[];
  winnerId: string;
}

export async function insertMatch(m: NewMatch): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("matches").insert({
    played_on: m.date,
    game_id: m.gameId,
    participant_ids: m.participantIds,
    winner_id: m.winnerId,
  });
  if (error) throw error;
}

/**
 * Subscribe to live changes on players/games/matches. `onChange` fires on every
 * INSERT/UPDATE/DELETE (e.g. when the add-match form writes a new result on
 * another device) — the dashboard re-runs loadData() from it. Returns an
 * unsubscribe function. Requires the tables in the `supabase_realtime`
 * publication (see supabase/migrations/0002_enable_realtime.sql).
 */
export function subscribeToData(onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel("house-cup-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "players" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, onChange)
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}

// --- Lookups & formatting ----------------------------------------------------

export const playerById = (players: Player[], id: PlayerId): Player | undefined =>
  players.find((p) => p.id === id);

export const gameById = (games: Game[], id: GameId): Game | undefined =>
  games.find((g) => g.id === id);

/**
 * Prefix a /public asset path with the deploy sub-path (NEXT_PUBLIC_BASE_PATH).
 * Absolute http(s) URLs (e.g. Supabase Storage) are returned unchanged.
 */
export const asset = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

/** "2026-07-04" -> "Sat · Jul 4". Deterministic (UTC), no timezone drift. */
export function formatMatchDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${wd[day]} · ${mo[m - 1]} ${d}`;
}

// --- Derived views (pure; operate on the fetched arrays) ---------------------

/** Matches a player took part in, most recent first. */
function playedBy(matches: Match[], id: PlayerId): Match[] {
  return matches
    .filter((m) => m.participantIds.includes(id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface StandingRow {
  rank: number;
  player: Player;
  /** Nights this player took part in (participation, not a win/loss record). */
  played: number;
  /** Total matches won — the ranking metric. */
  wins: number;
  /** Current run of consecutive wins across their most recent nights. */
  streak: number;
}

export function standings(players: Player[], matches: Match[]): StandingRow[] {
  const rows = players.map((player) => {
    const played = playedBy(matches, player.id);
    const wins = played.filter((m) => m.winnerId === player.id).length;
    let streak = 0;
    for (const m of played) {
      if (m.winnerId === player.id) streak++;
      else break;
    }
    return { player, played: played.length, wins, streak };
  });
  // Rank by total wins (desc); ties broken by name for a stable order.
  rows.sort((a, b) => b.wins - a.wins || a.player.name.localeCompare(b.player.name));
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** Current overall leader = the player with the most wins (needs ≥1 win). */
export function leader(players: Player[], matches: Match[]): StandingRow | null {
  return standings(players, matches).find((r) => r.wins > 0) ?? null;
}

export interface GameStat {
  game: Game;
  nights: number;
  /** Player with the most wins at this game. */
  leader: Player | null;
  leaderWins: number;
}

export function gameStats(games: Game[], matches: Match[], players: Player[]): GameStat[] {
  return games.map((game) => {
    const gm = matches.filter((m) => m.gameId === game.id);
    const wins = new Map<PlayerId, number>();
    for (const m of gm) wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1);

    let leaderId: PlayerId | null = null;
    let best = 0;
    for (const [pid, w] of wins) {
      if (w > best) {
        best = w;
        leaderId = pid;
      }
    }
    return {
      game,
      nights: gm.length,
      leader: leaderId ? playerById(players, leaderId) ?? null : null,
      leaderWins: best,
    };
  });
}

/** Most recent matches first. */
export function recentMatches(matches: Match[], limit = 5): Match[] {
  return [...matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export interface MostPlayed {
  game: Game;
  nights: number;
  pct: number; // bar width relative to the most-played game, 0–100
}

export function mostPlayed(games: Game[], matches: Match[]): MostPlayed[] {
  const counts = games.map((game) => ({
    game,
    nights: matches.filter((m) => m.gameId === game.id).length,
  }));
  const max = Math.max(0, ...counts.map((c) => c.nights));
  return counts
    .sort((a, b) => b.nights - a.nights)
    .map((c) => ({ ...c, pct: max ? Math.round((c.nights / max) * 100) : 0 }));
}

export interface Rivalry {
  a: Player;
  b: Player;
  aWins: number;
  bWins: number;
  nights: number;
}

/** Head-to-head records for every pair that has played together, top N first. */
export function rivalries(matches: Match[], players: Player[], limit = 2): Rivalry[] {
  const pairs = new Map<
    string,
    { a: PlayerId; b: PlayerId; aWins: number; bWins: number; nights: number }
  >();
  for (const m of matches) {
    const parts = [...new Set(m.participantIds)];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const [a, b] = [parts[i], parts[j]].sort();
        const key = `${a}|${b}`;
        const r = pairs.get(key) ?? { a, b, aWins: 0, bWins: 0, nights: 0 };
        r.nights++;
        if (m.winnerId === a) r.aWins++;
        else if (m.winnerId === b) r.bWins++;
        pairs.set(key, r);
      }
    }
  }
  return [...pairs.values()]
    .sort((x, y) => y.nights - x.nights || y.aWins + y.bWins - (x.aWins + x.bWins))
    .slice(0, limit)
    .map((r) => ({
      a: playerById(players, r.a)!,
      b: playerById(players, r.b)!,
      aWins: r.aWins,
      bWins: r.bWins,
      nights: r.nights,
    }));
}
