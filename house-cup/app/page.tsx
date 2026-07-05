"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { CountUp } from "@/components/CountUp";
import { Avatar } from "@/components/Avatar";
import {
  standings,
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

function Header({ subtitle }: { subtitle: React.ReactNode }) {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.crest} src={asset("/theme/crest.svg")} alt="House crest" />
          <div>
            <div className={`${styles.brandTitle} font-brand`}>The Jones House Cup</div>
            <div className={`${styles.brandSub} font-serif`}>Family Tournament · Standings</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.headerDate} font-serif`}>{subtitle}</div>
          <Link href="/add-match" className={`${styles.addResult} font-serif`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.quill} src={asset("/theme/quill.svg")} alt="" />
            Summon a Result
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gamesExpanded, setGamesExpanded] = useState(false);

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
  const gstats = gameStats(games, matches, players);
  const recent = recentMatches(matches);
  const played = mostPlayed(games, matches).filter((m) => m.nights > 0);
  const rivals = rivalries(matches, players, 4);
  const latest = recent[0];
  const topWins = Math.max(1, ...table.map((r) => r.wins)); // bar scale
  // #1 is featured only once someone has actually won.
  const champ = table[0]?.wins > 0 ? table[0] : null;
  const restRows = champ ? table.slice(1) : table;

  const gameCards = gstats.map((gs) => (
    <Link key={gs.game.id} href={`/game?id=${gs.game.id}`} className={styles.gameCard}>
      {gs.game.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.gameArt} src={asset(gs.game.art)} alt={gs.game.name} />
      ) : (
        <div className={styles.gameArtFallback} />
      )}
      <div className={styles.gameScrim} />
      <div className={styles.gameNights}>
        {gs.nights} play{gs.nights === 1 ? "" : "s"}
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
    </Link>
  ));
  const collapseGames = gameCards.length > 3;

  return (
    <div className={styles.page}>
      <Header subtitle={latest ? `Last played ${formatMatchDate(latest.date)}` : "No games yet"} />

      <main className={styles.main}>
        {/* hero — most recent game played */}
        {latest ? (
          (() => {
            const g = gameById(games, latest.gameId);
            const winner = playerById(players, latest.winnerId);
            const parts = latest.participantIds
              .map((id) => playerById(players, id))
              .filter((p): p is Player => Boolean(p));
            return (
              <section className={styles.hero}>
                <div className={styles.heroPhoto}>
                  {g?.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset(g.art)} alt={g.name} />
                  ) : (
                    <div className={styles.gameArtFallback} />
                  )}
                </div>
                {/* floating wizard-hall decorations */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.heroSnitch} src={asset("/theme/snitch.png")} alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.heroPotion} src={asset("/theme/potion-green.png")} alt="" />
                <div className={styles.heroText}>
                  <div className={styles.champPill}>
                    <div className={styles.champPillDiamond} />
                    <span className={styles.champPillLabel}>RECENT GAME PLAYED</span>
                  </div>
                  <div className={`${styles.recentHeroName} font-display`}>
                    {g?.name ?? latest.gameId}
                  </div>
                  <div className={styles.recentHeroDate}>{formatMatchDate(latest.date)}</div>
                  {winner && (
                    <div className={styles.recentWinnerBig}>
                      <span className={styles.portrait}>
                        <Avatar player={winner} size={54} ring={0} />
                      </span>
                      <div className={styles.minw0}>
                        <div className={`${styles.recentWinnerBigName} font-display`}>
                          {winner.name}
                        </div>
                        <div className={styles.recentWonLabel}>WON</div>
                      </div>
                    </div>
                  )}
                  {parts.length > 0 && (
                    <div className={styles.recentParticipants}>
                      <span className={styles.recentPartLabel}>Played by</span>
                      {parts.map((p) => (
                        <span key={p.id} title={p.name} style={{ display: "flex" }}>
                          <Avatar player={p} size={32} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })()
        ) : (
          <section className={`${styles.hero} ${styles.heroEmpty}`}>
            <div>
              <div className={styles.champPill}>
                <div className={styles.champPillDiamond} />
                <span className={styles.champPillLabel}>GET STARTED</span>
              </div>
              <div className={`${styles.heroEmptyTitle} font-display`}>No games played yet</div>
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
          {gameCards.length === 0 ? (
            <div className={`${styles.panel} ${styles.standingsPanel}`}>
              <div className={styles.empty}>No games added yet.</div>
            </div>
          ) : collapseGames ? (
            <>
              <div
                className={`${styles.gameCollapser} ${gamesExpanded ? styles.expanded : ""}`}
              >
                <div className={styles.gameGrid}>{gameCards}</div>
                {!gamesExpanded && (
                  <button
                    type="button"
                    className={styles.gameFade}
                    onClick={() => setGamesExpanded(true)}
                    aria-label={`Show all ${gameCards.length} games`}
                  >
                    <span className={styles.gameFadeBtn}>
                      Show all {gameCards.length} games ▾
                    </span>
                  </button>
                )}
              </div>
              {gamesExpanded && (
                <button
                  type="button"
                  className={styles.showLess}
                  onClick={() => setGamesExpanded(false)}
                >
                  Show less ▴
                </button>
              )}
            </>
          ) : (
            <div className={styles.gameGrid}>{gameCards}</div>
          )}
        </section>

        {/* overall standings */}
        <section className={`${styles.panel} ${styles.standingsPanel}`}>
          <div className={styles.panelHeadRow}>
            <div className={`${styles.sectionTitle} font-display`}>Overall Standings</div>
            <div className={styles.panelKicker}>WINS</div>
          </div>
          {table.length === 0 ? (
            <div className={styles.empty}>No players added yet.</div>
          ) : (
            <>
              {champ && (
                <Link href={`/player?id=${champ.player.id}`} className={styles.standTop}>
                  <div className={`${styles.standTopRank} font-display`}>1</div>
                  <div className={`${styles.champAvatarWrap} ${styles.portrait}`}>
                    <Avatar player={champ.player} size={54} ring={0} />
                    <span className={styles.champStar} aria-label="1st place">★</span>
                  </div>
                  <div className={styles.minw0}>
                    <div className={styles.standNameRow}>
                      <span className={`${styles.standTopName} font-display`}>
                        {champ.player.name}
                      </span>
                      <span className={styles.championBadge}>LEADER</span>
                      {champ.played > 0 && (
                        <span className={`${styles.winRatePill} ${styles.winRatePillTop}`}>
                          {champ.winRate}% win rate
                        </span>
                      )}
                    </div>
                    <div className={styles.standMeta}>
                      {champ.played} game{champ.played === 1 ? "" : "s"} played
                      {champ.streak > 1 ? ` · ${champ.streak}-game streak` : ""}
                    </div>
                  </div>
                  <div className={styles.grow} />
                  <div className={styles.standBarWrap}>
                    <div className={styles.standBarTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${Math.round((champ.wins / topWins) * 100)}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: champ.player.color,
                        }}
                      />
                    </div>
                    <CountUp
                      className={`${styles.standTopRate} font-display`}
                      value={champ.wins}
                      duration={1300}
                    />
                  </div>
                </Link>
              )}
              {restRows.map((row) => (
                <Link key={row.player.id} href={`/player?id=${row.player.id}`} className={styles.standRow}>
                  <div className={`${styles.standRank} font-display`}>{row.rank}</div>
                  <span className={styles.portrait}>
                    <Avatar player={row.player} size={54} ring={0} />
                  </span>
                  <div className={styles.minw0}>
                    <div className={styles.standNameRow}>
                      <span className={`${styles.standName} font-display`}>{row.player.name}</span>
                      {row.played > 0 && (
                        <span className={styles.winRatePill}>{row.winRate}% win rate</span>
                      )}
                    </div>
                    <div className={styles.standMeta}>
                      {row.played} game{row.played === 1 ? "" : "s"} played
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
                </Link>
              ))}
            </>
          )}
        </section>

        {/* top rivalries — full width, right after standings */}
        <section className={`${styles.panel} ${styles.rivalriesPanel}`}>
          <div className={`${styles.sideTitle} font-display`}>Top Rivalries</div>
          {rivals.length ? (
            <div className={styles.rivList}>
              {rivals.map((riv) => {
                const total = riv.aWins + riv.bWins;
                const aPct = total ? Math.round((riv.aWins / total) * 100) : 50;
                return (
                  <div key={`${riv.a.id}|${riv.b.id}`} className={styles.rivItem}>
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
        </section>

        {/* bottom: recent game nights + most played (50/50) */}
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
                    <div className={styles.recentParts}>
                      {r.participantIds
                        .map((pid) => playerById(players, pid))
                        .filter((p): p is Player => Boolean(p))
                        .map((p) => (
                          <span key={p.id} className={styles.recentPartAvatar} title={p.name}>
                            <Avatar player={p} size={26} ring={0} />
                          </span>
                        ))}
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

          <div className={`${styles.panel} ${styles.mostPlayedPanel}`}>
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
        </section>
      </main>
    </div>
  );
}
