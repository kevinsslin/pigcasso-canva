# Architecture Review (Backend + AI)

此文件以 **Senior Backend Engineer** 與 **Senior AI Agent Engineer** 的視角，整理 Pigcasso Canvas 現況架構、已做的 best-practice refactor，以及下一步建議（可破壞式演進）。

---

## 1) Current Architecture Snapshot

- **Web**：Next.js App Router（`src/app/`）
- **API**：Hono mounted at `/api/*`（`src/app/api/[[...route]]/`）
- **DB**：Drizzle ORM + Postgres/Neon（`src/db/`）
- **Auth**：Privy（server verify token + user upsert）（`src/server/auth.ts`, `src/server/privy.ts`）
- **Web3**：Mantle ERC20 token gating（`src/server/token-gating.ts`）
- **AI**：Gemini (`@google/genai`)（`src/server/ai/`）
- **External integrations**：GitHub、Pinata IPFS、Printr、UploadThing、Unsplash

---

## 2) What We Refactored (Best-Practice Baseline)

### 2.1 Error handling: “one way to fail”

- New canonical API error shaping: `src/server/api-error-response.ts`
- Hono global `onError` now uses it: `src/app/api/[[...route]]/route.ts`
- `HttpError` now supports `code` + `expose` (prod-safe 5xx hiding by default): `src/server/http-error.ts`
- Added tests for prod/dev sanitization: `src/server/__tests__/api-error-response.test.ts`

Design goal:
- **4xx**：預設可直接回傳原因（對 UX 友好）
- **5xx**：prod 預設只回 `Internal Server Error`，除非明確標記 `expose: true`（避免意外洩漏內部訊息）
- 支援 `code`：讓前端可以針對 `MISSING_*` 做更好的引導

### 2.2 Env access: “typed + explicit failures”

- Added `src/server/env.ts` with `requireEnv()` for server-only env validation
- Migrated critical paths:
  - DB config: `src/db/drizzle.ts` (`MISSING_DATABASE_URL`)
  - Privy config: `src/server/privy.ts`
  - GitHub OAuth encryption key: `src/server/crypto.ts` (`MISSING_GITHUB_OAUTH_ENCRYPTION_KEY`)

### 2.3 Auth middleware: “throw, don’t inline respond”

- `src/server/hono-auth.ts` now throws `HttpError` and relies on global error handler for consistency.

### 2.4 AI surface: “provider + access guard”

- Moved Gemini implementation into `src/server/ai/gemini.ts`
- Added AI access helpers (Pro gating + daily usage decision + profile downgrade): `src/server/ai/access.ts`
- API routes now reuse helpers (less duplicated logic):
  - `src/app/api/[[...route]]/ai.ts`
  - `src/app/api/[[...route]]/github.ts`

---

## 3) Backend Best-Practice Notes (Next improvements)

### 3.1 Observability / Production debugging

Recommended:
- Request ID propagation (API layer) + structured logs
- Optional: Sentry for server + client errors

### 3.2 Rate limiting & abuse control

Today: daily usage is stored per-day per-user.

If you need stronger guarantees:
- Make “check + increment” atomic (transaction/conditional update) to avoid concurrency overshoot
- Add per-IP / per-user short-window throttles for expensive endpoints

### 3.3 Long-running jobs (video / multi-step agent runs)

For video generation & multi-agent pipelines:
- Introduce a job model (DB) + worker queue (e.g. BullMQ / Cloud Tasks / Vercel Cron + background worker)
- Store run status + artifacts; API becomes “submit job” + “poll status”

---

## 4) AI Agent Engineering Notes (Next improvements)

### 4.1 Tool abstraction (Talk / Tab / Tune)

Suggested structure:
- “Tools” = deterministic contracts (zod input/output)
- “Planner/Agent” = only orchestrates tools, never writes directly to DB/UI

### 4.2 Run logging (provenance + reproducibility)

If you want onchain provenance + replay:
- Persist `agent_run` (prompt, tool calls, model, outputs, timestamps, wallet/user)
- Store content hashes for generated assets

### 4.3 Safety & cost controls

Recommended:
- Hard caps on image fetch size (already present for some flows)
- Model allowlist + per-tool token budgets
- Explicit downgrade rules (already applied for `nano-banana-pro` when not Pro)

---

## 5) Open Questions (Need your decisions)

1. **AI run persistence**：是否要把每次 generate/edit 也落 DB 做 provenance？（會需要 migration）
2. **Concurrency policy**：AI 使用量要 “嚴格不超額” 還是 “近似限制即可”？（決定 usage 的 atomic 實作強度）
3. **Video provider**：要走 webhook 回調還是 polling？是否需要 job queue？

