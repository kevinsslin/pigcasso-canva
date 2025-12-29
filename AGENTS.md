# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: Next.js App Router pages/layouts (route groups like `(auth)` and `(dashboard)`).
- `src/app/api/[[...route]]/`: Hono API mounted at `/api/*` (e.g. `/api/me`, `/api/projects`, `/api/templates`, `/api/ai`).
- `src/features/`: Domain modules (API hooks, UI, editor logic). Key areas: `auth` (Privy), `editor` (Fabric.js), `projects`.
- `src/components/`: Shared components; `src/components/ui/` contains shadcn/ui primitives.
- `src/db/`: Drizzle schema (`src/db/schema.ts`) and DB client (`src/db/drizzle.ts`); migrations in `drizzle/`.
- `public/`: Static assets.

## Build, Test, and Development Commands

- `bun install`: Install dependencies (repo uses Bun scripts and lockfile).
- `bun dev`: Run the Next.js dev server at `http://localhost:3000`.
- `bun run lint`: ESLint via `next lint`.
- `bun run build` / `bun run start`: Production build and server (also performs typechecking during build).
- Database (requires `.env.local` with `DATABASE_URL`):
  - `bun run db:generate`: Generate a migration from `src/db/schema.ts` into `drizzle/`.
  - `bun run db:migrate`: Apply migrations.
  - `bun run db:studio`: Open Drizzle Studio.

## Coding Style & Naming Conventions

- TypeScript/React in `src/`; prefer `@/*` imports (see `tsconfig.json` paths).
- Indentation: 2 spaces; keep formatting consistent with nearby files.
- Naming: React components in `PascalCase`, hooks as `useThing`, and filenames in `kebab-case` (e.g., `remove-bg-sidebar.tsx`).
- Styling: Tailwind CSS; use `cn()` from `src/lib/utils.ts` for className composition.
- Auth: Privy access token is attached via `src/lib/hono.ts`; server verifies in `src/server/auth.ts`.

## Testing Guidelines

- No automated test runner is configured currently; validate changes with `bun run lint`, `bun run build`, and a quick manual smoke test of the affected flows.
- If you add tests, keep them close to code (e.g., `src/**/__tests__/*` or `*.test.ts(x)`) and include a `test` script in `package.json`.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- PRs should include: scope summary, testing notes, screenshots for UI changes, and migration notes when `src/db/schema.ts` or `drizzle/` changes.

## Security & Configuration Tips

- Copy `.env.example` to `.env.local` and fill in required keys (Privy, UploadThing, DB, and optional AI providers).
- Required integrations for MVP: Privy (`NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`), DB (`DATABASE_URL`), Mantle RPC (`MANTLE_RPC_URL`) for token gating, and optional AI keys (`REPLICATE_API_TOKEN`, `GEMINI_API_KEY`).
- Never commit secrets; keep `.env.local` untracked and update `.env.example` when adding new configuration.
