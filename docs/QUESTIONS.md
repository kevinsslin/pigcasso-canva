# Implementation Questions (Pigcasso Canvas)

This file tracks open questions, edge cases, and decisions discovered while implementing `docs/PRD.md`.

## Open Questions

- (none yet)

## Notes / Decisions

- Pro gating checks the maximum Pigcasso balance across the Privy embedded wallet and (optional) one connected external wallet.
- AI daily limits are tracked by `privyUserId` to avoid wallet-switch bypass.
