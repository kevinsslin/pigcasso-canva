# Printr Integration

本文件說明 Pigcasso Canvas 如何整合 Printr（Template Token Launchpad），以及本 repo 內對應的 API / DB / UI 流程。

> 上游 spec 來源：`printr-api.json`（OpenAPI 3.1）。

## 1) 目標與範圍

Phase 1（本 repo 目前實作）：

- 以 **Printr API** 發起 token launch（quote → create token → user 自行簽署 deployment tx → 查部署狀態）
- 在 **Creator Hub → My Templates** 提供 one-click launch UX（Mantle，create → sign）
- 在 DB 建立 Template ↔ Printr token 的 mapping（避免重複 launch）
- 記錄最小 **usage events**（目前先記錄 remix）

非目標（仍在 roadmap）：

- stake-to-use / pay-to-use（pricing model 尚未定案）
- trading/market data（這份 preview spec 未提供 trading endpoints）
- NFT mint / IPFS（另 repo / 後續 phase）

## 2) 環境變數（Server-only）

更新 `.env.local`：

```bash
PRINTR_API_URL=https://api-preview.printr.money/v0
PRINTR_API_TOKEN=...
```

注意：

- `PRINTR_API_TOKEN` 絕對不能在 client bundle 內曝光（本 repo 透過 `/api/printr/*` server proxy 保護）。
- `PRINTR_API_URL` 可保留預設，不設也會 fallback 到 preview server。

## 3) Upstream API（Printr）

Base URL（preview）：`https://api-preview.printr.money/v0`

Auth：`Authorization: Bearer <PRINTR_API_TOKEN>`

此 spec 目前僅包含：

- `POST /print/quote`
- `POST /print`
- `GET /tokens/{id}`
- `GET /tokens/{id}/deployments`

## 4) 本 repo 的 API（Hono /api）

入口：`src/app/api/[[...route]]/printr.ts`

### 4.1 Proxy endpoints（對應 upstream）

- `POST /api/printr/print/quote` → `POST /print/quote`
- `POST /api/printr/print` → `POST /print`
- `GET /api/printr/tokens/:id` → `GET /tokens/{id}`
- `GET /api/printr/tokens/:id/deployments` → `GET /tokens/{id}/deployments`

### 4.2 Template Token endpoints（App-level）

這些 endpoint 會把 Template（`project`）跟 Printr token 綁定到 DB：

- `POST /api/printr/template-tokens`（需要 Pro）
  - input：templateId + token metadata + initial buy + chains（目前 Mantle）
  - server 會抓 template 的 `thumbnailUrl`，下載並轉成 base64（Printr upstream 需要 `image` base64）
  - response：DB record + upstream `token_id/payload/quote`
- `GET /api/printr/template-tokens/:templateId`
  - 回傳 token record（非 owner 不會拿到 `quote/payload`）
- `PATCH /api/printr/template-tokens/:templateId`
  - 用來寫入 `txHash` / `status`（signed/live/failed）

### 4.3 Config probe

- `GET /api/printr/status`
  - 回 `{ configured: boolean }`

## 5) 資料模型（DB）

Schema：`src/db/schema.ts`

Migration：`drizzle/0004_fearless_layla_miller.sql`

### 5.1 `template_token`

用途：

- 一個 template（project）對應一個 Printr token
- 保存 launch metadata（name/symbol/initialBuy/chains）
- 保存 Printr 回傳的 `quote` 與 `payload`（owner-only）
- 保存 user 提交的 deployment `txHash` 與 `status`

### 5.2 `template_usage_event`

用途：

- 記錄「被使用」事件，作為未來 usage/cashflow narrative 的資料基礎
- 目前先記錄 `type=remix`（`POST /api/templates/:id/remix` 會寫一筆）

## 6) UI（Creator Hub）

主要路由：`src/app/(dashboard)/creator-hub/page.tsx`（`MyTemplatesSection`）

（可選 / 進階）路由：`src/app/(dashboard)/creator-hub/launchpad/page.tsx`（完整參數調整）

流程：

1. 在 Creator Hub → My Templates 找到欲 launch 的 template
2. 點 `Launch token`（使用預設參數：Mantle + supply_percent initial buy）
3. 系統呼叫 `POST /api/printr/template-tokens` 建立 record（payload/quote 存 DB）
4. 立刻要求 creator wallet 簽署 deployment tx（EVM / Mantle）
5. 若使用者取消簽署，可之後在同一張 template 卡片按 `Sign deployment`

目前 chain 固定：

- Mantle Mainnet：CAIP-2 `eip155:5000`

## 7) 安全與限制

- Printr token 不下放到 client；所有 upstream call 經由 server proxy（`src/server/printr.ts` + `src/app/api/[[...route]]/printr.ts`）。
- Template image 轉 base64 時有基本限制：
  - 只允許 https URL
  - host allowlist（UploadThing/Unsplash/Googleusercontent）
  - size cap（避免把超大圖丟給 upstream）

## 8) Debug / 常見問題

### Q: UI 顯示「Launchpad is temporarily unavailable」

- 確認 `.env.local` 有 `PRINTR_API_TOKEN`

### Q: Create token 成功，但 Sign deployment 失敗

- 需確保「Creator wallet」已連結在 Privy，且目前錢包可切到 Mantle
- payload 目前只處理 EVM payload（Mantle）

### Q: 沒看到 contract address / status 一直 pending

- 透過 `GET /api/printr/tokens/:id/deployments` 檢查 upstream status
- preview API/鏈上交易可能需要一些時間；若失敗會回 `failed`
