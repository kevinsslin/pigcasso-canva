# Environment & Deployment Setup

This document lists the minimum environment variables to run Pigcasso Canvas locally and on Vercel. Use `.env.example` as the source of truth.

## Quickstart (Local)

```bash
bun install
cp .env.example .env.local
DATABASE_URL=postgres://... bun run db:migrate
bun dev
```

Open `http://localhost:3000`.

## Required (login + core app)

- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- `DATABASE_URL` (Postgres)
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

## Optional integrations

### ChatCanvas (tldraw license for production)
- `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`

### AI (Gemini)
- `GEMINI_API_KEY`
- Optional model overrides:
  - `GEMINI_ASSISTANT_MODEL`
  - `GEMINI_IMAGE_MODEL`
  - `GEMINI_IMAGE_MODEL_NANO_BANANA`
  - `GEMINI_IMAGE_MODEL_NANO_BANANA_PRO`

### Pro token gating (Mantle)
- `MANTLE_RPC_URL`
- Optional:
  - `PIGCASSO_TOKEN_ADDRESS`
  - `PIGCASSO_PRO_THRESHOLD_RAW`
  - `PRO_CACHE_TTL_SECONDS`

### Uploads
- `UPLOADTHING_TOKEN`

### Unsplash (stock images)
- `UNSPLASH_ACCESS_KEY` (or `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`)

### IPFS + NFT export (Pinata)
- Preferred: `PINATA_JWT`
- Or legacy: `PINATA_API_KEY` + `PINATA_SECRET_API_KEY`
- Client:
  - `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`
  - Optional marketplace:
    - `NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE`
    - `NEXT_PUBLIC_NFT_MARKETPLACE_LABEL`
  - Optional gateway:
    - `NEXT_PUBLIC_IPFS_GATEWAY` (hostname or full URL)

### GitHub (Repository → Asset)
- `GITHUB_OAUTH_ENCRYPTION_KEY` (server-side)

Generate a new key (32 bytes, base64):

```bash
openssl rand -base64 32
```

### Printr
- `PRINTR_API_TOKEN`
- Optional:
  - `PRINTR_API_URL`
  - `PRINTR_PUBLISH_URL`
  - `PRINTR_API_KEY`

### Project Hubs (admin)
- `PROJECT_HUB_ADMIN_TOKEN`

## Vercel notes

- `vercel.json` enforces Bun:
  - `bun install --frozen-lockfile`
  - `bun run build`
- `bun run build` executes `node scripts/build.mjs`, which:
  - runs DB migrations if `DATABASE_URL` is set and `SKIP_DB_MIGRATE !== "1"`
  - then runs `next build`

## Common issues

### “Server misconfigured: Missing GITHUB_OAUTH_ENCRYPTION_KEY”
Set `GITHUB_OAUTH_ENCRYPTION_KEY` and redeploy.

### GitHub linked but repos are missing
Ensure GitHub OAuth scopes include `repo`, `read:user`, and `read:org`, then re-authorize in the UI.

### IPFS preview URLs are broken
Set `NEXT_PUBLIC_IPFS_GATEWAY` to a valid gateway (e.g. `https://<host>/ipfs/` or `<host>`).
