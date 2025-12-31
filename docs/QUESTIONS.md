# Implementation Questions (Pigcasso Canvas)

This file tracks open questions, edge cases, and decisions discovered while implementing `docs/PRD.md`.

## Open Questions

- UploadThing `prepareUpload` returns `400 Unsupported operation` even with SDK v7+ + `UPLOADTHING_TOKEN`: is this an account/plan restriction, a wrong token/app pairing, or a region setting issue?
- Unsplash integration: should `/api/images` be disabled by default unless `UNSPLASH_ACCESS_KEY` is present (current behavior returns 501 with a clear message)?
- Pack export enforcement: current implementation is client-side gated by Pro UI; do you want a server-side export endpoint for stronger enforcement?
- `export const dynamic = "force-dynamic"` is set in `src/app/layout.tsx` to avoid build-time failures when env keys are missing; confirm if you want to keep this (recommended for auth-heavy apps).
- Gemini model names: confirm the exact IDs for `GEMINI_IMAGE_MODEL` (“nano banana”) and `GEMINI_ASSISTANT_MODEL` (“Gemini 3 Pro”) to avoid runtime model-not-found errors.
- One-click mint (V2): which chain(s) first (Mantle only?), and should we mint to Privy embedded wallet by default?
- NFT standard: ERC-721 (1 design = 1 NFT) vs ERC-1155 (editions / packs)?
- Metadata schema: do we include `source.json` (Fabric JSON) on IPFS and link via `animation_url` or `attributes`?
- Storage/pinning: which IPFS pinning provider (or self-host), and who pays for pinning?
- Gas strategy: user-paid vs sponsored (paymaster), and do we need a per-mint fee model?
- Royalties/licensing: default royalty %, remix attribution rules, and whether templates are licensed via an onchain “template license NFT”.
- Contracts repo strategy (V2): do you want a dedicated contracts repo (Foundry/Hardhat) with a factory pattern, deployed to Mantle first?

## Notes / Decisions

- Pro gating checks the maximum Pigcasso balance across the Privy embedded wallet and (optional) one connected external wallet.
- AI daily limits are tracked by `privyUserId` to avoid wallet-switch bypass.
- V2 mint (initial): Mantle first, user-signed transactions (no relayer/paymaster initially).
- Royalties: deferred to roadmap (not required for first mint MVP).
- NFT scaffolding: DB tables + APIs (`/api/assets`, `/api/collections`) exist; UI currently uses a single `/nfts` entry (legacy `/assets` + `/collections` + `/settings/web3` redirect).
