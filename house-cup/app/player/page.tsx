"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../detail.module.css";
import { Avatar } from "@/components/Avatar";
import { StatTiles, BarChart, SplitBarChart, TrendChart } from "@/components/Charts";
import {
  loadData,
  subscribeToData,
  personDetail,
  gameById,
  playerById,
  formatMatchDate,
  type DashboardData,
  type Player,
} from "@/lib/data";

export default function PlayerDetailPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("id"));
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
    const unsubscribe = subscribeToData(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const back = (
    <Link href="/" className={styles.back}>
      ← Back to dashboard
    </Link>
  );

  if (error) {
    return (
      <div className={styles.page}>
        {back}
        <div className={styles.center}>Couldn&apos;t load data.</div>
      </div>
    );
  }
  if (!data || !id) {
    return (
      <div className={styles.page}>
        {back}
        <div className={styles.center}>{data ? "No player selected." : "Loading…"}</div>
      </div>
    );
  }

  const d = personDetail(id, data.players, data.games, data.matches);
  if (!d) {
    return (
      <div className={styles.page}>
        {back}
        <div className={styles.center}>Player not found.</div>
      </div>
    );
  }

  const maxGameWins = Math.max(1, ...d.perGame.map((g) => g.wins));

  return (
    <div className={styles.page}>
      {back}

      {/* header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Avatar player={d.player} size={92} ring={4} />
          <div className={styles.headerText}>
            <span className={styles.kicker}>PLAYER</span>
            <div className={`${styles.title} font-display`}>{d.player.name}</div>
            <div className={styles.subtitle}>
              {d.wins} win{d.wins === 1 ? "" : "s"} · {d.games} game{d.games === 1 ? "" : "s"} played
              {d.streak > 1 ? ` · ${d.streak}-game streak` : ""}
            </div>
          </div>
          <div className={styles.headerGrow} />
          {d.rank > 0 && (
            <div className={styles.rankBubble}>
              <div className={`${styles.rankBubbleNum} font-display`}>#{d.rank}</div>
              <div className={styles.rankBubbleLabel}>OVERALL</div>
            </div>
          )}
        </div>
      </div>

      {/* key stats */}
      <StatTiles
        tiles={[
          { label: "Wins", value: d.wins, accent: true },
          { label: "Games", value: d.games },
          { label: "Win rate", value: `${d.winRate}%` },
          { label: "Streak", value: d.streak },
          { label: "Rank", value: d.rank ? `#${d.rank}` : "—" },
        ]}
      />

      <div className={styles.grid2}>
        {/* win rate over time */}
        <div className={styles.section}>
          <div className={`${styles.sectionTitle} font-display`}>Win rate over time</div>
          <TrendChart
            points={d.timeline.map((t) => t.winRate)}
            emptyLabel="No games played yet."
          />
        </div>

        {/* wins by game */}
        <div className={styles.section}>
          <div className={`${styles.sectionTitle} font-display`}>Wins by game</div>
          {d.perGame.length ? (
            <BarChart
              rows={d.perGame.map((g) => ({
                key: g.game.id,
                label: (
                  <Link href={`/game?id=${g.game.id}`} className={styles.clip} title={g.game.name}>
                    {g.game.name}
                  </Link>
                ),
                value: g.wins,
                max: maxGameWins,
                display: g.wins,
                color: d.player.color,
                caption: `${g.wins}/${g.played} · ${g.winRate}% win rate`,
              }))}
            />
          ) : (
            <div className={styles.empty}>No games played yet.</div>
          )}
        </div>
      </div>

      {/* head to head */}
      <div className={styles.section}>
        <div className={`${styles.sectionTitle} font-display`}>Head to head</div>
        {d.headToHead.length ? (
          <SplitBarChart
            rows={d.headToHead.map((h) => ({
              key: h.opponent.id,
              left: (
                <>
                  <Avatar player={d.player} size={28} />
                  <span className="font-display" style={{ fontWeight: 800 }}>
                    {h.myWins}
                  </span>
                </>
              ),
              right: (
                <>
                  <span className="font-display" style={{ fontWeight: 800 }}>
                    {h.theirWins}
                  </span>
                  <Link href={`/player?id=${h.opponent.id}`} style={{ display: "flex" }} title={h.opponent.name}>
                    <Avatar player={h.opponent} size={28} />
                  </Link>
                </>
              ),
              leftValue: h.myWins,
              rightValue: h.theirWins,
              leftColor: d.player.color,
              rightColor: h.opponent.color,
              caption: `vs ${h.opponent.name} · ${h.shared} game${h.shared === 1 ? "" : "s"} together`,
            }))}
          />
        ) : (
          <div className={styles.empty}>No shared games yet.</div>
        )}
      </div>

      {/* recent results */}
      <div className={styles.section}>
        <div className={`${styles.sectionTitle} font-display`}>Recent results</div>
        {d.recent.length ? (
          <div className={styles.list}>
            {d.recent.map((m) => {
              const won = m.winnerIds.includes(d.player.id);
              const winners = m.winnerIds
                .map((wid) => playerById(data.players, wid))
                .filter((p): p is Player => Boolean(p));
              return (
                <div key={m.id} className={styles.listRow}>
                  <div className={styles.listWhen}>{formatMatchDate(m.date)}</div>
                  <Link href={`/game?id=${m.gameId}`} className={styles.listMain}>
                    {gameById(data.games, m.gameId)?.name ?? m.gameId}
                  </Link>
                  <div className={styles.listRight}>
                    {won ? (
                      <span className={styles.wonTag}>WON</span>
                    ) : (
                      <span className={styles.lostTag}>
                        {winners.length ? `${winners.map((w) => w.name).join(" & ")} won` : "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>No results yet.</div>
        )}
      </div>
    </div>
  );
}
