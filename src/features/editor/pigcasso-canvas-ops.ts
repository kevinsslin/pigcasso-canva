import { fabric } from "fabric";

import type { Editor } from "@/features/editor/types";
import type { CanvasOp, CanvasSnapshot } from "@/lib/pigcasso-assistant-protocol";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const isTextObject = (obj: fabric.Object) =>
  ["text", "textbox", "i-text"].includes(obj.type ?? "");

const normalizeType = (type: string | undefined | null) => {
  if (!type) return "unknown";
  if (["text", "textbox", "i-text"].includes(type)) return "text";
  return type;
};

const getWorkspace = (canvas: fabric.Canvas) => {
  const workspace = canvas
    .getObjects()
    .find((object) => object.name === "clip") as fabric.Rect | undefined;
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return workspace;
};

const getWorkspaceRect = (canvas: fabric.Canvas) => {
  const workspace = getWorkspace(canvas);
  return { workspace, rect: workspace.getBoundingRect(true, true) };
};

const getNonWorkspaceObjects = (canvas: fabric.Canvas) =>
  canvas.getObjects().filter((object) => object.name !== "clip");

const resolveTargetFromSnapshot = (
  canvas: fabric.Canvas,
  snapshot: CanvasSnapshot | undefined,
  targetId: string,
) => {
  const objects = getNonWorkspaceObjects(canvas);
  const spec = snapshot?.objects.find((o) => o.id === targetId);
  if (!spec) {
    return null;
  }

  const byIndex = objects[spec.index];
  if (byIndex && normalizeType(byIndex.type) === normalizeType(spec.type)) {
    return byIndex;
  }

  const specType = normalizeType(spec.type);
  const specText = spec.text?.trim() ?? null;
  const specSrc = spec.src?.trim() ?? null;
  const specLeft = spec.left ?? null;
  const specTop = spec.top ?? null;

  let best: { obj: fabric.Object; score: number } | null = null;

  for (const obj of objects) {
    if (normalizeType(obj.type) !== specType) {
      continue;
    }

    if (specText && isTextObject(obj)) {
      const text = (obj as fabric.Textbox).text?.trim() ?? "";
      if (!text) continue;
      if (!text.includes(specText) && !specText.includes(text)) {
        continue;
      }
    }

    if (specSrc && obj.type === "image") {
      const src = (obj as fabric.Image).getSrc() ?? "";
      if (!src) continue;
      if (src !== specSrc) {
        continue;
      }
    }

    const left = obj.left ?? 0;
    const top = obj.top ?? 0;
    const dx = specLeft === null ? 0 : left - specLeft;
    const dy = specTop === null ? 0 : top - specTop;
    const score = Math.hypot(dx, dy);

    if (!best || score < best.score) {
      best = { obj, score };
    }
  }

  return best?.obj ?? null;
};

export const buildCanvasSnapshot = (editor: Editor): CanvasSnapshot => {
  const { workspace } = getWorkspaceRect(editor.canvas);
  const width = workspace.getScaledWidth();
  const height = workspace.getScaledHeight();
  const background = typeof workspace.fill === "string" ? workspace.fill : null;

  const objects = getNonWorkspaceObjects(editor.canvas).map((obj, index) => {
    const type = obj.type ?? "unknown";
    const text = isTextObject(obj) ? ((obj as fabric.Textbox).text ?? null) : null;
    const src = obj.type === "image" ? ((obj as fabric.Image).getSrc() ?? null) : null;

    return {
      id: `o${index}`,
      index,
      type,
      name: typeof obj.name === "string" ? obj.name : null,
      text: typeof text === "string" && text.trim() ? text : null,
      src,
      left: typeof obj.left === "number" ? obj.left : null,
      top: typeof obj.top === "number" ? obj.top : null,
      width: typeof obj.width === "number" ? obj.width : null,
      height: typeof obj.height === "number" ? obj.height : null,
      scaleX: typeof obj.scaleX === "number" ? obj.scaleX : null,
      scaleY: typeof obj.scaleY === "number" ? obj.scaleY : null,
      angle: typeof obj.angle === "number" ? obj.angle : null,
      fill: typeof (obj as unknown as { fill?: unknown }).fill === "string"
        ? ((obj as unknown as { fill: string }).fill ?? null)
        : null,
      fontSize: isTextObject(obj)
        ? (((obj as fabric.Textbox).fontSize as number | undefined) ?? null)
        : null,
      fontWeight: isTextObject(obj)
        ? (((obj as fabric.Textbox).fontWeight as number | undefined) ?? null)
        : null,
      fontFamily: isTextObject(obj)
        ? (((obj as fabric.Textbox).fontFamily as string | undefined) ?? null)
        : null,
      textAlign: isTextObject(obj)
        ? (((obj as fabric.Textbox).textAlign as string | undefined) ?? null)
        : null,
    };
  });

  return {
    workspace: {
      width,
      height,
      background,
    },
    objects,
  };
};

type Anchor = "center" | "topLeft";

const setObjectPosition = (
  canvas: fabric.Canvas,
  object: fabric.Object,
  params: { x?: number; y?: number; anchor?: Anchor },
) => {
  const { rect } = getWorkspaceRect(canvas);

  const anchor: Anchor = params.anchor ?? "center";
  const center = object.getCenterPoint();

  const targetX =
    params.x === undefined ? center.x : rect.left + rect.width * params.x;
  const targetY =
    params.y === undefined ? center.y : rect.top + rect.height * params.y;

  if (anchor === "topLeft") {
    object.setPositionByOrigin(new fabric.Point(targetX, targetY), "left", "top");
  } else {
    object.setPositionByOrigin(new fabric.Point(targetX, targetY), "center", "center");
  }

  object.setCoords();
};

const addTextbox = (
  canvas: fabric.Canvas,
  params: Extract<CanvasOp, { op: "addTextbox" }>,
) => {
  const { rect } = getWorkspaceRect(canvas);

  const widthPct = params.widthPct ?? 0.8;
  const maxWidth = clamp(widthPct, 0.1, 1) * rect.width;

  const baseFontSize = clamp(Math.round(rect.width * 0.06), 18, 110);
  const role = params.role ?? "body";
  const roleDefaults = (() => {
    if (role === "title") {
      return { fontSize: clamp(baseFontSize * 1.1, 28, 130), fontWeight: 800, fill: "#111827" };
    }
    if (role === "subtitle") {
      return { fontSize: clamp(baseFontSize * 0.7, 16, 90), fontWeight: 650, fill: "#6B7280" };
    }
    if (role === "cta") {
      return { fontSize: clamp(baseFontSize * 0.65, 16, 90), fontWeight: 750, fill: "#25D6FF" };
    }
    return { fontSize: clamp(baseFontSize * 0.55, 14, 72), fontWeight: 550, fill: "#111827" };
  })();

  const style = {
    fontSize: roleDefaults.fontSize,
    fontWeight: roleDefaults.fontWeight,
    fill: roleDefaults.fill,
    textAlign: "center" as const,
    fontFamily: "Arial",
    ...params.style,
  };

  const textbox = new fabric.Textbox(params.text, {
    left: rect.left + rect.width * params.x,
    top: rect.top + rect.height * params.y,
    width: maxWidth,
    ...style,
  });

  textbox.setPositionByOrigin(
    new fabric.Point(rect.left + rect.width * params.x, rect.top + rect.height * params.y),
    "center",
    "center",
  );

  canvas.add(textbox);
  textbox.setCoords();
};

export const applyCanvasOps = (params: {
  editor: Editor;
  ops: CanvasOp[];
  snapshot?: CanvasSnapshot;
}) => {
  applyCanvasOpsToCanvas({
    canvas: params.editor.canvas,
    ops: params.ops,
    snapshot: params.snapshot,
    fireEvents: true,
  });
};

export const applyCanvasOpsToCanvas = (params: {
  canvas: fabric.Canvas;
  ops: CanvasOp[];
  snapshot?: CanvasSnapshot;
  fireEvents?: boolean;
}) => {
  const { canvas, ops, snapshot } = params;

  for (const op of ops) {
    if (op.op === "setBackground") {
      const workspace = getWorkspace(canvas);
      workspace.set({ fill: op.color });
      continue;
    }

    if (op.op === "addTextbox") {
      addTextbox(canvas, op);
      continue;
    }

    const target = resolveTargetFromSnapshot(canvas, snapshot, op.targetId);
    if (!target) {
      continue;
    }

    if (op.op === "delete") {
      canvas.remove(target);
      continue;
    }

    if (op.op === "setText") {
      if (!isTextObject(target)) {
        continue;
      }
      (target as fabric.Textbox).set({ text: op.text });
      target.setCoords();
      continue;
    }

    if (op.op === "setStyle") {
      if (!isTextObject(target)) {
        continue;
      }
      (target as fabric.Textbox).set(op.style);
      target.setCoords();
      continue;
    }

    if (op.op === "move") {
      setObjectPosition(canvas, target, {
        x: op.x,
        y: op.y,
        anchor: op.anchor,
      });
      continue;
    }
  }

  canvas.requestRenderAll();

  if (params.fireEvents) {
    canvas.fire("object:modified");
  }
};
