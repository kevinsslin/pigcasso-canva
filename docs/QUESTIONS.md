# Implementation Questions (Pigcasso Canvas)

This file tracks open questions, edge cases, and decisions discovered while implementing `docs/PRD.md`.

## Open Questions

- Pack export enforcement: current implementation is client-side gated by Pro UI; do you want a server-side export endpoint for stronger enforcement?
- `export const dynamic = "force-dynamic"` is set in `src/app/layout.tsx` to avoid build-time failures when env keys are missing; confirm if you want to keep this (recommended for auth-heavy apps).
- Replicate model choice: currently uses `stability-ai/stable-diffusion-3`; do you want to switch the default Replicate model for better Web3-style assets?

## Notes / Decisions

- Pro gating checks the maximum Pigcasso balance across the Privy embedded wallet and (optional) one connected external wallet.
- AI daily limits are tracked by `privyUserId` to avoid wallet-switch bypass.
