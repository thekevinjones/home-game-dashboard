"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./add-match.module.css";
import { players, games, matches } from "@/lib/data";

// Build a `Match` entry to paste into lib/data.ts. GitHub Pages is a static
// host with no backend, so this form can't persist anywhere on its own — the
// source of truth stays the `matches` array in the repo. Fill it in, copy the
// generated line, paste it in, and commit → the site auto-deploys.

const q = (s: string) => JSON.stringify(s);

export default function AddMatch() {
  const [date, setDate] = useState("");
  const [gameId, setGameId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  // Default the date to today, set on the client to avoid a hydration mismatch.
  useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    setDate(iso);
  }, []);

  // Auto-suggest an id from the chosen fields until the user edits it by hand.
  const suggestedId = useMemo(() => {
    if (!date || !gameId || !winnerId) return "";
    return `${date}-${gameId}-${winnerId}`;
  }, [date, gameId, winnerId]);

  useEffect(() => {
    if (!idTouched) setId(suggestedId);
  }, [suggestedId, idTouched]);

  function toggleParticipant(pid: string) {
    setParticipantIds((prev) => {
      const next = prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid];
      if (winnerId && !next.includes(winnerId)) setWinnerId("");
      return next;
    });
  }

  const missing: string[] = [];
  if (!date) missing.push("date");
  if (!gameId) missing.push("game");
  if (participantIds.length === 0) missing.push("who played");
  if (!winnerId) missing.push("winner");
  if (!id) missing.push("id");
  const valid = missing.length === 0;

  const orderedParticipants = players
    .filter((p) => participantIds.includes(p.id))
    .map((p) => p.id);

  const tsLine = valid
    ? `  { id: ${q(id)}, date: ${q(date)}, gameId: ${q(gameId)}, participantIds: [${orderedParticipants
        .map(q)
        .join(", ")}], winnerId: ${q(winnerId)} },`
    : "";

  const json = valid
    ? JSON.stringify(
        { id, date, gameId, participantIds: orderedParticipants, winnerId },
        null,
        2
      )
    : "";

  async function copy() {
    if (!tsLine) return;
    try {
      await navigator.clipboard.writeText(tsLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the text is selectable below.
    }
  }

  function download() {
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `match-${id || "new"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const noPlayers = players.length === 0;
  const noGames = games.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Dashboard
        </Link>
        <div className={`${styles.title} font-display`}>Add a Match</div>
        <div className={styles.sub}>Record who played and who won after a game night.</div>
      </header>

      {(noPlayers || noGames) && (
        <div className={styles.notice}>
          You haven&apos;t added any {noPlayers && "players"}
          {noPlayers && noGames && " or "}
          {noGames && "games"} yet. Add them to <code>lib/data.ts</code> first, then the
          dropdowns here will fill in.
        </div>
      )}

      <div className={styles.card}>
        {/* date */}
        <label className={styles.field}>
          <span className={styles.label}>Date</span>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        {/* game */}
        <label className={styles.field}>
          <span className={styles.label}>Game</span>
          <select
            className={styles.input}
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            <option value="">Select a game…</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        {/* participants */}
        <div className={styles.field}>
          <span className={styles.label}>Who played</span>
          {noPlayers ? (
            <div className={styles.hint}>No players defined.</div>
          ) : (
            <div className={styles.checkGrid}>
              {players.map((p) => {
                const on = participantIds.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                    style={on ? { borderColor: p.color, background: `${p.color}22` } : undefined}
                    onClick={() => toggleParticipant(p.id)}
                    aria-pressed={on}
                  >
                    <span className={styles.dot} style={{ background: p.color }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* winner */}
        <label className={styles.field}>
          <span className={styles.label}>Winner</span>
          <select
            className={styles.input}
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            disabled={participantIds.length === 0}
          >
            <option value="">
              {participantIds.length === 0 ? "Pick who played first…" : "Select the winner…"}
            </option>
            {orderedParticipants.map((pid) => (
              <option key={pid} value={pid}>
                {players.find((p) => p.id === pid)?.name ?? pid}
              </option>
            ))}
          </select>
        </label>

        {/* id */}
        <label className={styles.field}>
          <span className={styles.label}>
            Match id <span className={styles.labelDim}>· must be unique; auto-filled</span>
          </span>
          <input
            type="text"
            className={styles.input}
            value={id}
            placeholder="auto"
            onChange={(e) => {
              setIdTouched(true);
              setId(e.target.value);
            }}
          />
        </label>
      </div>

      {/* output */}
      <div className={styles.card}>
        <div className={styles.outputHead}>
          <span className={styles.label}>Entry for lib/data.ts</span>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={copy} disabled={!valid}>
              {copied ? "Copied ✓" : "Copy line"}
            </button>
            <button className={styles.btnGhost} onClick={download} disabled={!valid}>
              Download JSON
            </button>
          </div>
        </div>

        {valid ? (
          <pre className={styles.code}>
            <code>{tsLine}</code>
          </pre>
        ) : (
          <div className={styles.hint}>Fill in {missing.join(", ")} to generate the entry.</div>
        )}

        <ol className={styles.steps}>
          <li>
            Open <code>house-cup/lib/data.ts</code> and paste the line into the{" "}
            <code>matches</code> array.
          </li>
          <li>Commit &amp; push — GitHub Pages redeploys automatically.</li>
        </ol>
        <p className={styles.tradeoff}>
          Heads-up: the site is hosted as static files on GitHub Pages with no backend, so this
          form can&apos;t save directly. Committing the entry is what makes it stick — and keeps a
          clean history of every game night in the repo.
        </p>
      </div>
    </div>
  );
}
