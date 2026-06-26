# The House Cup — Family Game Night Dashboard

A self-hosted dashboard for family game-night standings, built from the
**Direction 3 · Midnight & Amber** design (Claude Design handoff).

- **Stack:** Next.js 16 (App Router) + TypeScript
- **Status:** Public dashboard, pixel-faithful to the design, with **hardcoded data**.
- **Planned:** admin area (login) to manage people / games / results, backed by a database.

## Project layout

```
house-cup/
├─ app/
│  ├─ layout.tsx            # fonts (Bricolage Grotesque + Manrope), metadata
│  ├─ page.tsx              # the dashboard (server component)
│  ├─ dashboard.module.css  # all static styling for the 1080×1920 canvas
│  └─ globals.css           # reset + theme CSS variables
├─ lib/
│  └─ data.ts               # SINGLE SOURCE OF TRUTH (players, games, results…)
├─ public/
│  ├─ players/              # ellie, mom, dad, ollie
│  └─ games/                # catan, ticket, handfoot
├─ Dockerfile
└─ docker-compose.yml
```

### Editing the data

Everything shown on the dashboard comes from [`lib/data.ts`](lib/data.ts).
It's typed and shaped close to a future relational schema (`players`, `games`,
`recentResults`, `standings`, `rivalries`), so moving to a database + admin UI
later is a refactor of this one module, not a rewrite of the UI.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build / run locally

```bash
npm run build
npm start
```

## Self-host on your LAN (Docker)

The app uses Next's `standalone` output, so the image is small and runs anywhere
Docker does — a mini-PC, NAS, or Raspberry Pi on your network. (Note: the UDM
Pro is a gateway, not an app host — run this on a box behind it.)

```bash
# from the house-cup/ directory, on the host machine
docker compose up -d --build
```

Then reach it at `http://<that-machine-LAN-IP>:3000`.

### Making it nice on the network (UDM Pro)

- Give the host a **fixed IP** (DHCP reservation in UniFi Network).
- Optionally add a **local DNS record** (e.g. `housecup.lan`) in UniFi so you can
  use a name instead of an IP.
- For access while away from home, prefer the UDM Pro's **WireGuard/Teleport VPN**
  over opening a port to the internet.
