# Pigcasso Canvas

Web3-native, Canva-like editor built on Next.js: Fabric.js canvas editor, projects/templates, AI tools, token-gated Pro, and remixable creator templates.

Product scope and implementation notes:
- `docs/PRD.md`
- `docs/foundamental.md`
- Open questions: `docs/QUESTIONS.md`

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Privy (Auth + embedded wallet)
- Hono API mounted at `/api/*` (`src/app/api/[[...route]]/route.ts`) + typed client (`src/lib/hono.ts`)
- Drizzle ORM + Postgres (Neon serverless driver)
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack React Query
- Fabric.js editor
- Integrations: UploadThing, Unsplash, Replicate, Gemini

## Quickstart (Local)

```bash
bun install
cp .env.example .env.local
DATABASE_URL=postgres://... bun run db:migrate
bun dev
```

Open `http://localhost:3000`.

### Minimal `.env.local`

To get the basic flow working (Privy login → dashboard → editor), start with:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DATABASE_URL=postgres://...` (required for Drizzle)
- `NEXT_PUBLIC_PRIVY_APP_ID=...`
- `PRIVY_APP_SECRET=...`
- `MANTLE_RPC_URL=...` (Alchemy RPC on Mantle Mainnet)

Optional features require additional keys (see `.env.example`): UploadThing, Replicate, Gemini, Unsplash.

## Database (Drizzle)

> `db:*` scripts use `bunx`, so Bun is required.

```bash
bun run db:generate # generate migration from src/db/schema.ts
bun run db:migrate  # apply migrations
bun run db:studio   # open Drizzle Studio
```

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

## Notes

- `docs/` is mostly gitignored; only the tracked MVP docs are committed (PRD/foundamental/questions).
