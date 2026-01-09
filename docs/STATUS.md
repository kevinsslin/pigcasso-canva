# Pigcasso Canvas — Status / Progress

Last updated: 2026-01-09

這份文件是「目前做到哪 + 你還需要設定什麼 + 有哪些決策需要你 unblock」的單一來源。

---

## 1) 已完成（Repo 現況）

### Product / UX

- `/`：Landing（文案/結構已對齊 ChatCanvas pivot；見 `docs/LANDING_PAGE.md`）
- `/app`：AI-native Home（大 prompt、quick chips、recent projects）
- Dashboard navigation：桌面 floating sidebar + mobile 底部 tab bar（native-like）
- `/canvas/new`、`/canvas/:id`：tldraw infinite canvas（desktop split layout + mobile full-screen chat dialog）
- Space builder：
  - Drag collision：由上往下拖曳碰撞會 **swap**（不再把其他項目往下擠）
  - Drag handle：可直接拖整個 block
  - Resize：支援四邊 + 四角 resize handles（touch 裝置 handles 常駐顯示）

### AI (Gemini)

- `POST /api/ai/generate-image`
- `POST /api/ai/edit-image`
- `POST /api/ai/generate-html`
- Nano Banana tiers：`nano-banana` / `nano-banana-pro`（非 Pro 自動 downgrade）
- Daily usage limits（Free/Pro 分流）

### Repository → Asset

- `/repositories`：Privy GitHub OAuth → list repos → generate meme asset
- `POST /api/printr/publish`：publish 到外部 Printr endpoint（server-to-server）
- GitHub OAuth tokens encrypted at rest（`GITHUB_OAUTH_ENCRYPTION_KEY`）

### IPFS / NFTs

- 修正 IPFS gateway URL normalization：
  - 支援 `plum-high-rook-436.mypinata.cloud/<cid>` 這種缺 scheme/缺 `/ipfs` 的格式
  - 支援 bare CID、`ipfs://...` 轉成可 preview 的 `https://.../ipfs/...`
- `/nfts`：列出 assets / collections（legacy `/assets`、`/collections` redirect）

---

## 2) 你需要設定/確認的東西（Unblock checklist）

### 必填（Local + Vercel 都要）

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`（並執行 `bun run db:migrate`）
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

### 依功能啟用（建議照你要 demo 的路線設定）

**A) AI**
- `GEMINI_API_KEY`

**B) Uploads**
- `UPLOADTHING_TOKEN`

**C) Pro token gating**
- `MANTLE_RPC_URL`

**D) GitHub → Asset**
- Privy Dashboard：
  - 啟用 GitHub login method
  - 設 GitHub OAuth Client ID/Secret
  - scopes 建議至少：`repo`、`read:user`、`read:org`
- Server env：
  - `GITHUB_OAUTH_ENCRYPTION_KEY`（用 `openssl rand -base64 32` 產生）

**E) Printr**
- Template token launchpad：`PRINTR_API_TOKEN`（可搭配 `PRINTR_API_URL`）
- Publish endpoint（repo→asset）：`PRINTR_PUBLISH_URL`（必要）+ `PRINTR_API_KEY`（若 endpoint 需要）

**F) NFT export**
- Pinata：`PINATA_JWT`（或 legacy keys）
- `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`
- 可選：`NEXT_PUBLIC_IPFS_GATEWAY`（可填 hostname 或完整 URL）

**G) Project Hubs admin（B2B）**
- `PROJECT_HUB_ADMIN_TOKEN`（呼叫 admin endpoints 需帶 `x-admin-token`）

---

## 3) Vercel 部署注意事項

- Repo root 已有 `vercel.json`，會強制使用：
  - `bun install --frozen-lockfile`
  - `bun run build`
- `bun run build` 會跑 `node scripts/build.mjs`：
  - 若 build 時有 `DATABASE_URL` 且 `SKIP_DB_MIGRATE !== "1"`，會自動跑 `drizzle-kit migrate`
  - 然後 `next build`

如果你看到 Vercel 仍在跑 `npm ci`：
- 確認 `vercel.json` 在 **repo root** 且 Vercel 的 Root Directory 設定正確
- 若你曾在 Vercel UI 手動 override install/build command，請移除 override

---

## 4) 建議你怎麼驗收（快速 smoke test）

```bash
bun test
bun run lint
bun run typecheck
bun run build
```

手動驗收（建議順序）：
- `/repositories`：Link/Authorize GitHub → Refresh → 能看到 repos → Generate asset
- `/space/builder`：由上往下拖曳碰撞會 swap；resize 四邊可用
- `/nfts`：tokenURI/image URL 都能點開並 preview（確認 `NEXT_PUBLIC_IPFS_GATEWAY`）
- `/canvas/new`：mobile 右下 chat button → full-screen chat dialog

---

## 5) 需要你決策（下一步會卡的問題）

1. ChatCanvas 與 Fabric editor 的關係：
   - `/canvas/:id` 是否要變成主工作區？還是跟 `/editor/:projectId` 並行一段時間？
2. HTML preview 安全策略：
   - `iframe sandbox` 允許哪些權限？要不要允許外部資源（CDN/images）？
3. Video provider：
   - 先接 Kling / Veo / 其他？要 webhook callback 還是 polling？
4. AI run persistence（provenance）：
   - 是否要把每次生成/編輯落 DB（prompt、tool calls、outputs、hash）？
