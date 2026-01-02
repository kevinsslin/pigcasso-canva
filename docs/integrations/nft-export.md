# NFT Export (IPFS + Mantle) Integration

本文件說明 Pigcasso Canvas 的「Export as NFT」實作：把 design 匯出成可上鏈資產（PNG + source JSON + metadata），並透過 factory pattern 在 Mantle 鑄造 ERC-721。

## 1) Scope

- Editor 內 `File → Export as NFT`
- UploadThing 上傳 PNG（暫存）→ server pin 到 IPFS（Pinata）
- Mint：使用 Privy wallet（embedded/external）在 Mantle 簽署交易
- Gallery：`/nfts` 顯示 Assets / Collections，並提供 explorer links

## 2) 環境變數

更新 `.env.local`：

```bash
PINATA_JWT=...
# or
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
NEXT_PUBLIC_NFT_FACTORY_ADDRESS=0x44825eE047B1DAd790949662aea6010E34788835

# optional
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE=
NEXT_PUBLIC_NFT_MARKETPLACE_LABEL=
```

注意：

- `PINATA_JWT` 僅能存在 server-side（不可暴露到 client）。
- `NEXT_PUBLIC_NFT_FACTORY_ADDRESS` 會進入 client bundle（公開的合約地址可接受）。
- `NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE` 是可選的 marketplace link（Mantle 不一定支援 OpenSea）。

## 3) API（Hono /api）

入口：`src/app/api/[[...route]]/assets.ts`

- `POST /api/assets/export`
  - input：`projectId`, `projectPageId`, `imageUrl`, `sourceJson`, optional `name`, `description`
  - behavior：
    1) 建立 `nft_asset`（draft）
    2) Pin PNG → `imageUri=ipfs://...`
    3) Pin source JSON（包含 canvas JSON）→ metadata `properties.source=ipfs://...`
    4) Pin metadata → `metadataUri=ipfs://...`（metadata 的 `image` 會使用 gateway URL，避免部分錢包/瀏覽器不支援 `ipfs://`）
    5) 更新 `status=prepared`

- `PATCH /api/assets/:id`
  - 用於 mint 後寫入 `status`, `collectionAddress`, `tokenId`, `txHash`

入口：`src/app/api/[[...route]]/collections.ts`

- `POST /api/collections`
  - 建立 collection record（可先無 address）

## 4) IPFS 模組（Pinata）

`src/server/ipfs.ts`

- `pinFileFromUrlToIpfs()`：下載指定 image URL（host allowlist + size cap）並 pin
- `pinJsonToIpfs()`：pin 任意 JSON（metadata / source）

## 5) UI Flow

- Dialog：`src/features/editor/components/export-nft-dialog.tsx`
  - Upload & Pin：呼叫 UploadThing → `POST /api/assets/export`
  - Mint：
    - 若未部署 collection：呼叫 factory `createCollection(...)`
    - 之後呼叫 collection `mint(to, tokenUri)`（預設用 gateway URL 作為 token URI，提升跨錢包相容性）
    - 成功後 `PATCH /api/assets/:id`

## 6) Smart Contracts（Factory Pattern）

Contracts repo：`../pigcasso-nft-factory`

- `src/PigcassoNFTFactory.sol`：Clone-based factory
- `src/PigcassoCollection.sol`：ERC721URIStorageUpgradeable（含 `maxSupply` + `contractURI`）
- Deploy script：`script/Deploy.s.sol`
- Tests：`test/PigcassoNFTFactory.t.sol`

部署完成後，把 factory address 填到本 repo 的 `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`。
