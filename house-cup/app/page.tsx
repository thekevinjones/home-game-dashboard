import Link from "next/link";
import styles from "./dashboard.module.css";
import { CountUp } from "@/components/CountUp";
import {
  games,
  standings,
  leader,
  gameStats,
  recentMatches,
  mostPlayed,
  rivalries,
  gameById,
  playerById,
  formatRecord,
  formatMatchDate,
  asset,
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

export default function Dashboard() {
  const table = standings();
  const lead = leader();
  const gstats = gameStats();
  const recent = recentMatches();
  const played = mostPlayed().filter((m) => m.nights > 0);
  const rivals = rivalries();
  const latest = recent[0];

  return (
    <div className={styles.page}>
      {/* site header */}
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
            <div className={styles.headerDate}>
              {latest ? `Last played ${formatMatchDate(latest.date)}` : "No games yet"}
            </div>
            <Link href="/add-match" className={styles.addResult}>
              ＋ Add result
            </Link>
          </div>
        </div>
      </header>

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
                {formatRecord(lead.wins, lead.losses)} record
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
              style={{ "--ring": lead.winRate } as React.CSSProperties}
            >
              <div className={styles.ringInner}>
                <CountUp
                  className={`${styles.ringPct} font-display`}
                  value={lead.winRate}
                  suffix="%"
                  duration={1300}
                />
                <div className={styles.ringLabel}>WIN RATE</div>
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
                Add players, games, and match results in <code>lib/data.ts</code> and the
                standings will appear here.
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
                            value={gs.leaderWinRate}
                            suffix="%"
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
            <div className={styles.panelKicker}>WIN RATE</div>
          </div>
          {table.length ? (
            table.map((row) => (
              <div key={row.player.id} className={styles.standRow}>
                <div className={`${styles.standRank} font-display`}>{row.rank}</div>
                <Avatar player={row.player} size={54} ring={3} />
                <div className={styles.minw0}>
                  <div className={styles.standNameRow}>
                    <span className={`${styles.standName} font-display`}>{row.player.name}</span>
                    {row.rank === 1 && row.played > 0 && (
                      <span className={styles.championBadge}>LEADER</span>
                    )}
                  </div>
                  <div className={styles.standMeta}>
                    {formatRecord(row.wins, row.losses)} · {row.played} night
                    {row.played === 1 ? "" : "s"}
                  </div>
                </div>
                <div className={styles.grow} />
                <div className={styles.standBarWrap}>
                  <div className={styles.standBarTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${row.winRate}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: row.player.color,
                      }}
                    />
                  </div>
                  <CountUp className={`${styles.standRate} font-display`} value={row.winRate} suffix="%" />
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
                const winner = playerById(r.winnerId);
                return (
                  <div key={r.id} className={styles.recentRow}>
                    <div className={styles.recentWhen}>{formatMatchDate(r.date)}</div>
                    <div className={`${styles.recentGame} font-display`}>
                      {gameById(r.gameId)?.name ?? r.gameId}
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
