"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./add-match.module.css";
import { loadData, insertMatch, type Game, type Player } from "@/lib/data";

export default function AddMatch() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [date, setDate] = useState("");
  const [gameId, setGameId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Load players & games for the dropdowns; default the date to today.
  useEffect(() => {
    const now = new Date();
    setDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`
    );
    loadData()
      .then((d) => {
        setPlayers(d.players);
        setGames(d.games);
      })
      .catch((e) => setLoadErr(e?.message ?? String(e)))
      .finally(() => setReady(true));
  }, []);

  function toggleParticipant(pid: string) {
    setParticipantIds((prev) => {
      const next = prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid];
      if (winnerId && !next.includes(winnerId)) setWinnerId("");
      return next;
    });
  }

  const orderedParticipants = players
    .filter((p) => participantIds.includes(p.id))
    .map((p) => p.id);

  const missing: string[] = [];
  if (!date) missing.push("date");
  if (!gameId) missing.push("game");
  if (participantIds.length === 0) missing.push("who played");
  if (!winnerId) missing.push("winner");
  const valid = missing.length === 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await insertMatch({ date, gameId, participantIds: orderedParticipants, winnerId });
      router.push("/"); // dashboard re-fetches on load and shows the new result
    } catch (e) {
      setSaveErr((e as { message?: string })?.message ?? String(e));
      setSaving(false);
    }
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

      {loadErr && (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          Couldn&apos;t reach Supabase: {loadErr}
        </div>
      )}

      {ready && !loadErr && (noPlayers || noGames) && (
        <div className={styles.notice}>
          You haven&apos;t added any {noPlayers && "players"}
          {noPlayers && noGames && " or "}
          {noGames && "games"} yet. Add them in the Supabase Table Editor first, then they&apos;ll
          show up here.
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
            <option value="">{ready ? "Select a game…" : "Loading…"}</option>
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
            <div className={styles.hint}>{ready ? "No players defined." : "Loading…"}</div>
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
      </div>

      {/* submit */}
      <div className={styles.card}>
        {saveErr && <div className={styles.saveError}>Couldn&apos;t save: {saveErr}</div>}
        <div className={styles.submitRow}>
          <span className={styles.hint}>
            {valid ? "Ready to save." : `Fill in ${missing.join(", ")}.`}
          </span>
          <button className={styles.btn} onClick={submit} disabled={!valid || saving}>
            {saving ? "Saving…" : "Save match"}
          </button>
        </div>
      </div>
    </div>
  );
}
