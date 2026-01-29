# Space Builder QA Checklist

This checklist is meant for quick, repeatable smoke testing while iterating on the Space (bento.me-like) builder.

## Preconditions

- You can sign in via Privy.
- UploadThing is configured (optional, for image upload tests).
- At least one linked wallet address exists (embedded is fine; external is optional).

## Core Flows

### 1) Entry points

- Sidebar has **My Space** (`/space`).
- `/space` shows a clear CTA to **Open builder** (`/space/builder`).

### 2) Builder basics (`/space/builder`)

- Empty state shows “Drop modules here”.
- Add modules:
  - Click a module in the left panel to add it.
  - Drag a module from the left panel onto the canvas to add it.
- Select a block:
  - Clicking a block selects it and opens the inspector (mobile).
  - Desktop: selecting a block populates the right inspector.
- Delete / duplicate:
  - Select a block then press `Backspace` / `Delete` to remove it.
  - Duplicate works and the new block is selected.
- Visibility toggle:
  - Hide/show toggles work and hidden blocks are visibly labeled.

### 3) Drag/resize behavior (no permanent overlap)

- Drag a block across others:
  - Dragging **from top → down** swaps step-by-step with the block you collide with (no “push everything down”).
  - Dragging **from bottom → up** also swaps step-by-step.
  - You can drag the **entire block** (no special handle required).
  - After dropping, the layout remains collision-free (no overlapping blocks).
- Resize a block:
  - Resize handles exist on **4 edges + 4 corners**.
  - Resizing does **not** accidentally trigger dragging.
  - After resizing ends, layout remains collision-free (no overlap).

### 4) Preview → publish → live consistency

- Click **Preview** mode and confirm it matches the current draft layout.
- Click **Publish / Update live**:
  - A publish dialog opens with a preview.
  - Click confirm publishes **exactly** what the preview shows.
- Open the live URL (`/space/<handle>`) and verify it matches the publish preview.

### 5) Module content editing

- Bio card:
  - Edit display name / subtitle / bio / status badge.
  - Upload an avatar image (when configured).
- Image block:
  - Upload an image (when configured).
- Link stack:
  - Add links; edit label + URL; remove links.
- NFT showcase:
  - Add an NFT entry (chainId / contract / tokenId).
  - Resolve fetches metadata and verifies ownership.
  - Public page shows NFT image/name (when available).

## Notes / Troubleshooting

- If **View live** differs from preview, re-test publish dialog: it should publish the captured snapshot, not the current draft.
- If drag feels “laggy”, check grid item transition timing in `src/features/spaces/components/space-grid-layout.module.css`.
