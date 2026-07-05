"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { CountUp } from "@/components/CountUp";
import {
  standings,
  leader,
  gameStats,
  recentMatches,
  mostPlayed,
  rivalries,
  gameById,
  playerById,
  formatMatchDate,
  loadData,
  subscribeToData,
  asset,
  type DashboardData,
  type Player,
} from "@/lib/data";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({
  player,
  size,
  ring = 2,
}: {
  player: Player;
  size: number;
  ring?: number;
}) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    boxShadow: `0 0 0 ${ring}px rgba(255,255,255,.25)`,
  };
  if (player.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.avatar}
        src={asset(player.avatar)}
        alt={player.name}
        style={{ ...base, objectPosition: player.avatarPosition, background: player.color }}
      />
    );
  }
  return (
    <div
      className={styles.avatar}
      aria-label={player.name}
      style={{
        ...base,
        background: player.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials(player.name)}
    </div>
  );
}

function Header({ subtitle }: { subtitle: React.ReactNode }) {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <div className={styles.logoDiamond} />
          </div>
          <div>
            <div className={`${styles.brandTitle} font-display`}>THE HOUSE CUP</div>
            <div className={styles.brandSub}>Family Game Night · Standings</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerDate}>{subtitle}</div>
          <Link href="/add-match" className={styles.addResult}>
            ＋ Add result
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      loadData()
        .then((d) => {
          if (!active) return;
          setData(d);
          setError(null);
        })
        .catch((e) => active && setError(e?.message ?? String(e)));

    refresh();
    // Live sync: re-fetch whenever players/games/matches change on any device
    // (e.g. someone submits the add-match form), so every open dashboard updates
    // without a manual refresh.
    const unsubscribe = subscribeToData(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className={styles.page}>
        <Header subtitle="Offline" />
        <main className={styles.main}>
          <section className={`${styles.panel} ${styles.standingsPanel}`}>
            <div className={styles.empty}>Couldn&apos;t load data.</div>
            <div className={styles.emptyHint} style={{ margin: "0 auto", textAlign: "center" }}>
              {error}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <Header subtitle="Loading…" />
        <main className={styles.main}>
          <section className={`${styles.panel} ${styles.standingsPanel}`}>
            <div className={styles.empty}>Loading standings…</div>
          </section>
        </main>
      </div>
    );
  }

  const { players, games, matches } = data;
  const table = standings(players, matches);
  const lead = leader(players, matches);
  const gstats = gameStats(games, matches, players);
  const recent = recentMatches(matches);
  const played = mostPlayed(games, matches).filter((m) => m.nights > 0);
  const rivals = rivalries(matches, players);
  const latest = recent[0];
  const topWins = Math.max(1, ...table.map((r) => r.wins)); // bar scale
  const totalWins = matches.length; // every match has exactly one winner

  return (
    <div className={styles.page}>
      <Header subtitle={latest ? `Last played ${formatMatchDate(latest.date)}` : "No games yet"} />

      <main className={styles.main}>
        {/* hero — current leader */}
        {lead ? (
          <section className={styles.hero}>
            {lead.player.avatar && (
              <div className={styles.heroPhoto}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(lead.player.avatar)} alt={lead.player.name} />
                <div className={styles.heroSeam} />
                <div className={styles.heroFade} />
              </div>
            )}
            <div className={styles.heroText}>
              <div className={styles.champPill}>
                <div className={styles.champPillDiamond} />
                <span className={styles.champPillLabel}>CURRENT LEADER</span>
              </div>
              <div className={`${styles.champName} font-display`}>{lead.player.name}</div>
              <div className={`${styles.champRecord} font-display`}>
                {lead.wins} win{lead.wins === 1 ? "" : "s"}
              </div>
              <div className={styles.champTags}>
                <span className={styles.champTag}>{lead.played} nights played</span>
                {lead.streak > 1 && (
                  <span className={styles.champTag}>{lead.streak}-night streak</span>
                )}
              </div>
            </div>
            <div
              className={styles.ring}
              style={
                { "--ring": Math.round((lead.wins / totalWins) * 100) } as React.CSSProperties
              }
            >
              <div className={styles.ringInner}>
                <CountUp
                  className={`${styles.ringPct} font-display`}
                  value={lead.wins}
                  duration={1300}
                />
                <div className={styles.ringLabel}>WINS</div>
              </div>
            </div>
          </section>
        ) : (
          <section className={`${styles.hero} ${styles.heroEmpty}`}>
            <div>
              <div className={styles.champPill}>
                <div className={styles.champPillDiamond} />
                <span className={styles.champPillLabel}>GET STARTED</span>
              </div>
              <div className={`${styles.heroEmptyTitle} font-display`}>No results yet</div>
              <div className={styles.emptyHint}>
                Add players and games in Supabase, then record a game night with{" "}
                <Link href="/add-match" style={{ color: "var(--amber-soft)" }}>
                  ＋ Add result
                </Link>
                .
              </div>
            </div>
          </section>
        )}

        {/* on the table */}
        <section>
          <div className={styles.sectionHead}>
            <div className={`${styles.sectionTitle} font-display`}>On The Table</div>
            <div className={styles.sectionMeta}>
              {games.length
                ? `${games.length} game${games.length === 1 ? "" : "s"} in rotation`
                : "No games yet"}
            </div>
          </div>
          {gstats.length ? (
            <div className={styles.gameRow}>
              {gstats.map((gs) => (
                <div key={gs.game.id} className={styles.gameCard}>
                  {gs.game.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.gameArt} src={asset(gs.game.art)} alt={gs.game.name} />
                  ) : (
                    <div className={styles.gameArtFallback} />
                  )}
                  <div className={styles.gameScrim} />
                  <div className={styles.gameNights}>
                    {gs.nights} night{gs.nights === 1 ? "" : "s"}
                  </div>
                  <div className={styles.gameFooter}>
                    <div className={`${styles.gameName} font-display`}>{gs.game.name}</div>
                    <div className={styles.gameLeaderRow}>
                      {gs.leader ? (
                        <>
                          <Avatar player={gs.leader} size={34} />
                          <span className={styles.gameLeaderName}>{gs.leader.name}</span>
                          <div className={styles.grow} />
                          <CountUp
                            className={`${styles.gameLeaderRate} font-display`}
                            value={gs.leaderWins}
                            suffix={gs.leaderWins === 1 ? " win" : " wins"}
                          />
                        </>
                      ) : (
                        <span className={styles.gameLeaderName}>Not played yet</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${styles.panel} ${styles.standingsPanel}`}>
              <div className={styles.empty}>No games added yet.</div>
            </div>
          )}
        </section>

        {/* overall standings */}
        <section className={`${styles.panel} ${styles.standingsPanel}`}>
          <div className={styles.panelHeadRow}>
            <div className={`${styles.sectionTitle} font-display`}>Overall Standings</div>
            <div className={styles.panelKicker}>WINS</div>
          </div>
          {table.length ? (
            table.map((row) => (
              <div key={row.player.id} className={styles.standRow}>
                <div className={`${styles.standRank} font-display`}>{row.rank}</div>
                <Avatar player={row.player} size={54} ring={3} />
                <div className={styles.minw0}>
                  <div className={styles.standNameRow}>
                    <span className={`${styles.standName} font-display`}>{row.player.name}</span>
                    {row.rank === 1 && row.wins > 0 && (
                      <span className={styles.championBadge}>LEADER</span>
                    )}
                  </div>
                  <div className={styles.standMeta}>
                    {row.played} night{row.played === 1 ? "" : "s"} played
                  </div>
                </div>
                <div className={styles.grow} />
                <div className={styles.standBarWrap}>
                  <div className={styles.standBarTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.round((row.wins / topWins) * 100)}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: row.player.color,
                      }}
                    />
                  </div>
                  <CountUp className={`${styles.standRate} font-display`} value={row.wins} />
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>No players added yet.</div>
          )}
        </section>

        {/* bottom: recent + most played + rivalries */}
        <section className={styles.bottomRow}>
          <div className={`${styles.panel} ${styles.recentPanel}`}>
            <div className={styles.panelHeadRow}>
              <div className={`${styles.sectionTitle} font-display`} style={{ fontSize: 28 }}>
                Recent Game Nights
              </div>
              <div className={styles.panelKicker} style={{ letterSpacing: "0.08em" }}>
                LAST 5
              </div>
            </div>
            {recent.length ? (
              recent.map((r) => {
                const winner = playerById(players, r.winnerId);
                return (
                  <div key={r.id} className={styles.recentRow}>
                    <div className={styles.recentWhen}>{formatMatchDate(r.date)}</div>
                    <div className={`${styles.recentGame} font-display`}>
                      {gameById(games, r.gameId)?.name ?? r.gameId}
                    </div>
                    {winner && (
                      <div className={styles.recentWinner}>
                        <Avatar player={winner} size={36} />
                        <span className={styles.recentWinnerName}>{winner.name}</span>
                        <span className={styles.recentWonTag}>WON</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.empty}>No game nights recorded yet.</div>
            )}
          </div>

          <div className={styles.sideCol}>
            <div className={`${styles.panel} ${styles.sidePanel}`}>
              <div className={`${styles.sideTitle} font-display`}>Most Played</div>
              {played.length ? (
                <div className={styles.mostList}>
                  {played.map(({ game, nights, pct }) => (
                    <div key={game.id}>
                      <div className={styles.mostHead}>
                        <span className={styles.mostName}>{game.name}</span>
                        <span className={styles.mostCount}>{nights}</span>
                      </div>
                      <div className={styles.mostTrack}>
                        <div className={styles.mostFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>Nothing played yet.</div>
              )}
            </div>

            <div className={`${styles.panel} ${styles.sidePanel} ${styles.sidePanelGrow}`}>
              <div className={`${styles.sideTitle} font-display`}>Top Rivalries</div>
              {rivals.length ? (
                <div className={styles.rivList}>
                  {rivals.map((riv) => {
                    const total = riv.aWins + riv.bWins;
                    const aPct = total ? Math.round((riv.aWins / total) * 100) : 50;
                    return (
                      <div key={`${riv.a.id}|${riv.b.id}`}>
                        <div className={styles.rivHead}>
                          <div className={styles.rivSide}>
                            <Avatar player={riv.a} size={34} />
                            <span className={styles.rivName}>{riv.a.name}</span>
                          </div>
                          <span className={`${styles.rivScore} font-display`}>
                            {riv.aWins}&ndash;{riv.bWins}
                          </span>
                          <div className={styles.rivSide}>
                            <span className={styles.rivName}>{riv.b.name}</span>
                            <Avatar player={riv.b} size={34} />
                          </div>
                        </div>
                        <div className={styles.rivBar}>
                          <div style={{ width: `${aPct}%`, background: riv.a.color }} />
                          <div style={{ flex: 1, background: riv.b.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.empty}>No rivalries yet.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
