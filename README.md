# Pigcasso Canvas

Pigcasso Canvas is an **AI-native design workspace** with Web3 primitives:

- **ChatCanvas (infinite canvas)** powered by `tldraw` (`/canvas/*`)
- **Canva-like editor** powered by Fabric.js (`/editor/*`)
- **Web3-native**: Privy auth, token-gated Pro, IPFS/NFT export, Printr publishing
- **Repository → Asset**: connect GitHub and generate/mint/share assets from code

Product scope and implementation notes:
- `docs/PRD.md`
- `docs/STATUS.md` (progress + unblock checklist)
- `docs/ENV_SETUP.md` (env setup, Vercel checklist)
- `docs/LANDING_PAGE.md` (landing messaging + structure)
- `docs/foundamental.md` (architecture + flows)
- `docs/integrations/project-hubs.md`
- `docs/integrations/printr.md`
- `docs/integrations/github.md`
- `docs/integrations/nft-export.md`
- Open questions / decisions: `docs/QUESTIONS.md`

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Privy (Auth + embedded wallet)
- Hono API mounted at `/api/*` (`src/app/api/[[...route]]/route.ts`) + typed client (`src/lib/hono.ts`)
- Drizzle ORM + Postgres (Neon serverless driver)
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack React Query
- Fabric.js editor + tldraw infinite canvas
- Integrations: UploadThing, Unsplash, Gemini, Pinata IPFS, GitHub, Printr

## Quickstart (Local)

```bash
bun install
cp .env.example .env.local
DATABASE_URL=postgres://... bun run db:migrate
bun dev
```

Open `http://localhost:3000`.

- Public landing page: `/`
- App home (requires Privy auth): `/app` (prompt → opens a new `/canvas/:id`)
- Canvases list (requires Privy auth): `/canvases`
- ChatCanvas (requires Privy auth): `/canvas/new`
- Fabric editor (requires Privy auth): `/editor/:projectId`
- Repositories (requires Privy auth): `/repositories`

### Minimal `.env.local`

To get the basic flow working (Privy login → dashboard), start with:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DATABASE_URL=postgres://...` (required for Drizzle)
- `NEXT_PUBLIC_PRIVY_APP_ID=...`
- `PRIVY_APP_SECRET=...`

Optional features require additional keys (see `.env.example`):

- Pro gating (Mantle): `MANTLE_RPC_URL=...`
- Uploads: `UPLOADTHING_TOKEN=...`
- AI (Gemini): `GEMINI_API_KEY=...`
- GitHub → Asset: `GITHUB_OAUTH_ENCRYPTION_KEY=...`
- IPFS pinning (NFT export): `PINATA_JWT=...` (or legacy Pinata keys)

### Unsplash setup

Unsplash is used only for stock image browsing in the editor. Set:

- `UNSPLASH_ACCESS_KEY=...` (or `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`)

You do not need to add your Unsplash Secret key for this feature.

### Project hubs (B2B onboarding)

Project hubs are **curated** (created by the team after a B2B partnership) and are used to group templates into categories like avatar frames, stickers, and seasonal campaign assets.

- Set `PROJECT_HUB_ADMIN_TOKEN=...` in your server env vars.
- Use `x-admin-token: $PROJECT_HUB_ADMIN_TOKEN` when calling the admin endpoints.

See `docs/integrations/project-hubs.md`.

## Database (Drizzle)

```bash
bun run db:generate # generate migration from src/db/schema.ts
bun run db:migrate  # apply migrations
bun run db:studio   # open Drizzle Studio
```

### Vercel deployments

- This repo includes `vercel.json` to force Bun:
  - `installCommand`: `bun install --frozen-lockfile`
  - `buildCommand`: `bun run build`
- `bun run build` runs `node scripts/build.mjs`, which:
  - runs `drizzle-kit migrate` only if `DATABASE_URL` is set and `SKIP_DB_MIGRATE !== "1"`
  - then runs `next build`

## Troubleshooting

- `column "bio" does not exist` (or similar schema errors): verify `DATABASE_URL` points to the DB you expect, then run `bun run db:migrate` to apply the latest Drizzle migrations.

## Useful Commands

- `bun dev`: start dev server
- `bun run build` / `bun run start`: production build + server
- `bun run lint`: run `next lint`
- `bun test`: run unit tests (fast)
- `bun run check`: lint + typecheck + unit tests

### Tests

- Unit tests live in `src/**/__tests__/*.test.ts` and should stay fast (no DB / no network).
