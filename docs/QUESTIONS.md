# 問題清單 / 需要決策（Pigcasso Canvas）

Last updated: 2026-01-09

這份文件集中記錄：
- 仍未定案、會影響架構/產品方向的決策
- 已知 edge cases（需要規格或你確認）
- 需要你 unblock 的設定或外部依賴

實作現況與驗收 checklist：`docs/STATUS.md`  
產品敘事與範圍：`docs/PRD.md`

---

## 1) 產品/架構決策（會卡下一步）

- **ChatCanvas vs Fabric editor 的定位**
  - `/canvas/:id` 是否要變成主工作區？或先與 `/editor/:projectId` 並行？
  - 如果要替換：遷移策略（project model、舊資料兼容、redirect）怎麼做？
- **ChatCanvas persistence（資料模型）**
  - ✅ 已落 DB：`canvas_document` + `/api/canvases`（snapshot string + cover + name）
  - 下一步：要不要加 versioning（history tree）或 op log（provenance/協作/回溯）？
- **Talk · Tab · Tune 的「指向式編輯」閉環**
  - MVP 先做哪一種 point-edit：inpaint / outpaint / remove-bg / text edit？
  - 選取單位：object bbox vs marquee region vs comment anchor？
- **HTML 生成後的 preview 安全策略**
  - `iframe sandbox` 是否允許 `allow-scripts`？是否允許外部資源（CDN/images/fonts）？
  - 需不需要做 HTML sanitizer / CSP header？
- **Short video provider + job queue**
  - 先接哪一個 provider（Kling / Veo / 其他）？
  - 用 webhook callback 還是 polling？是否要 job queue（worker）？
- **AI run persistence（provenance）**
  - 是否要把每次生成/編輯落 DB（prompt、tool calls、outputs、hash、timestamps）？

---

## 2) Integrations / Env（已知會踩坑）

- **UploadThing v7**
  - `prepareUpload` 仍可能回 `400 Unsupported operation`：需要你確認是否是 plan/region/token pairing 的限制（見 `docs/PRD.md` TODO）。
- **GitHub → Asset：Linked vs Connected**
  - Privy link GitHub ≠ 授權 repo access；需點 UI 的 **Authorize GitHub** 才會有 tokens。
  - Org repo 可能需要 GitHub org SSO / OAuth app approval。
  - scopes 建議至少：`repo`、`read:user`、`read:org`（見 `docs/integrations/github.md`）。
- **IPFS / NFT preview**
  - 已上鏈的 tokenURI 無法被前端「修正」：如果 tokenURI/image URL 是無 scheme 的相對路徑，需重新 export + mint（見 `docs/integrations/nft-export.md`）。
- **Vercel 使用 Bun**
  - 如果 Vercel 還在跑 `npm ci`：請檢查 Root Directory/是否 override install/build command（見 `docs/ENV_SETUP.md`）。

---

## 3) Web3 mint / contracts（V1/V2 決策）

- **Mint chain**：Mantle only？是否要支援多鏈？
- **Mint default wallet**：預設 mint 到 Privy embedded wallet 嗎？
- **NFT standard**：ERC-721（1 design=1 NFT） vs ERC-1155（editions/packs）
- **Metadata schema**：是否把 `source.json`（Fabric JSON / tldraw snapshot）一起上 IPFS？放 `animation_url` 還是 `attributes`？
- **Pinning strategy**：Pinata / 自建 pinning / 成本由誰支付？
- **Gas strategy**：user-paid vs sponsored（paymaster）；是否需要 per-mint fee？
- **Royalties/licensing**：royalty %、remix attribution、template license（是否 onchain）

---

## 4) 已確認的約定（目前實作假設）

- Pro gating：取 Privy embedded wallet +（可選）connected external wallet 的最大 Pigcasso balance。
- AI daily limits：以 `privyUserId` 記帳，避免切換錢包繞過。
- 目前建議保留 `export const dynamic = "force-dynamic"`（避免 build 時 env 缺失造成 fail；對 auth-heavy app 較穩）。
