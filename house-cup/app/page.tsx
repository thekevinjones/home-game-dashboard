import styles from "./dashboard.module.css";
import { CountUp } from "@/components/CountUp";
import {
  players,
  games,
  season,
  champion,
  standings,
  gameLeaders,
  recentResults,
  rivalries,
  mostPlayed,
  gameById,
  formatRecord,
  type PlayerId,
} from "@/lib/data";

function Avatar({
  id,
  size,
  ring = 2,
}: {
  id: PlayerId;
  size: number;
  ring?: number;
}) {
  const p = players[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.avatar}
      src={p.avatar}
      alt={p.name}
      style={{
        width: size,
        height: size,
        objectPosition: p.avatarPosition,
        background: p.color,
        boxShadow: `0 0 0 ${ring}px rgba(255,255,255,.25)`,
      }}
    />
  );
}

export default function Dashboard() {
  const champ = players[champion.playerId];
  const played = mostPlayed();

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
            <div className={styles.headerDate}>{season.dateLabel}</div>
            <div className={styles.seasonPill}>
              <div className={styles.seasonDot} />
              <span className={styles.seasonLabel}>SEASON {season.season}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* hero */}
        <section className={styles.hero}>
          <div className={styles.heroPhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={champ.avatar} alt={champ.name} />
            <div className={styles.heroSeam} />
            <div className={styles.heroFade} />
          </div>
          <div className={styles.heroText}>
            <div className={styles.champPill}>
              <div className={styles.champPillDiamond} />
              <span className={styles.champPillLabel}>REIGNING CHAMPION</span>
            </div>
            <div className={`${styles.champName} font-display`}>{champ.name}</div>
            <div className={`${styles.champRecord} font-display`}>
              {formatRecord(champion.wins, champion.losses)} record
            </div>
            <div className={styles.champSince}>Holds the crown since {champion.heldSince}</div>
            <div className={styles.champTags}>
              <span className={styles.champTag}>{champion.nightsPlayed} nights played</span>
              <span className={styles.champTag}>{champion.streak}-night streak</span>
            </div>
          </div>
          <div
            className={styles.ring}
            style={{ "--ring": champion.winRate } as React.CSSProperties}
          >
            <div className={styles.ringInner}>
              <CountUp
                className={`${styles.ringPct} font-display`}
                value={champion.winRate}
                suffix="%"
                duration={1300}
              />
              <div className={styles.ringLabel}>WIN RATE</div>
            </div>
          </div>
        </section>

        {/* on the table */}
        <section>
          <div className={styles.sectionHead}>
            <div className={`${styles.sectionTitle} font-display`}>On The Table</div>
            <div className={styles.sectionMeta}>
              {games.length} games in rotation · leader shown
            </div>
          </div>
          <div className={styles.gameRow}>
            {gameLeaders.map((gl) => {
              const game = gameById(gl.gameId)!;
              return (
                <div key={gl.gameId} className={styles.gameCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.gameArt} src={game.art} alt={game.name} />
                  <div className={styles.gameScrim} />
                  <div className={styles.gameNights}>{game.nights} nights</div>
                  <div className={styles.gameFooter}>
                    <div className={`${styles.gameName} font-display`}>{game.name}</div>
                    <div className={styles.gameLeaderRow}>
                      <Avatar id={gl.leaderId} size={34} />
                      <span className={styles.gameLeaderName}>{players[gl.leaderId].name}</span>
                      <div className={styles.grow} />
                      <CountUp
                        className={`${styles.gameLeaderRate} font-display`}
                        value={gl.winRate}
                        suffix="%"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* overall standings */}
        <section className={`${styles.panel} ${styles.standingsPanel}`}>
          <div className={styles.panelHeadRow}>
            <div className={`${styles.sectionTitle} font-display`}>Overall Standings</div>
            <div className={styles.panelKicker}>WIN RATE</div>
          </div>
          {standings.map((row) => {
            const p = players[row.playerId];
            return (
              <div key={row.playerId} className={styles.standRow}>
                <div className={`${styles.standRank} font-display`}>{row.rank}</div>
                <Avatar id={row.playerId} size={54} ring={3} />
                <div className={styles.minw0}>
                  <div className={styles.standNameRow}>
                    <span className={`${styles.standName} font-display`}>{p.name}</span>
                    {row.champion && <span className={styles.championBadge}>CHAMPION</span>}
                  </div>
                  <div className={styles.standMeta}>
                    {formatRecord(row.wins, row.losses)} · {row.nightsPlayed} nights
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
                        background: p.color,
                      }}
                    />
                  </div>
                  <CountUp className={`${styles.standRate} font-display`} value={row.winRate} suffix="%" />
                </div>
              </div>
            );
          })}
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
            {recentResults.map((r, i) => (
              <div key={i} className={styles.recentRow}>
                <div className={styles.recentWhen}>{r.when}</div>
                <div className={`${styles.recentGame} font-display`}>
                  {gameById(r.gameId)?.name ?? r.gameId}
                </div>
                <div className={styles.recentWinner}>
                  <Avatar id={r.winnerId} size={36} />
                  <span className={styles.recentWinnerName}>{players[r.winnerId].name}</span>
                  <span className={styles.recentWonTag}>WON</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sideCol}>
            <div className={`${styles.panel} ${styles.sidePanel}`}>
              <div className={`${styles.sideTitle} font-display`}>Most Played</div>
              <div className={styles.mostList}>
                {played.map(({ game, pct }) => (
                  <div key={game.id}>
                    <div className={styles.mostHead}>
                      <span className={styles.mostName}>{game.name}</span>
                      <span className={styles.mostCount}>{game.nights}</span>
                    </div>
                    <div className={styles.mostTrack}>
                      <div className={styles.mostFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.panel} ${styles.sidePanel} ${styles.sidePanelGrow}`}>
              <div className={`${styles.sideTitle} font-display`}>Top Rivalries</div>
              <div className={styles.rivList}>
                {rivalries.map((riv, i) => {
                  const a = players[riv.aId];
                  const b = players[riv.bId];
                  const total = riv.aWins + riv.bWins;
                  const aPct = Math.round((riv.aWins / total) * 100);
                  return (
                    <div key={i}>
                      <div className={styles.rivHead}>
                        <div className={styles.rivSide}>
                          <Avatar id={riv.aId} size={34} />
                          <span className={styles.rivName}>{a.name}</span>
                        </div>
                        <span className={`${styles.rivScore} font-display`}>
                          {riv.aWins}&ndash;{riv.bWins}
                        </span>
                        <div className={styles.rivSide}>
                          <span className={styles.rivName}>{b.name}</span>
                          <Avatar id={riv.bId} size={34} />
                        </div>
                      </div>
                      <div className={styles.rivBar}>
                        <div style={{ width: `${aPct}%`, background: a.color }} />
                        <div style={{ flex: 1, background: b.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
