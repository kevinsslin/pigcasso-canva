# Landing Page（`/`）— 文案、結構與維護指南

Last updated: 2026-01-09

這份文件描述 **公開 Landing Page（`/`）** 的資訊架構、文案定位、以及跟 PRD/現況對齊的維護方式。

> `/_` 是 marketing 入口；真正的「Lovart-style AI 工作區」在 `/app` 與 `/canvas/*`（需要 Privy 登入）。

---

## 1) 相關路由（請先對齊這三個概念）

- `src/app/page.tsx` → `GET /`：公開 Landing（不需登入）
- `src/app/(dashboard)/app/page.tsx` → `GET /app`：AI-native Home（大 prompt、Creator Hub、Recent Projects）
- `src/app/canvas/*` → `GET /canvas/new`、`GET /canvas/:id`：ChatCanvas（tldraw infinite canvas）

Landing 的 CTA 應導向：
- 「Start / Open ChatCanvas」→ `/canvas/new`
- 「Open app / Dashboard」→ `/app`

---

## 2) Landing 的訊息層級（Message hierarchy）

**主訊息（現在就能兌現）**
- AI-native：用 prompt 開始，能生成圖、進入工作區、持續迭代
- Infinite canvas：`/canvas/*` 支援 pan/zoom + 放置資產
- Web3 primitives：Privy 登入、token gating、IPFS/NFT export、Printr publish
- Repository → Asset：連 GitHub 取得 repo → 一鍵生成 meme asset（可選 publish）

**次訊息（概念已對齊，但部分仍在整合/roadmap）**
- Talk · Tab · Tune 的「指向式編輯」閉環（物件/區域選取 → 一句話改這裡 → 回填到 canvas）
- HTML 生成後的 sandbox preview（CSP / iframe policy）
- Short video provider + job queue（run log / storage / preview）

> 原則：Landing 可以講願景，但要避免把「尚未接起來的閉環」寫成已完全可用；用 “Coming soon / In progress” 文字標示即可。

---

## 3) 頁面結構（Anchors）

Landing 目前的 section anchors（`src/app/page.tsx`）：
- `#product`：產品能力總覽（ChatCanvas / Repo→Asset / Publish / Space / Pro）
- `#how`：核心工作流（從想法 → 產出 → 發佈/資產化）
- `#pricing`：Free vs Pro（token-gated；不走信用卡）
- `#faq`：常見問題

---

## 4) 文案維護規則（避免 drift）

1. **以 `.env.example` 為最終真相**：Landing 若提到某 integration，需能在 `.env.example` 找到對應 env（或明確標註為 roadmap）。
2. **以 `docs/STATUS.md` 為現況真相**：Landing 的 “Available now” 需與 `docs/STATUS.md` 一致。
3. **不要寫死不穩定 provider 名稱**：AI 可以提 Gemini / Nano Banana tiers；Video provider 若未定就寫 “Short video (coming soon)”.
4. **CTA 路徑優先導到可 demo 的 flow**：例如 demo ChatCanvas 就讓主 CTA 指向 `/canvas/new`。

---

## 5) 相關文件（更新時一起看）

- `docs/PRD.md`：產品定位與 roadmap
- `docs/STATUS.md`：已完成/待決策/Unblock checklist
- `docs/ENV_SETUP.md`：環境變數與部署排錯
- `docs/CHATCANVAS_PIVOT.md`：Lovart-style ChatCanvas 對齊要點
