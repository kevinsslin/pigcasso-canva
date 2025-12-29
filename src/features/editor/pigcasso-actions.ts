import { fabric } from "fabric";

import type { Editor } from "@/features/editor/types";
import { WEB3_PRESETS } from "@/features/editor/web3-presets";

export type PigcassoVariant = "centered" | "split" | "diagonal";
export type PigcassoTemplate = "ama" | "announcement" | "event-banner";

export type PigcassoTemplateInput = {
  title?: string;
  subtitle?: string;
  datetime?: string;
  cta?: string;
};

const COLORS = {
  pigPink: "#F7A9B8",
  neonCyan: "#25D6FF",
  softPeach: "#FBE9E8",
  graphite: "#111827",
  metalGray: "#6B7280",
  white: "#FFFFFF",
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getSuggestedSafeMargin = (width: number, height: number) => {
  const match = WEB3_PRESETS.find((p) => p.width === width && p.height === height);
  if (match) {
    return match.safeMargin;
  }
  return Math.round(Math.min(width, height) * 0.08);
};

const getWorkspaceRect = (editor: Editor) => {
  const workspace = editor.getWorkspace() as fabric.Rect | undefined;
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const left = workspace.left ?? 0;
  const top = workspace.top ?? 0;
  const width = workspace.getScaledWidth();
  const height = workspace.getScaledHeight();
  const center = workspace.getCenterPoint();

  return { workspace, left, top, width, height, center };
};

const getNonWorkspaceObjects = (editor: Editor) =>
  editor.canvas.getObjects().filter((o) => o.name !== "clip");

export const alignToWorkspace = (editor: Editor, mode: "center" | "left" | "right" | "top" | "bottom") => {
  const { workspace } = getWorkspaceRect(editor);
  const workspaceRect = workspace.getBoundingRect(true, true);

  const objects =
    editor.selectedObjects.length > 0
      ? editor.selectedObjects
      : getNonWorkspaceObjects(editor);

  if (objects.length === 0) return;

  for (const object of objects) {
    const currentCenter = object.getCenterPoint();

    if (mode === "center") {
      object.setPositionByOrigin(
        new fabric.Point(
          workspaceRect.left + workspaceRect.width / 2,
          workspaceRect.top + workspaceRect.height / 2,
        ),
        "center",
        "center",
      );
    }

    if (mode === "left") {
      object.setPositionByOrigin(
        new fabric.Point(workspaceRect.left, currentCenter.y),
        "left",
        "center",
      );
    }

    if (mode === "right") {
      object.setPositionByOrigin(
        new fabric.Point(workspaceRect.left + workspaceRect.width, currentCenter.y),
        "right",
        "center",
      );
    }

    if (mode === "top") {
      object.setPositionByOrigin(
        new fabric.Point(currentCenter.x, workspaceRect.top),
        "center",
        "top",
      );
    }

    if (mode === "bottom") {
      object.setPositionByOrigin(
        new fabric.Point(
          currentCenter.x,
          workspaceRect.top + workspaceRect.height,
        ),
        "center",
        "bottom",
      );
    }

    object.setCoords();
  }

  editor.canvas.requestRenderAll();
  editor.canvas.fire("object:modified");
};

export const applyTextHierarchy = (editor: Editor) => {
  const { width } = getWorkspaceRect(editor);

  const candidates =
    editor.selectedObjects.length > 0 ? editor.selectedObjects : getNonWorkspaceObjects(editor);

  const textObjects = candidates.filter((o) =>
    ["text", "textbox", "i-text"].includes(o.type ?? ""),
  ) as Array<fabric.Textbox>;

  if (textObjects.length === 0) return;

  const sorted = [...textObjects].sort((a, b) => (a.top ?? 0) - (b.top ?? 0));

  const titleSize = clamp(Math.round(width * 0.065), 36, 110);
  const subtitleSize = clamp(Math.round(titleSize * 0.55), 18, 72);
  const ctaSize = clamp(Math.round(titleSize * 0.45), 16, 64);

  const roles = [
    { fontSize: titleSize, fontWeight: 800, fill: COLORS.graphite },
    { fontSize: subtitleSize, fontWeight: 600, fill: COLORS.metalGray },
    { fontSize: ctaSize, fontWeight: 700, fill: COLORS.neonCyan },
  ] as const;

  sorted.forEach((obj, index) => {
    const role = roles[Math.min(index, roles.length - 1)];
    obj.set({
      fontSize: role.fontSize,
      fontWeight: role.fontWeight,
      fill: role.fill,
      textAlign: "center",
    });
    obj.setCoords();
  });

  editor.canvas.requestRenderAll();
  editor.canvas.fire("object:modified");
};

export const replaceWithTemplate = (editor: Editor, params: {
  template: PigcassoTemplate;
  variant: PigcassoVariant;
  content?: PigcassoTemplateInput;
}) => {
  const { template, variant, content } = params;
  const { left, top, width, height } = getWorkspaceRect(editor);
  const safeMargin = getSuggestedSafeMargin(width, height);

  const safeLeft = left + safeMargin;
  const safeTop = top + safeMargin;
  const safeWidth = width - safeMargin * 2;
  const safeHeight = height - safeMargin * 2;

  const canvas = editor.canvas;

  for (const object of getNonWorkspaceObjects(editor)) {
    canvas.remove(object);
  }
  canvas.discardActiveObject();

  editor.changeBackground(COLORS.softPeach);

  const baseTitle =
    content?.title?.trim() ||
    (template === "ama"
      ? "AMA"
      : template === "event-banner"
        ? "Event"
        : "Announcement");
  const baseSubtitle =
    content?.subtitle?.trim() ||
    (template === "event-banner" ? "Community Event" : "Stay tuned");
  const baseDatetime = content?.datetime?.trim() || "TBA";
  const baseCta = content?.cta?.trim() || "Join us →";

  const cardPadding = clamp(Math.round(width * 0.03), 18, 44);

  const cardHeight =
    template === "event-banner"
      ? clamp(Math.round(safeHeight * 0.7), 320, safeHeight)
      : clamp(Math.round(safeHeight * 0.58), 320, safeHeight);

  const cardWidth =
    variant === "split"
      ? clamp(Math.round(safeWidth * 0.62), 320, safeWidth)
      : safeWidth;

  const cardLeft =
    variant === "split"
      ? safeLeft
      : safeLeft + (safeWidth - cardWidth) / 2;

  const cardTop = safeTop + (safeHeight - cardHeight) / 2;

  if (variant === "diagonal") {
    const accent = new fabric.Rect({
      name: "pigcasso-accent",
      left: cardLeft - safeMargin * 0.5,
      top: cardTop - safeMargin * 0.4,
      width: cardWidth + safeMargin,
      height: cardHeight + safeMargin * 0.8,
      rx: 36,
      ry: 36,
      angle: -7,
      fill: COLORS.neonCyan,
      opacity: 0.18,
      selectable: true,
    });
    canvas.add(accent);
  }

  if (variant === "split") {
    const bubble = new fabric.Circle({
      name: "pigcasso-bubble",
      radius: Math.round(Math.min(safeWidth, safeHeight) * 0.22),
      left: safeLeft + safeWidth * 0.68,
      top: safeTop + safeHeight * 0.12,
      fill: COLORS.pigPink,
      opacity: 0.32,
      selectable: true,
    });
    canvas.add(bubble);
  }

  const card = new fabric.Rect({
    name: "pigcasso-card",
    left: cardLeft,
    top: cardTop,
    width: cardWidth,
    height: cardHeight,
    rx: 28,
    ry: 28,
    fill: "rgba(255,255,255,0.86)",
    stroke: "rgba(255,255,255,0.95)",
    strokeWidth: 1,
    selectable: true,
  });

  canvas.add(card);

  const textAlign = variant === "split" ? "left" : "center";

  const titleSize = clamp(Math.round(cardWidth * 0.09), 36, 118);
  const subtitleSize = clamp(Math.round(titleSize * 0.52), 18, 72);
  const metaSize = clamp(Math.round(titleSize * 0.4), 16, 56);

  const title = new fabric.Textbox(baseTitle, {
    name: "pigcasso-title",
    left: cardLeft + cardPadding,
    top: cardTop + cardPadding,
    width: cardWidth - cardPadding * 2,
    fontFamily: "Arial",
    fontSize: titleSize,
    fontWeight: 800,
    fill: COLORS.graphite,
    textAlign,
  });
  canvas.add(title);

  const subtitleTop = title.top! + title.getScaledHeight() + Math.round(cardPadding * 0.5);
  const subtitle = new fabric.Textbox(
    baseSubtitle,
    {
      name: "pigcasso-subtitle",
      left: cardLeft + cardPadding,
      top: subtitleTop,
      width: cardWidth - cardPadding * 2,
      fontFamily: "Arial",
      fontSize: subtitleSize,
      fontWeight: 600,
      fill: COLORS.metalGray,
      textAlign,
    },
  );
  canvas.add(subtitle);

  const metaTop = subtitle.top! + subtitle.getScaledHeight() + Math.round(cardPadding * 0.4);
  const meta = new fabric.Textbox(
    `Time: ${baseDatetime}`,
    {
      name: "pigcasso-meta",
      left: cardLeft + cardPadding,
      top: metaTop,
      width: cardWidth - cardPadding * 2,
      fontFamily: "Arial",
      fontSize: metaSize,
      fontWeight: 600,
      fill: COLORS.graphite,
      textAlign,
    },
  );
  canvas.add(meta);

  const ctaTop = cardTop + cardHeight - cardPadding - metaSize * 1.4;
  const cta = new fabric.Textbox(baseCta, {
    name: "pigcasso-cta",
    left: cardLeft + cardPadding,
    top: ctaTop,
    width: cardWidth - cardPadding * 2,
    fontFamily: "Arial",
    fontSize: metaSize,
    fontWeight: 800,
    fill: COLORS.neonCyan,
    textAlign,
  });
  canvas.add(cta);

  canvas.requestRenderAll();
  canvas.fire("object:modified");
};
