// Single source of truth for the House Cup dashboard.
//
// There are only THREE things to hand-edit — `players`, `games`, and `matches`.
// Everything the dashboard shows (standings, current leader, per-game leaders,
// recent nights, most played, head-to-head rivalries) is DERIVED from those by
// the selectors near the bottom, so adding a single match row updates every
// view automatically. No seasons — a match just records the date, who played,
// and who won.
//
// Static for now; the shapes deliberately mirror a relational schema (players,
// games, matches) so swapping this module for a DB + admin CRUD later is a
// refactor, not a rewrite.

export type PlayerId = string;
export type GameId = string;

export interface Player {
  id: PlayerId;
  name: string;
  /** Accent color — used for the ring, bars, and initials fallback. */
  color: string;
  /** Optional /public path to a photo; falls back to colored initials. */
  avatar?: string;
  /** CSS object-position for the avatar crop, e.g. "50% 20%". */
  avatarPosition?: string;
}

export interface Game {
  id: GameId;
  name: string;
  /** Optional /public path to cover art; falls back to a gradient tile. */
  art?: string;
}

export interface Match {
  /** Unique id for this result row. */
  id: string;
  /** ISO date the night was played, e.g. "2026-07-04". */
  date: string;
  gameId: GameId;
  /** Everyone who played (must include the winner). */
  participantIds: PlayerId[];
  /** Who won — must be one of participantIds. */
  winnerId: PlayerId;
}

// --- Data --------------------------------------------------------------------
// Starting from a clean slate. To seed the dashboard, add rows like:
//
//   players: [{ id: "ellie", name: "Ellie", color: "#b07be0", avatar: "/players/ellie.png" }]
//   games:   [{ id: "catan", name: "Settlers of Catan", art: "/games/catan.png" }]
//   matches: [{ id: "m1", date: "2026-07-04", gameId: "catan",
//               participantIds: ["ellie", "dad"], winnerId: "ellie" }]
//
// `id`s are the glue: a match references players/games by their `id`.

export const players: Player[] = [];
export const games: Game[] = [];
export const matches: Match[] = [];

// --- Lookups & formatting ----------------------------------------------------

export const playerById = (id: PlayerId): Player | undefined =>
  players.find((p) => p.id === id);

export const gameById = (id: GameId): Game | undefined =>
  games.find((g) => g.id === id);

/**
 * Prefix a /public asset path with the deploy sub-path (NEXT_PUBLIC_BASE_PATH).
 * Needed because plain <img src> — unlike next/link or next/image — does not
 * get basePath applied automatically. Empty in dev and for the standalone/
 * Docker build; set to e.g. "/home-game-dashboard" for the GitHub Pages export.
 */
export const asset = (path: string): string =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export const formatRecord = (wins: number, losses: number): string =>
  `${wins}–${losses}`; // en dash

/** "2026-07-04" -> "Sat · Jul 4". Deterministic (UTC), no timezone drift. */
export function formatMatchDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${wd[day]} · ${mo[m - 1]} ${d}`;
}

// --- Derived views -----------------------------------------------------------

/** Matches a player took part in, most recent first. */
function playedBy(id: PlayerId): Match[] {
  return matches
    .filter((m) => m.participantIds.includes(id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface StandingRow {
  rank: number;
  player: Player;
  played: number;
  wins: number;
  losses: number;
  winRate: number; // 0–100
  /** Current run of consecutive wins across their most recent nights. */
  streak: number;
}

export function standings(): StandingRow[] {
  const rows = players.map((player) => {
    const played = playedBy(player.id);
    const wins = played.filter((m) => m.winnerId === player.id).length;
    let streak = 0;
    for (const m of played) {
      if (m.winnerId === player.id) streak++;
      else break;
    }
    return {
      player,
      played: played.length,
      wins,
      losses: played.length - wins,
      winRate: played.length ? Math.round((wins / played.length) * 100) : 0,
      streak,
    };
  });
  rows.sort(
    (a, b) =>
      b.winRate - a.winRate ||
      b.wins - a.wins ||
      a.player.name.localeCompare(b.player.name)
  );
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** Current overall leader = top of the standings among players with ≥1 night. */
export function leader(): StandingRow | null {
  return standings().find((r) => r.played > 0) ?? null;
}

export interface GameStat {
  game: Game;
  /** Number of nights this game has been played. */
  nights: number;
  /** Best win rate among its players (null until it has been played). */
  leader: Player | null;
  leaderWinRate: number; // 0–100
}

export function gameStats(): GameStat[] {
  return games.map((game) => {
    const gm = matches.filter((m) => m.gameId === game.id);
    const tally = new Map<PlayerId, { played: number; wins: number }>();
    for (const m of gm) {
      for (const pid of m.participantIds) {
        const t = tally.get(pid) ?? { played: 0, wins: 0 };
        t.played++;
        if (m.winnerId === pid) t.wins++;
        tally.set(pid, t);
      }
    }
    let leaderId: PlayerId | null = null;
    let best = -1;
    for (const [pid, t] of tally) {
      const rate = t.wins / t.played;
      if (rate > best) {
        best = rate;
        leaderId = pid;
      }
    }
    return {
      game,
      nights: gm.length,
      leader: leaderId ? playerById(leaderId) ?? null : null,
      leaderWinRate: best >= 0 ? Math.round(best * 100) : 0,
    };
  });
}

/** Most recent matches first. */
export function recentMatches(limit = 5): Match[] {
  return [...matches]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export interface MostPlayed {
  game: Game;
  nights: number;
  /** Bar width relative to the most-played game, 0–100. */
  pct: number;
}

export function mostPlayed(): MostPlayed[] {
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
  /** Nights both players took part in. */
  nights: number;
}

/** Head-to-head records for every pair that has played together, top N first. */
export function rivalries(limit = 2): Rivalry[] {
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
      a: playerById(r.a)!,
      b: playerById(r.b)!,
      aWins: r.aWins,
      bWins: r.bWins,
      nights: r.nights,
    }));
}
