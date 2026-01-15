# Pigcasso Canvas Status

Last updated: 2026-01-15

This file summarizes current progress, remaining risks, and required setup.

## Shipped
- AI-native Home with large prompt and prompt starters.
- Infinite canvas (tldraw) with chat panel and DB persistence.
- Chat history saved to DB with localStorage fallback.
- Image/HTML generation and insertion onto the canvas.
- Pin edit: place edits at a chosen canvas position.
- Separate layers (alpha): layout analysis, text extraction, background removal, and layer placement.
- Export flows: PNG/SVG/HTML download, NFT export, and Printr launch.
- GitHub Repository -> Asset flow with encrypted OAuth tokens.
- IPFS URL normalization for reliable preview URLs.
- Space builder improvements: swap-on-collision, whole-card drag, edge resize handles.

## Recent hardening
- Cutout repair with hole filling + edge smoothing for better subject extraction.
- Export NFT and Printr dialogs are scroll-safe and do not overflow the viewport.
- Shared wallet rejection handling for clean user-facing errors.

## Known risks / follow-ups
- Separate layers accuracy still varies by source image (text size, subject boundaries).
- HTML preview is limited to static rendering with sandbox constraints.
- Production tldraw requires a license key.

## Setup checklist
Required:
- NEXT_PUBLIC_APP_URL
- DATABASE_URL
- NEXT_PUBLIC_PRIVY_APP_ID
- PRIVY_APP_SECRET

Optional (by feature):
- GEMINI_API_KEY
- NEXT_PUBLIC_TLDRAW_LICENSE_KEY (production)
- UPLOADTHING_TOKEN
- MANTLE_RPC_URL
- PINATA_JWT (or legacy Pinata keys)
- NEXT_PUBLIC_NFT_FACTORY_ADDRESS
- GITHUB_OAUTH_ENCRYPTION_KEY
- PRINTR_API_TOKEN

See `docs/ENV_SETUP.md` for full details.

## Suggested verification
- Home prompt -> new canvas -> image appears on canvas.
- Chat edit -> new image placed, original unchanged.
- Separate layers -> background/subject/text layers appear and remain ungrouped.
- Export NFT -> preview renders and metadata is valid.
- Printr launch -> modal flow completes without layout overflow.
