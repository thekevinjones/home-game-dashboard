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
  /** Everyone who played (includes the winners). */
  participantIds: PlayerId[];
  /** Who won — usually one player, but several for team games. */
  winnerIds: PlayerId[];
  /**
   * Backend-only ISO timestamp of when the row was entered (Supabase now()).
   * Never displayed — used only as the same-day sort tiebreaker.
   */
  createdAt: string;
}

/** Newest first: by played date, then entry time for same-day games. */
export function byRecentDesc(a: Match, b: Match): number {
  return b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}
/** Oldest first (chronological), same tiebreak. */
export function byChronAsc(a: Match, b: Match): number {
  return a.date.localeCompare(b.date) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
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
  winner_ids: string[];
  created_at: string;
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
  winnerIds: r.winner_ids,
  createdAt: r.created_at,
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
      .select("id,played_on,game_id,participant_ids,winner_ids,created_at")
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false }),
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
  winnerIds: string[];
}

export async function insertMatch(m: NewMatch): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("matches").insert({
    played_on: m.date,
    game_id: m.gameId,
    participant_ids: m.participantIds,
    winner_ids: m.winnerIds,
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
  return matches.filter((m) => m.participantIds.includes(id)).sort(byRecentDesc);
}

/** Did this player win the match? (Handles team games with several winners.) */
export const didWin = (m: Match, id: PlayerId): boolean => m.winnerIds.includes(id);

export interface StandingRow {
  rank: number;
  player: Player;
  /** Nights this player took part in. */
  played: number;
  /** Total matches won — the ranking metric and the only stat shown in the UI. */
  wins: number;
  /**
   * Kept in the data model but NOT shown in the UI (per product decision to
   * display wins only). Fully derived from matches (losses = played - wins),
   * so it's here and ready to surface later without a schema change.
   */
  losses: number;
  /** Win rate 0–100, also derived — kept available, not displayed. */
  winRate: number;
  /** Current run of consecutive wins across their most recent nights. */
  streak: number;
}

export function standings(players: Player[], matches: Match[]): StandingRow[] {
  const rows = players.map((player) => {
    const played = playedBy(matches, player.id);
    const wins = played.filter((m) => didWin(m, player.id)).length;
    let streak = 0;
    for (const m of played) {
      if (didWin(m, player.id)) streak++;
      else break;
    }
    return {
      player,
      played: played.length,
      wins,
      // Derived and retained (not rendered) so wins/losses/win-rate stay queryable.
      losses: played.length - wins,
      winRate: played.length ? Math.round((wins / played.length) * 100) : 0,
      streak,
    };
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
  /** The leader's wins at this game — the stat shown in the UI. */
  leaderWins: number;
  /** The leader's win rate at this game (0–100). Derived; kept, not displayed. */
  leaderWinRate: number;
}

export function gameStats(games: Game[], matches: Match[], players: Player[]): GameStat[] {
  return games.map((game) => {
    const gm = matches.filter((m) => m.gameId === game.id);
    const tally = new Map<PlayerId, { played: number; wins: number }>();
    for (const m of gm) {
      for (const pid of m.participantIds) {
        const t = tally.get(pid) ?? { played: 0, wins: 0 };
        t.played++;
        if (didWin(m, pid)) t.wins++;
        tally.set(pid, t);
      }
    }

    let leaderId: PlayerId | null = null;
    let best = 0;
    for (const [pid, t] of tally) {
      if (t.wins > best) {
        best = t.wins;
        leaderId = pid;
      }
    }
    const leaderTally = leaderId ? tally.get(leaderId) : undefined;
    return {
      game,
      nights: gm.length,
      leader: leaderId ? playerById(players, leaderId) ?? null : null,
      leaderWins: best,
      leaderWinRate:
        leaderTally && leaderTally.played
          ? Math.round((leaderTally.wins / leaderTally.played) * 100)
          : 0,
    };
  });
}

/** Most recent matches first (same-day ties broken by entry time). */
export function recentMatches(matches: Match[], limit = 5): Match[] {
  return [...matches].sort(byRecentDesc).slice(0, limit);
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
        // Only count as a head-to-head win when exactly one of the pair won;
        // if they won together (same team) it's not a win over each other.
        const aWon = didWin(m, a);
        const bWon = didWin(m, b);
        if (aWon && !bWon) r.aWins++;
        else if (bWon && !aWon) r.bWins++;
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

// --- Drill-through detail views ----------------------------------------------

export interface PerGameStat {
  game: Game;
  played: number;
  wins: number;
  winRate: number;
}
export interface HeadToHead {
  opponent: Player;
  shared: number;
  myWins: number;
  theirWins: number;
}
export interface TimelinePoint {
  date: string;
  label: string;
  cumWins: number;
  cumGames: number;
  winRate: number; // cumulative, 0–100
  won: boolean;
  gameName: string;
}
export interface PersonDetail {
  player: Player;
  rank: number;
  games: number;
  wins: number;
  winRate: number;
  streak: number;
  perGame: PerGameStat[];
  headToHead: HeadToHead[];
  timeline: TimelinePoint[];
  recent: Match[];
}

/** Everything the person drill-down needs, all derived from matches. */
export function personDetail(
  id: PlayerId,
  players: Player[],
  games: Game[],
  matches: Match[]
): PersonDetail | null {
  const player = playerById(players, id);
  if (!player) return null;

  const row = standings(players, matches).find((r) => r.player.id === id);
  const mine = matches
    .filter((m) => m.participantIds.includes(id))
    .sort(byChronAsc); // chronological (same-day by entry time)

  let cum = 0;
  const timeline: TimelinePoint[] = mine.map((m, i) => {
    const won = didWin(m, id);
    if (won) cum++;
    return {
      date: m.date,
      label: formatMatchDate(m.date),
      cumWins: cum,
      cumGames: i + 1,
      winRate: Math.round((cum / (i + 1)) * 100),
      won,
      gameName: gameById(games, m.gameId)?.name ?? m.gameId,
    };
  });

  const perGameMap = new Map<string, { played: number; wins: number }>();
  for (const m of mine) {
    const t = perGameMap.get(m.gameId) ?? { played: 0, wins: 0 };
    t.played++;
    if (didWin(m, id)) t.wins++;
    perGameMap.set(m.gameId, t);
  }
  const perGame: PerGameStat[] = [...perGameMap.entries()]
    .map(([gid, t]) => ({
      game: gameById(games, gid) ?? { id: gid, name: gid },
      played: t.played,
      wins: t.wins,
      winRate: t.played ? Math.round((t.wins / t.played) * 100) : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  const h2hMap = new Map<string, { shared: number; myWins: number; theirWins: number }>();
  for (const m of mine) {
    for (const pid of m.participantIds) {
      if (pid === id) continue;
      const t = h2hMap.get(pid) ?? { shared: 0, myWins: 0, theirWins: 0 };
      t.shared++;
      // Mirror the rivalry rule: a shared (co-)win counts for neither side.
      const iWon = didWin(m, id);
      const theyWon = didWin(m, pid);
      if (iWon && !theyWon) t.myWins++;
      else if (theyWon && !iWon) t.theirWins++;
      h2hMap.set(pid, t);
    }
  }
  const headToHead: HeadToHead[] = [...h2hMap.entries()]
    .map(([pid, t]) => ({ opponent: playerById(players, pid), ...t }))
    .filter((h): h is HeadToHead => Boolean(h.opponent))
    .sort((a, b) => b.shared - a.shared);

  return {
    player,
    rank: row?.rank ?? 0,
    games: row?.played ?? mine.length,
    wins: row?.wins ?? cum,
    winRate: row?.winRate ?? 0,
    streak: row?.streak ?? 0,
    perGame,
    headToHead,
    timeline,
    recent: [...mine].reverse().slice(0, 6),
  };
}

export interface GameWinnerStat {
  player: Player;
  wins: number;
  played: number;
  winRate: number;
}
export interface GamePlay {
  date: string;
  label: string;
  /** Winners of this play — usually one, several for team games. */
  winners: Player[];
  participants: Player[];
}
export interface GameDetail {
  game: Game;
  plays: number;
  distinctWinners: number;
  lastPlayed: string | null;
  topWinner: GameWinnerStat | null;
  winsByPlayer: GameWinnerStat[];
  history: GamePlay[];
}

/** Everything the game drill-down needs, all derived from matches. */
export function gameDetail(
  id: GameId,
  players: Player[],
  games: Game[],
  matches: Match[]
): GameDetail | null {
  const game = gameById(games, id);
  if (!game) return null;

  const gm = matches.filter((m) => m.gameId === id).sort(byChronAsc);

  const tally = new Map<string, { wins: number; played: number }>();
  for (const m of gm) {
    for (const pid of m.participantIds) {
      const t = tally.get(pid) ?? { wins: 0, played: 0 };
      t.played++;
      if (didWin(m, pid)) t.wins++;
      tally.set(pid, t);
    }
  }
  const winsByPlayer: GameWinnerStat[] = [...tally.entries()]
    .map(([pid, t]) => ({
      player: playerById(players, pid),
      wins: t.wins,
      played: t.played,
      winRate: t.played ? Math.round((t.wins / t.played) * 100) : 0,
    }))
    .filter((w): w is GameWinnerStat => Boolean(w.player))
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  const history: GamePlay[] = [...gm].reverse().map((m) => ({
    date: m.date,
    label: formatMatchDate(m.date),
    winners: m.winnerIds
      .map((wid) => playerById(players, wid))
      .filter((p): p is Player => Boolean(p)),
    participants: m.participantIds
      .map((pid) => playerById(players, pid))
      .filter((p): p is Player => Boolean(p)),
  }));

  return {
    game,
    plays: gm.length,
    distinctWinners: new Set(gm.flatMap((m) => m.winnerIds)).size,
    lastPlayed: gm.length ? gm[gm.length - 1].date : null,
    topWinner: winsByPlayer.find((w) => w.wins > 0) ?? null,
    winsByPlayer,
    history,
  };
}
