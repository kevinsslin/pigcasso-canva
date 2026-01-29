# 環境變數 / 部署設定（Pigcasso Canvas）

這份文件整理 **Local** 與 **Vercel** 需要的環境變數，以及常見的 unblock / 排錯項。

> 以 `.env.example` 為最終真相；本文件提供「怎麼拿到」與「需要設哪些」的操作版說明。

---

## 0) Local quickstart

```bash
bun install
cp .env.example .env.local
DATABASE_URL=postgres://... bun run db:migrate
bun dev
```

---

## 1) 最小必填（能登入 + 進 dashboard）

### `NEXT_PUBLIC_APP_URL`
- Local：`http://localhost:3000`
- Prod：填你的 Vercel domain（或自訂 domain）

### `DATABASE_URL`（Postgres）
推薦 Neon（免費 tier 夠用）：
1. https://neon.tech 建 DB
2. 拿到 connection string：`postgres://...`
3. 設到 `.env.local` 與 Vercel env vars

### Privy（Auth）
需要：
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

Privy Dashboard 設定建議：
- 開啟 Embedded wallet（未來 token gating / mint 都會用到）
- Login methods 至少開一種（Email / Wallet / Social）

---

## 2) 可選功能（依需求逐個開）

### 0) ChatCanvas（tldraw license）
如果你有部署到 Vercel / production（包含 preview deployments），`/canvas/*` 使用的 tldraw 需要 license key。

需要：
- `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`

拿 trial license（100 天）：
- https://www.tldraw.dev/pricing

> 沒設的話會出現「No tldraw license key provided」並在約 5 秒後把 editor 隱藏（看起來像 board 一直斷線/重連）。

### A) Pro token gating（Mantle）
需要：
- `MANTLE_RPC_URL`（Alchemy / QuickNode / 官方 RPC 皆可）

可調參數（通常不用改）：
- `PIGCASSO_TOKEN_ADDRESS`（預設已填）
- `PIGCASSO_PRO_THRESHOLD_RAW`（預設 100,000e18）
- `PRO_CACHE_TTL_SECONDS`

### B) UploadThing（上傳圖片 / 產生縮圖）
此 repo 使用 UploadThing v7，env 只有：
- `UPLOADTHING_TOKEN`

> UploadThing 舊版的 `APP_ID/SECRET` 已不適用於此 repo。

### C) AI（Gemini）
需要：
- `GEMINI_API_KEY`

可選（有預設值）：
- `GEMINI_ASSISTANT_MODEL`
- `GEMINI_IMAGE_MODEL`
- `GEMINI_IMAGE_MODEL_NANO_BANANA`
- `GEMINI_IMAGE_MODEL_NANO_BANANA_PRO`
- `AI_DAILY_LIMIT_*`

### D) Unsplash（素材搜尋）
二選一即可：
- `UNSPLASH_ACCESS_KEY`
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`

### E) IPFS / NFT export（Pinata）
二選一：
- 推薦：`PINATA_JWT`（V3 uploads）
- 或：`PINATA_API_KEY` + `PINATA_SECRET_API_KEY`（legacy）

可選：
- `NEXT_PUBLIC_IPFS_GATEWAY`
  - 可以填完整 URL（`https://gateway.pinata.cloud/ipfs/`）
  - 也可以只填 hostname（例如：`plum-high-rook-436.mypinata.cloud`），系統會自動 normalize 成 `https://<host>/ipfs/`

NFT 相關（client-side）：
- `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`
- `NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE` / `NEXT_PUBLIC_NFT_MARKETPLACE_LABEL`（可選）

### F) Printr（Template Token / Publish）
Template token launchpad（server proxy）：
- `PRINTR_API_URL`（可不填，預設 preview）
- `PRINTR_API_TOKEN`

Repository → Asset 發佈到 Printr（server-to-server）：
- `PRINTR_PUBLISH_URL`
- `PRINTR_API_KEY`（若你的 publish endpoint 需要 bearer key 才填）

### G) Repository → Asset（GitHub）
需要兩件事：
1) Privy Dashboard 啟用 GitHub login method，並設定 GitHub OAuth Client ID/Secret + scopes
2) Server env 設：
   - `GITHUB_OAUTH_ENCRYPTION_KEY`（用來加密存 DB 的 OAuth tokens）

產 key（建議 base64 32 bytes）：
```bash
openssl rand -base64 32
```

常見 scopes：
- `repo`：讀 private repo 必需
- `read:user`：建議
- `read:org`：若要列出 org repos（建議加上）

### H) Project Hubs（B2B admin）
需要：
- `PROJECT_HUB_ADMIN_TOKEN`
並在 admin request header 帶 `x-admin-token: <token>`

---

## 3) Vercel checklist（你需要設定/確認的）

1. Vercel env vars 已填：`DATABASE_URL`、Privy keys（+ 你要用到的 integrations）
2. `GITHUB_OAUTH_ENCRYPTION_KEY` **必填**（如果要用 `/repositories`）
3. DB migrations：
   - `bun run build` 會跑 `node scripts/build.mjs`
   - 只要有 `DATABASE_URL` 且 `SKIP_DB_MIGRATE !== "1"` 就會在 build 時自動 `drizzle-kit migrate`
4. Build/install 使用 Bun：repo root 有 `vercel.json`（不用再另外在 Vercel UI 改 install command）

---

## 4) 常見錯誤 / Unblock

### 「Server misconfigured: Missing GITHUB_OAUTH_ENCRYPTION_KEY」
- 代表你要用 GitHub integration，但 Vercel / `.env.local` 沒設 `GITHUB_OAUTH_ENCRYPTION_KEY`
- 設好後重新 deploy 即可

### GitHub 已 link 但看不到 repo
請依序確認：
1) Privy GitHub scopes 是否包含 `repo`（private）與 `read:org`（org）
2) 使用者是否點過 UI 的 **Authorize GitHub**（會重新授權拿 token）
3) 若是 org repo：GitHub 可能需要額外允許該 OAuth app 存取 org（GitHub Settings → Applications / Organization settings）

### NFT image / tokenURI 預覽 URL 長得像 `...vercel.app/<gateway-host>/<cid>`
這是「gateway URL 沒帶 scheme / 沒帶 `/ipfs`」造成的相對路徑問題；目前 repo 已內建 normalize。
你只要把 `NEXT_PUBLIC_IPFS_GATEWAY` 設成：
- `plum-high-rook-436.mypinata.cloud`（OK）
或
- `https://plum-high-rook-436.mypinata.cloud/ipfs/`（OK）

---

## 5) 建議：把你的設定記在一個地方

Local：`.env.local`（不要 commit）

Prod：Vercel Project → Settings → Environment Variables
