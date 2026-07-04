// Single source of truth for the House Cup dashboard.
//
// For now this is hardcoded. The shapes below are deliberately close to what a
// relational schema would look like (players, games, results) so that swapping
// this module for a database + admin CRUD later is a refactor, not a rewrite.
// Derived views (standings, "on the table", rivalries, most played) are computed
// from these primitives where practical, and otherwise declared explicitly.

export type PlayerId = "ellie" | "mom" | "dad" | "ollie";

export interface Player {
  id: PlayerId;
  name: string;
  /** Path under /public */
  avatar: string;
  /** CSS object-position for the avatar crop */
  avatarPosition: string;
  /** Brand/ring color for this player */
  color: string;
}

export interface Game {
  id: string;
  name: string;
  /** Path under /public */
  art: string;
  /** Total nights this game has been played */
  nights: number;
}

export interface GameResult {
  /** Human label for when it happened, e.g. "Thu · Jun 18" */
  when: string;
  gameId: string;
  winnerId: PlayerId;
}

export interface SeasonMeta {
  season: number;
  /** Header date label */
  dateLabel: string;
}

export interface ChampionStat {
  playerId: PlayerId;
  wins: number;
  losses: number;
  winRate: number; // 0-100
  nightsPlayed: number;
  streak: number;
  heldSince: string;
}

export interface StandingRow {
  rank: number;
  playerId: PlayerId;
  wins: number;
  losses: number;
  nightsPlayed: number;
  winRate: number; // 0-100
  champion: boolean;
}

export interface GameLeader {
  gameId: string;
  leaderId: PlayerId;
  /** Leader's win rate in this game, 0-100 */
  winRate: number;
}

export interface Rivalry {
  aId: PlayerId;
  bId: PlayerId;
  aWins: number;
  bWins: number;
}

// --- Primitives -------------------------------------------------------------

export const players: Record<PlayerId, Player> = {
  ellie: { id: "ellie", name: "Ellie", avatar: "/players/ellie.png", avatarPosition: "50% 20%", color: "#b07be0" },
  mom: { id: "mom", name: "Mom", avatar: "/players/mom.png", avatarPosition: "62% 38%", color: "#e8728f" },
  dad: { id: "dad", name: "Dad", avatar: "/players/dad.png", avatarPosition: "50% 28%", color: "#4fb0c2" },
  ollie: { id: "ollie", name: "Ollie", avatar: "/players/ollie.png", avatarPosition: "52% 26%", color: "#e0a84e" },
};

export const games: Game[] = [
  { id: "catan", name: "Settlers of Catan", art: "/games/catan.png", nights: 84 },
  { id: "ttr", name: "Ticket to Ride", art: "/games/ticket.jpeg", nights: 71 },
  { id: "handfoot", name: "Hand & Foot", art: "/games/handfoot.png", nights: 63 },
];

export const season: SeasonMeta = {
  season: 3,
  dateLabel: "Sat · Jun 20",
};

export const champion: ChampionStat = {
  playerId: "ellie",
  wins: 39,
  losses: 15,
  winRate: 72,
  nightsPlayed: 54,
  streak: 5,
  heldSince: "April",
};

export const standings: StandingRow[] = [
  { rank: 1, playerId: "ellie", wins: 39, losses: 15, nightsPlayed: 54, winRate: 72, champion: true },
  { rank: 2, playerId: "mom", wins: 48, losses: 22, nightsPlayed: 70, winRate: 68, champion: false },
  { rank: 3, playerId: "dad", wins: 38, losses: 29, nightsPlayed: 67, winRate: 57, champion: false },
  { rank: 4, playerId: "ollie", wins: 21, losses: 30, nightsPlayed: 51, winRate: 41, champion: false },
];

export const gameLeaders: GameLeader[] = [
  { gameId: "catan", leaderId: "ellie", winRate: 70 },
  { gameId: "ttr", leaderId: "dad", winRate: 66 },
  { gameId: "handfoot", leaderId: "mom", winRate: 74 },
];

export const recentResults: GameResult[] = [
  { when: "Tonight", gameId: "catan", winnerId: "ellie" },
  { when: "Thu · Jun 18", gameId: "ttr", winnerId: "dad" },
  { when: "Mon · Jun 15", gameId: "handfoot", winnerId: "mom" },
  { when: "Sat · Jun 13", gameId: "catan", winnerId: "ellie" },
  { when: "Thu · Jun 11", gameId: "handfoot", winnerId: "mom" },
];

export const rivalries: Rivalry[] = [
  { aId: "mom", bId: "dad", aWins: 23, bWins: 19 },
  { aId: "ellie", bId: "ollie", aWins: 18, bWins: 11 },
];

// --- Helpers ----------------------------------------------------------------

/**
 * Prefix a /public asset path with the deploy sub-path (NEXT_PUBLIC_BASE_PATH).
 * Needed because plain <img src> — unlike next/link or next/image — does not get
 * basePath applied automatically. Empty in dev and for the standalone/Docker
 * build; set to e.g. "/home-game-dashboard" for the GitHub Pages export.
 */
export const asset = (path: string): string =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export const gameById = (id: string): Game | undefined => games.find((g) => g.id === id);

/** Most-played list, sorted desc, with bar widths relative to the top game. */
export function mostPlayed(): { game: Game; pct: number }[] {
  const max = Math.max(...games.map((g) => g.nights));
  return [...games]
    .sort((a, b) => b.nights - a.nights)
    .map((game) => ({ game, pct: Math.round((game.nights / max) * 100) }));
}

export function formatRecord(wins: number, losses: number): string {
  return `${wins}–${losses}`; // en dash
}
