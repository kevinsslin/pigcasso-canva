# Pigcasso Canvas — Foundamental Notes

這份文件用來幫你在「大改之前」快速掌握 repo 的架構、資料流與主要流程（以目前的 Pigcasso Canvas 版本為準）。

> Mermaid 圖若在你的 Markdown viewer 不能渲染，建議用 GitHub 預覽或在編輯器啟用 Mermaid 外掛。

## 快速開始（Local）

### 先決條件

- Bun
- Postgres（Neon / Supabase / 本機都可）

### 啟動

```bash
bun install
cp .env.example .env.local
DATABASE_URL=postgres://... bun run db:migrate
bun dev
```

打開 `http://localhost:3000`。

### 最小 `.env.local`

要跑通登入 → Dashboard → Editor，至少需要：

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DATABASE_URL=postgres://...`
- `NEXT_PUBLIC_PRIVY_APP_ID=...`
- `PRIVY_APP_SECRET=...`

要啟用 Pro token gating（Mantle）：

- `MANTLE_RPC_URL=...`（Alchemy RPC URL）
- `PIGCASSO_TOKEN_ADDRESS=0xd38d6bbc92975501e6ba181262a3d3221dbbe640`
- `PIGCASSO_PRO_THRESHOLD_RAW=100000000000000000000000`

要啟用 creator hub publish（縮圖上傳）：

- `UPLOADTHING_TOKEN=...`

要啟用 AI（Gemini）：

- `GEMINI_API_KEY=...`

要啟用 Printr launchpad（Template Token）：

- `PRINTR_API_TOKEN=...`

要啟用 NFT export（IPFS + Mantle mint）：

- `PINATA_JWT=...`（Pinata JWT，推薦）
  - 或：`PINATA_API_KEY=...` + `PINATA_SECRET_API_KEY=...`（legacy）
- `NEXT_PUBLIC_NFT_FACTORY_ADDRESS=0x...`（Mantle 上的 factory）
- （可選）`NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/`

---

## 系統架構（High-level）

```mermaid
flowchart TD
  UI["Browser UI (Next.js Client)"] --> NX["Next.js App Router"]
  NX --> API["Hono API (/api/*)"]
  API --> DB["Postgres (Drizzle)"]
  UI --> Privy["Privy (Auth + Embedded Wallet)"]
  API --> RPC["Mantle RPC (ERC20 balanceOf)"]
  API --> Gemini["Gemini (image + remove-bg + assistant)"]
  NX --> UT["UploadThing (files)"]
```

重點：

- 前端所有 API 都走 `src/lib/hono.ts`（typed client + 自動帶 `Authorization: Bearer <privy token>`）。
- 後端驗證 Privy token 後，會把 user context 注入 Hono `Context`（`requireAuth`）。
- Pro（持幣）驗證走 Mantle RPC + ERC20 `balanceOf`，並寫回 DB 快取（避免每次都打 RPC）。

---

## Auth（Privy）

### 主要檔案

- Client provider：`src/components/providers.tsx`
- Token getter：`src/lib/auth-token.ts`
- API fetch wrapper：`src/lib/hono.ts`
- API response/error helper：`src/lib/api-response.ts`、`src/lib/api-error.ts`
- React Query default retry（401 不 retry）：`src/components/query-provider.tsx`
- Server verify + upsert：`src/server/auth.ts`、`src/server/privy.ts`
- Hono middleware：`src/server/hono-auth.ts`

### 端到端（例：`GET /api/me`）

```mermaid
sequenceDiagram
  participant UI as Browser
  participant HC as hono client (src/lib/hono.ts)
  participant API as Hono /api/me
  participant Privy as Privy server verify
  participant DB as Postgres (Drizzle)

  UI->>HC: GET /api/me
  HC->>API: Authorization: Bearer <privy token>
  API->>Privy: verify token + fetch user
  API->>DB: upsert user (privyUserId + wallets)
  API->>DB: compute pro status (cached) + ai usage
  API-->>UI: { user, pro, ai }
```

---

## Pro（Mantle Token Gating）

### 規則（MVP）

- Chain：Mantle Mainnet（chainId=5000）
- Token：Pigcasso `0xd38d6bbc92975501e6ba181262a3d3221dbbe640`
- decimals：18
- 門檻：`100000e18`
- Wallet 策略：embedded +（可選）external 取「最大值」（不加總）

### 工程落點

- 主要邏輯：`src/server/token-gating.ts`
- API：`GET /api/me`、`POST /api/token-gating/refresh`
- UI：`src/features/auth/hooks/use-pro.ts`、`src/features/auth/components/user-button.tsx`

---

## AI（Gemini + Daily Limits）

### Models

- Image/Remove BG：`GEMINI_IMAGE_MODEL`（預設 `gemini-2.5-flash-image-preview`）
- Assistant：`GEMINI_ASSISTANT_MODEL`（預設 `gemini-3-pro-preview`）

### 用量策略（UTC day）

- 記帳 key：`privyUserId + date`
- Free：每日 5 張 generate / 5 次 remove-bg（可由 env 調整）
- Pro：預設不限（或由 env 調整）

工程檔案：

- Providers：`src/server/ai-providers.ts`
- Limits：`src/server/ai-usage.ts` + table `ai_daily_usage`
- API：`src/app/api/[[...route]]/ai.ts`
- UI：`src/features/editor/components/ai-sidebar.tsx`、`src/features/editor/components/remove-bg-sidebar.tsx`

---

## DB（Drizzle）

### Tables（MVP）

- `user`：`privyUserId`、wallets、pro cache、timestamps
- `project`：projects/templates + creator hub fields
- `ai_daily_usage`：每日 AI 計數（unique: userId+date）
- `nft_collection`：NFT collection/series（factory pattern 預留；可先為 null address）
- `nft_asset`：作品資產（project → asset），追蹤 mint 狀態（draft → minted）與 metadata/image URI

Migration：

- `drizzle/0001_pigcasso_mvp.sql`（從原始 canva clone schema 過渡到 Pigcasso schema）
- `drizzle/0003_fantastic_swordsman.sql`（新增 `nft_collection` / `nft_asset` scaffolding）

---

## 主要流程（你會最常動到）

### 1) 建立 Project（Dashboard Presets）

入口：`src/app/(dashboard)/presets-section.tsx`

```mermaid
flowchart TD
  A[Click preset card] --> B[POST /api/projects]
  B --> C[router.push /editor/:id]
  C --> D[GET /api/projects/:id]
  D --> E[Editor ready]
```

### 2) Editor 自動存檔

```mermaid
sequenceDiagram
  participant User
  participant Canvas as Fabric Canvas
  participant API as PATCH /api/projects/:id
  participant DB as Postgres

  User->>Canvas: add/move/resize objects
  Canvas->>API: debounced PATCH json,width,height
  API->>DB: UPDATE project
  DB-->>API: ok
```

### 3) Pack Export（Pro）

- UI：Editor Navbar → Export → Pack（Pro）
- 演算法：抓「可見物件 bounding box」→ 塞進每個 preset 的 safe area → 產 PNG
- ZIP：用 `jszip` 打包

核心檔案：`src/features/editor/pack-export.ts`、`src/features/editor/web3-presets.ts`

### 4) Creator Hub（Publish / Share / Remix）

- Publish：`POST /api/projects/:id/publish-template`（Editor Navbar → Publish as template）
- Browse：`GET /api/templates`（Dashboard → Browse all）
- Remix：`POST /api/templates/:id/remix`（Share page /templates/:id）

Share page：`src/app/templates/[templateId]/page.tsx`（顯示 attribution + Remix）

### 5) Pigcasso Assistant（Chat + Actions）

- UI：Editor 右下角浮動 panel
- 行為：置中 / 字級層級 / AMA layout / 3 variants（centered/split/diagonal）
- 需要明確按 Apply 才會改畫布（避免誤觸）

檔案：

- UI：`src/features/editor/components/pigcasso-assistant.tsx`
- Actions：`src/features/editor/pigcasso-actions.ts`

---

## NFT（Coming soon scaffolding）

目前只先做到「可接合約前」的 scaffolding（頁面會顯示 Coming soon，等合約 report/地址/ABI 到位再接）。

- Pages：`/nfts`（legacy `/assets`、`/collections`、`/settings/web3` 會 redirect）
  - `src/app/(dashboard)/nfts/page.tsx`
  - `src/app/(dashboard)/assets/page.tsx`（redirect）
  - `src/app/(dashboard)/collections/page.tsx`（redirect）
  - `src/app/(dashboard)/settings/web3/page.tsx`（redirect）
- API：`/api/assets`、`/api/collections`
  - `src/app/api/[[...route]]/assets.ts`
  - `src/app/api/[[...route]]/collections.ts`
- DB schema：`src/db/schema.ts`（tables：`nft_collection`, `nft_asset`）
