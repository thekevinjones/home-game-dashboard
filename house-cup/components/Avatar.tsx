import { asset, type Player } from "@/lib/data";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Player avatar — photo if set, otherwise colored initials. Self-contained. */
export function Avatar({
  player,
  size,
  ring = 2,
  className,
}: {
  player: Player;
  size: number;
  ring?: number;
  className?: string;
}) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flex: "none",
    boxShadow: `0 0 0 ${ring}px rgba(255,255,255,.25)`,
  };
  if (player.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={asset(player.avatar)}
        alt={player.name}
        style={{ ...base, objectPosition: player.avatarPosition, background: player.color }}
      />
    );
  }
  return (
    <div
      className={className}
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
