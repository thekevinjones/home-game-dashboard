"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../detail.module.css";
import { Avatar } from "@/components/Avatar";
import { StatTiles, BarChart } from "@/components/Charts";
import {
  loadData,
  subscribeToData,
  gameDetail,
  asset,
  formatMatchDate,
  type DashboardData,
} from "@/lib/data";

export default function GameDetailPage() {
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
        <div className={styles.center}>{data ? "No game selected." : "Loading…"}</div>
      </div>
    );
  }

  const d = gameDetail(id, data.players, data.games, data.matches);
  if (!d) {
    return (
      <div className={styles.page}>
        {back}
        <div className={styles.center}>Game not found.</div>
      </div>
    );
  }

  const maxWins = Math.max(1, ...d.winsByPlayer.map((w) => w.wins));

  return (
    <div className={styles.page}>
      {back}

      {/* header */}
      <div className={styles.header}>
        {d.game.art && (
          <div className={styles.headerArt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(d.game.art)} alt={d.game.name} />
            <div className={styles.headerArtScrim} />
          </div>
        )}
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <span className={styles.kicker}>GAME</span>
            <div className={`${styles.title} font-display`}>{d.game.name}</div>
            <div className={styles.subtitle}>
              Played {d.plays} time{d.plays === 1 ? "" : "s"}
              {d.lastPlayed ? ` · last on ${formatMatchDate(d.lastPlayed)}` : ""}
            </div>
          </div>
          <div className={styles.headerGrow} />
          {d.topWinner && (
            <div className={styles.rankBubble}>
              <Avatar player={d.topWinner.player} size={56} ring={3} />
              <div className={styles.rankBubbleLabel} style={{ marginTop: 6 }}>
                TOP WINNER
              </div>
            </div>
          )}
        </div>
      </div>

      {/* key stats */}
      <StatTiles
        tiles={[
          { label: "Times played", value: d.plays, accent: true },
          { label: "Winners", value: d.distinctWinners },
          {
            label: "Top winner",
            value: d.topWinner ? `${d.topWinner.player.name}` : "—",
          },
          { label: "Players", value: d.winsByPlayer.length },
        ]}
      />

      {/* who's won it most */}
      <div className={styles.section}>
        <div className={`${styles.sectionTitle} font-display`}>Who&apos;s won it most</div>
        {d.winsByPlayer.length ? (
          <BarChart
            rows={d.winsByPlayer.map((w) => ({
              key: w.player.id,
              label: (
                <Link
                  href={`/player?id=${w.player.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
                  title={w.player.name}
                >
                  <Avatar player={w.player} size={28} />
                  <span className={styles.clip}>{w.player.name}</span>
                </Link>
              ),
              value: w.wins,
              max: maxWins,
              display: w.wins,
              color: w.player.color,
              caption: `${w.wins}/${w.played} · ${w.winRate}% win rate`,
            }))}
          />
        ) : (
          <div className={styles.empty}>Not played yet.</div>
        )}
      </div>

      {/* history */}
      <div className={styles.section}>
        <div className={`${styles.sectionTitle} font-display`}>Play history</div>
        {d.history.length ? (
          <div className={styles.list}>
            {d.history.map((h, i) => (
              <div key={i} className={styles.listRow}>
                <div className={styles.listWhen}>{h.label}</div>
                <div className={styles.listMain}>
                  {h.winners.length ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {h.winners.map((w) => (
                        <Link
                          key={w.id}
                          href={`/player?id=${w.id}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <Avatar player={w} size={26} />
                          {w.name}
                        </Link>
                      ))}
                      <span className={styles.wonTag}>WON</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className={styles.listRight}>
                  <div className={styles.partStack}>
                    {h.participants.map((p) => (
                      <Avatar key={p.id} player={p} size={24} ring={0} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No plays recorded yet.</div>
        )}
      </div>
    </div>
  );
}
