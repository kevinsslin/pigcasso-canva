# Implementation Questions (Pigcasso Canvas)

This file tracks open questions, edge cases, and decisions discovered while implementing `docs/PRD.md`.

## Open Questions

- UploadThing `prepareUpload` returns `400 Unsupported operation` with current token: is this an account/plan restriction, a wrong project pairing, or a deprecated token?
- Unsplash integration: should `/api/images` be disabled by default unless `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` is present (current behavior returns 501 with a clear message)?
- Pack export enforcement: current implementation is client-side gated by Pro UI; do you want a server-side export endpoint for stronger enforcement?
- `export const dynamic = "force-dynamic"` is set in `src/app/layout.tsx` to avoid build-time failures when env keys are missing; confirm if you want to keep this (recommended for auth-heavy apps).
- Replicate model choice: currently uses `stability-ai/stable-diffusion-3`; do you want to switch the default Replicate model for better Web3-style assets?
- One-click mint (V2): which chain(s) first (Mantle only?), and should we mint to Privy embedded wallet by default?
- NFT standard: ERC-721 (1 design = 1 NFT) vs ERC-1155 (editions / packs)?
- Metadata schema: do we include `source.json` (Fabric JSON) on IPFS and link via `animation_url` or `attributes`?
- Storage/pinning: which IPFS pinning provider (or self-host), and who pays for pinning?
- Gas strategy: user-paid vs sponsored (paymaster), and do we need a per-mint fee model?
- Royalties/licensing: default royalty %, remix attribution rules, and whether templates are licensed via an onchain “template license NFT”.

## Notes / Decisions

- Pro gating checks the maximum Pigcasso balance across the Privy embedded wallet and (optional) one connected external wallet.
- AI daily limits are tracked by `privyUserId` to avoid wallet-switch bypass.
