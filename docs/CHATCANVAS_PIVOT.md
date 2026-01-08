# Pigcasso Infinite ChatCanvas（Lovart 風格）+ Web3：對齊與接法（Coding Agent）

這份文件目標：把本 repo 的「Canva-like editor」升級成 **Lovart-style ChatCanvas（Talk/Tab/Tune）** 的無限畫布工作台，並把 Web3 原生能力（Privy / token gating / mint / provenance）變成一等公民。

---

## 0) Pivot 一頁摘要

從 Canva（模板/頁面導向）走向 Lovart-style 無限畫布的核心理由：
- Canva 更像「編輯器」；Lovart 更像「設計 Agent + 無限畫布工作台」。
- 你們的敘事是：Create → Publish/Issue → Assetize/Monetize → 社群擴散 → 可驗證貢獻。
- 無限畫布能把「對話、推理、生成、圈選修改、版本迭代、輸出」收斂在同一個 workspace，自然承接發佈/發行層。

我們要做的「Web3 版 Lovart」一句話：
- **AI-native 的 ChatCanvas**：在無限畫布上用「對話 + 指向式標註（點/圈選）」跟 AI 協作迭代資產。
- **Web3 原生擴展**：把產物變成可鑄造/可驗證/可追溯的鏈上資產，並用 token gating 解鎖 Pro。

---

## 1) Lovart 可觀測產品範式（公開訊號）

以下內容取自 Lovart 公開 changelog 的 banner/文案（`https://lovart.ai/changelog`），我們拿來對齊「體感」與「能力」：

### 1.1 Chat with Canvas（ChatCanvas 的最小閉環）
- 標題：Introducing Chat with Canvas.
- 描述：在圖片或圖片局部留言/評論，AI 幫你完成細節與落地想法。

### 1.2 AI Talking（長篇雙人對話 + 影像/音訊一致性）
- 標題：Introducing AI Talking.
- 描述：生成長篇雙人對話，視覺與音訊品質高度一致，可自選主題/場景/角色設計。

### 1.3 影片模型整合（短影音能力）
- Lovart integrates KLING 2.1：主打超快生成與想像力（視覺大膽、超現實場景）。
- Lovart integrates Veo 3：主打 cinematic quality、真實動作、對話與音畫同步。

### 1.4 圖像編輯模型整合（Tab 指向式編輯的底座）
- Lovart integrates Flux Kontext：主打 prompt-driven image editing，理解文本與視覺線索，一致性高，能做 reference-based 精準調整。

### 1.5 Style Library（風格庫）
- Introducing the Style Library：數十款 preset，一鍵套用快速切換整體視覺感受。

---

## 2) Nano Banana / Nano Banana Pro：我們該怎麼「接」

你提到要接 Nano Banana（含 Nano Banana / Nano Banana Pro）。

Lovart 站內公開 SEO 工具頁面提供了一個重要線索（`https://www.lovart.ai/tools/nanobanana2`）：
- Nano Banana 2（Nano Banana Pro）被描述為 **AI Image Editor with Gemini 2.5 Flash**
- 特徵：**character consistency、multi-image fusion、natural language editing**

對本 repo 的意義：
- 你們已經在用 `@google/genai` + `GEMINI_IMAGE_MODEL`（預設 `gemini-2.5-flash-image-preview`）。
- 因此「Nano Banana 2 / Pro」在工程落地上可以先視為：
  - **Gemini image model 的兩種 profile（Free/Pro）**：同一套 API，差別在「用量限制、預設模型名、是否允許更昂貴/更慢的 model」。

### 2.1 我們的建議：把「模型」抽象成 `profile`

把模型/能力切成兩層：
- `profile`（產品層）：`nano-banana`（Free）/ `nano-banana-pro`（Pro）
- `provider`（技術層）：Gemini / Kling / Veo / …（可以替換）

MVP 取捨：
- 先把「Nano Banana = Gemini image editing 能力」接到位（生成 + 編輯 + 多圖融合），做出 Lovart 的 Talk/Tab/Tune 互動感。
- 影片（Kling/Veo）先用 job-based provider 接法寫好（可先 stub），之後再補上 key 與正式 API。

---

## 3) 我們要實作的能力拆解（接法清單）

### 3.1 Talk（主 Chat → 多交付物 / 多素材落畫布）
**目標體感**：不是「一次出一張圖」，而是「一次在 canvas 上落一組可用素材」。

接法（MVP）：
- `POST /api/ai/generate-image`：輸入 prompt → 產出 1–4 張變體（可先 1 張）→ 落到新 Frame / Image node
- 後續可拓展：同 prompt 產出多 deliverables（PFP + banner + post），用 layout agent 擺到多 Frame

### 3.2 Tab（點選/圈選 → 局部修改）
**目標體感**：圈選/標註 + 一句話改這裡（prompt-driven editing）。

接法（MVP）：
- `POST /api/ai/edit-image`
  - input：`image`（base）、`instruction`（一句話）、`referenceImages?`（可選，用於 style/角色一致性）、`region?`（可選，先用 crop/overlay strategy）  
  - output：新 image（data URL 或 remote URL）
- 逐步增強：
  - Region 先用「裁切 + 指令」或「遮罩疊圖」引導；未來再接真正 inpaint/mask pipeline（若 provider 支援）

### 3.3 Tune（Inspector / 微調）
**目標體感**：選到物件就能在右側做微調，AI 提供建議。

接法（MVP）：
- 既有 `assistant` endpoint（`/api/assistant/action`）可升級為：
  - 根據「選中物件 + Design Context」產生建議與操作（move/align/style）

### 3.4 Short Video（Kling / Veo 類）
**目標體感**：同一個 workspace 內直接產出短影音並可預覽。

接法（建議設計）：
- `POST /api/ai/generate-video`：回 `jobId`
- `GET /api/ai/video-jobs/:id`：輪詢狀態、取回 mp4 url
- 內部統一 job 模型（避免被單一供應商綁死）：`queued → running → succeeded|failed`

### 3.5 HTML 生成 + Dashboard 內 preview
**目標體感**：可以生成一個 HTML deliverable，並直接在無限畫布/右側面板 preview。

接法（MVP）：
- `POST /api/ai/generate-html`
  - input：prompt +（可選）Design Context（色票/字體/品牌語氣）
  - output：單一 `index.html` 字串（含 inline CSS/JS）
- 前端 preview：
  - 用 `iframe` 的 `srcDoc` 渲染
  - 加 `sandbox`（避免取用上層 window / 限制權限）
  - 建議在 HTML 內注入 CSP meta（可選）限制外連

---

## 4) Data / 系統設計（建議最小閉環）

### 4.1 Canvas / Node / Frame
- `Canvas`：無限工作台（pan/zoom）
- `Frame`：最終 export/mint 的主要單位（Figma artboard 概念）
- `Node`：Image/Text/Sticker/HTML/Video/CommentAnchor…

### 4.2 Agent Run（AI 執行）
每次生成/編輯都落一筆 run（可做 timeline + 回溯 + provenance）：
- input（prompt/指令/選區/參考圖）
- tool/provider（gemini/kling/…）
- outputs（image/video/html）
- status、錯誤、耗時

---

## 5) MVP 交付順序（強烈建議）

1) ChatCanvas UI scaffold（Talk/Tab/Tune + 無限畫布 + Frame）
2) Nano Banana（Gemini）完成「生成 + 編輯 + 多圖融合」→ 做出 Tab 指向式編輯體感
3) HTML generate + preview（最快做出 wow）
4) Video job API（先 stub，拿到 provider 後補）
5) Web3：選 Frame/Asset → export → IPFS → mint（你們現有 NFT pipeline 可沿用）

