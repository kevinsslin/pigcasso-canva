# Pigcasso Canvas PRD

## Product summary
Pigcasso Canvas is an AI-native design workspace that lets creators generate, edit, and publish assets on an infinite canvas, then ship those outputs as Web3-ready assets. Slogan: "Canva ships files, we ship assets."

## Goals
- Make creation fast: prompt in, assets on canvas, iterate in place.
- Make publishing native: export, mint, and publish from the canvas.
- Keep the UX simple: one canvas, one chat, low mental overhead.
- Support both AI-native and classic editor workflows.

## Non-goals (for MVP)
- Full Photoshop-grade editing or complex vector tooling.
- Real-time multi-user collaboration.
- Fully automated brand kit generation.

## Target users
- Web3 creators and community teams producing assets for campaigns.
- Individual designers who want fast iteration and on-chain publishing.
- Developers who want repo-to-asset flows.

## Core user journey
1. Enter a prompt on Home or in a Canvas chat.
2. AI generates images or HTML and places them on the canvas.
3. User refines using select-to-edit, pin edits, or separate layers.
4. User exports (PNG/SVG/HTML) or mints NFT / publishes to Printr.

## Key features

### AI-native Home
- Large prompt input + prompt starters.
- Creates a new canvas and runs the first generation.

### Infinite Canvas (ChatCanvas)
- tldraw-based canvas with persistence.
- Right-side chat panel for generation and iteration.
- Output chips map to objects on the canvas.

### AI tools
- Text chat ideation (Gemini Pro 3).
- Text-to-image generation (Nano Banana + Pro tier).
- Image edit (instruction + references).
- HTML generation with static preview on canvas.
- Separate layers (alpha): analyze layout, extract text, remove background, and place layers.

### Export and publishing
- Download PNG/SVG/HTML from canvas.
- Export as NFT (IPFS metadata + image).
- Launch on Printr (template token flow).

### Classic editor
- Fabric.js editor remains available for template-based workflows.

### Repository to asset
- Connect GitHub via Privy OAuth and generate assets from repos.

### Auth and token gating
- Privy auth with embedded wallet.
- Pro gating via token balance (Mantle).

## Data model (high level)
- CanvasDocument: canvas state, chat history, cover image.
- Asset records: images, HTML cards, exports.
- NFT metadata: tokenURI JSON + image IPFS.

## Success metrics
- Time-to-first-asset < 60 seconds.
- 80% of users can export or mint without assistance.
- 30% of projects share or publish assets externally.

## Risks and open questions
- HTML preview security policy (allow scripts vs strict sandbox).
- Separate layers accuracy for text and subject segmentation.
- Chain and collection selection UX for NFT export.
