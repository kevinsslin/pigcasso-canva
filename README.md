# The Canvas

Canva-like editor built with Next.js: templates + projects, a Fabric.js canvas editor, AI tools, uploads, and Stripe subscriptions.

## Pigcasso Canvas (Fork Plan)

This repo is being adapted into **Pigcasso Canvas** (Mantle hackathon MVP). Product scope and technical direction live in `PRD.md` (Privy auth, Mantle token-gated Pro, assistant-driven layouts/variants, pack export, and removing Stripe/Web2 billing).

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Auth.js / NextAuth v5 (Drizzle adapter)
- Hono API mounted at `/api/*` (`src/app/api/[[...route]]/route.ts`) + typed client (`src/lib/hono.ts`)
- Drizzle ORM + Postgres (Neon serverless driver)
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack React Query
- Fabric.js editor
- Integrations: Stripe, UploadThing, Unsplash, Replicate

## Quickstart (Local)

```bash
bun install
cp .env.example .env.local
bun dev
```

Open `http://localhost:3000`.

### Minimal `.env.local`

To get the basic flow working (sign up → sign in → dashboard → editor), start with:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DATABASE_URL=postgres://...`
- `AUTH_SECRET=...`

Other features require additional keys (see `.env.example`).

## Database (Drizzle)

> `db:*` scripts use `bunx`, so Bun is required.

```bash
bun run db:generate # generate migration from src/db/schema.ts
bun run db:migrate  # apply migrations
bun run db:studio   # open Drizzle Studio
```

## Useful Commands

- `bun dev`: start dev server
- `bun run build` / `bun run start`: production build + server
- `bun run lint`: run `next lint`

## Local Architecture Notes

See `docs/foundamental.md` for a consolidated architecture + flow overview.

`docs/` is intentionally gitignored so you can keep personal learning notes while exploring the repo. Remove `/docs/` from `.gitignore` if you want to commit docs.
