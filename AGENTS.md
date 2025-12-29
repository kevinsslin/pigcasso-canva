# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: Next.js App Router pages/layouts (route groups like `(auth)` and `(dashboard)`).
- `src/app/api/`: API routes. Most endpoints are served via Hono under `src/app/api/[[...route]]/` (e.g., `ai.ts`, `projects.ts`); auth lives in `src/app/api/auth/[...nextauth]/`.
- `src/features/`: Domain modules (API clients, components, hooks) grouped by feature (`auth`, `editor`, `subscriptions`, etc.).
- `src/components/`: Shared components; `src/components/ui/` contains shadcn/ui primitives.
- `src/db/`: Drizzle ORM client + schema (`src/db/schema.ts`); migrations live in `drizzle/`.
- `public/`: Static assets served at `/`.

## Build, Test, and Development Commands

- `bun install` (preferred) or `npm install`: Install dependencies (keep the corresponding lockfile in sync: `bun.lockb` / `package-lock.json`).
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

## Testing Guidelines

- No automated test runner is configured currently; validate changes with `bun run lint`, `bun run build`, and a quick manual smoke test of the affected flows.
- If you add tests, keep them close to code (e.g., `src/**/__tests__/*` or `*.test.ts(x)`) and include a `test` script in `package.json`.

## Commit & Pull Request Guidelines

- No established commit-message convention exists yet (repo has no Git history). Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- PRs should include: a short summary, testing notes, screenshots for UI changes, and migration details when `src/db/schema.ts` or `drizzle/` changes.

## Security & Configuration Tips

- Copy `.env.example` to `.env.local` and fill in required keys (Auth, Stripe, UploadThing, Replicate, DB).
- Never commit secrets; update `.env.example` when adding new configuration.

