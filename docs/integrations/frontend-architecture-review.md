# Frontend Architecture Review (UI + DX)

此文件以 **Senior Frontend Engineer / Senior UIUX Designer** 的視角，整理目前 Pigcasso Canvas 前端架構現況、已做的可維護性改進，以及建議的 best practice（可破壞式演進）。

---

## 1) Current Frontend Snapshot

- **Framework**：Next.js App Router（`src/app/`）
- **Domain modules**：`src/features/*`（hooks / UI / editor logic）
- **Shared UI**：`src/components/*` + shadcn/ui（`src/components/ui/*`）
- **Styling**：Tailwind + `cn()`（`src/lib/utils.ts`）
- **Infinite canvas**：tldraw（`/canvas/:id`）

---

## 2) What We Refactored (Maintainability Baseline)

### 2.1 Route files should stay thin

Pain point:
- `src/app/canvas/[canvasId]/page.tsx` 曾經超過 3k lines，導致 review / debug / merge 成本極高。

Change:
- `src/app/canvas/[canvasId]/page.tsx` 現在只負責 render screen（薄 wrapper）。
- 真正的頁面實作移到 `src/features/canvases/screens/canvas-screen/*`，並把大型 UI 拆成多個 client components。

### 2.2 Screen-level components vs shared components

Conventions:
- **`src/features/**/screens/*`**：page-level UI（可以依需求破壞式調整，不強求重用）
- **`src/features/**/components/*`**：可重用但仍屬該 domain 的 UI
- **`src/components/*`**：跨 domain 的共享元件（避免污染）
- **`src/features/**/lib/*`**：純函式 / helper（可單元測試）

---

## 3) Best-Practice Recommendations (Next improvements)

### 3.1 Keep files small + cohesive

Suggested heuristics:
- UI components：理想 100–300 lines；超過 ~500 lines 就拆（layout / panels / toolbars / dialogs）。
- Hooks / logic：集中在 `hooks/`，避免在 screen 中堆積過多 imperative logic。

### 3.2 Prefer “orchestrator screen + focused subcomponents”

For complex pages (Canvas / Editor):
- Screen 只做：
  - 資料取得（hooks）
  - state composition（少量）
  - high-level layout
- 其餘拆到：
  - `components/`（UI）
  - `hooks/`（state machine / side effects）
  - `lib/`（pure helpers）

### 3.3 RWD / mobile-first ergonomics

Recommendation:
- Desktop: right-side floating panel（Chat / Inspector）
- Mobile: bottom dock + full-screen dialog（避免縮小版 desktop UI）

---

## 4) Open Questions (Need your decisions)

1. **Canvas vs Classic editor**：是否要把 `/canvas/:id` 作為主工作區，Classic Editor 僅做 legacy？
2. **UI design system**：主色/字體/陰影/圓角要以哪一套為主（目前同時存在多種視覺語彙）。

