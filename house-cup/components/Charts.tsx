import styles from "./charts.module.css";

export interface StatTile {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className={styles.tiles}>
      {tiles.map((t, i) => (
        <div key={i} className={styles.tile}>
          <div className={`${styles.tileValue} ${t.accent ? styles.tileValueAccent : ""} font-display`}>
            {t.value}
          </div>
          <div className={styles.tileLabel}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export interface BarRow {
  key: string;
  label: React.ReactNode;
  /** Bar length driver. */
  value: number;
  /** Max across the set (for scaling). */
  max: number;
  /** Number shown on the right (defaults to value). */
  display?: React.ReactNode;
  color?: string;
  caption?: string;
}

/** Horizontal labeled bars — used for wins-by-game, wins-by-player, etc. */
export function BarChart({ rows }: { rows: BarRow[] }) {
  return (
    <div className={styles.bars}>
      {rows.map((r) => (
        <div key={r.key} className={styles.barRow}>
          <div className={styles.barLabel}>{r.label}</div>
          <div className={styles.barMain}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${r.max > 0 ? Math.round((r.value / r.max) * 100) : 0}%`,
                  background: r.color ?? "var(--amber)",
                }}
              />
            </div>
            {r.caption && <div className={styles.barCaption}>{r.caption}</div>}
          </div>
          <div className={`${styles.barValue} font-display`}>{r.display ?? r.value}</div>
        </div>
      ))}
    </div>
  );
}

export interface SplitRow {
  key: string;
  left: React.ReactNode;
  right: React.ReactNode;
  leftValue: number;
  rightValue: number;
  leftColor: string;
  rightColor: string;
  caption?: string;
}

/** Two-sided bars for head-to-head records. */
export function SplitBarChart({ rows }: { rows: SplitRow[] }) {
  return (
    <div className={styles.bars}>
      {rows.map((r) => {
        const total = r.leftValue + r.rightValue;
        const leftPct = total ? Math.round((r.leftValue / total) * 100) : 50;
        return (
          <div key={r.key}>
            <div className={styles.barRow}>
              <div className={styles.barLabel} style={{ width: "auto" }}>
                {r.left}
              </div>
              <div className={styles.barMain}>
                <div className={styles.splitTrack}>
                  <div style={{ width: `${leftPct}%`, background: r.leftColor }} />
                  <div style={{ flex: 1, background: r.rightColor }} />
                </div>
              </div>
              <div className={styles.barLabel} style={{ width: "auto", justifyContent: "flex-end" }}>
                {r.right}
              </div>
            </div>
            {r.caption && <div className={styles.barCaption}>{r.caption}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Simple SVG line chart for a 0–100 series (e.g. cumulative win rate over time). */
export function TrendChart({
  points,
  emptyLabel = "Not enough data yet.",
}: {
  points: number[];
  emptyLabel?: string;
}) {
  if (points.length === 0) {
    return <div className={styles.trendEmpty}>{emptyLabel}</div>;
  }

  const W = 320;
  const H = 130;
  const padX = 12;
  const padTop = 12;
  const padBottom = 22;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : padX + (i / (n - 1)) * plotW);
  const y = (v: number) => padTop + (1 - v / 100) * plotH;

  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${padX},${padTop + plotH} ${line} ${x(n - 1)},${padTop + plotH}`;
  const mid = padTop + plotH / 2; // 50% gridline

  return (
    <svg className={styles.trend} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Win rate over time">
      <line className={styles.trendGrid} x1={padX} y1={mid} x2={W - padX} y2={mid} />
      <text className={styles.trendGridLabel} x={padX} y={mid - 4}>
        50%
      </text>
      {n > 1 && <polygon className={styles.trendArea} points={area} />}
      {n > 1 && <polyline className={styles.trendLine} points={line} />}
      {points.map((v, i) => (
        <circle key={i} className={styles.trendDot} cx={x(i)} cy={y(v)} r={n > 24 ? 2 : 3.5} />
      ))}
      <text className={styles.trendGridLabel} x={x(n - 1)} y={y(points[n - 1]) - 8} textAnchor="end">
        {points[n - 1]}%
      </text>
    </svg>
  );
}
