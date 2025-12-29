import { fabric } from "fabric";

import type { Editor } from "@/features/editor/types";
import type { Web3Preset } from "@/features/editor/web3-presets";

export type ExportedPackItem = {
  preset: Web3Preset;
  fileName: string;
  blob: Blob;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const sanitizeFileSegment = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "project";
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64);
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");

  anchorElement.href = url;
  anchorElement.download = fileName;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  anchorElement.remove();
  URL.revokeObjectURL(url);
};

const cloneObject = (object: fabric.Object) =>
  new Promise<fabric.Object>((resolve) => {
    object.clone((cloned: fabric.Object) => resolve(cloned));
  });

const getWorkspaceRect = (editor: Editor) => {
  const workspace = editor.getWorkspace();
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const left = workspace.left ?? 0;
  const top = workspace.top ?? 0;
  const width = workspace.getScaledWidth();
  const height = workspace.getScaledHeight();

  return { workspace, left, top, width, height };
};

const computeVisibleUnionBounds = (
  objects: fabric.Object[],
  workspaceBounds: { width: number; height: number },
) => {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const object of objects) {
    if (!object.visible) continue;

    const rect = object.getBoundingRect(true, true);

    const clippedLeft = clamp(rect.left, 0, workspaceBounds.width);
    const clippedTop = clamp(rect.top, 0, workspaceBounds.height);
    const clippedRight = clamp(
      rect.left + rect.width,
      0,
      workspaceBounds.width,
    );
    const clippedBottom = clamp(
      rect.top + rect.height,
      0,
      workspaceBounds.height,
    );

    if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
      continue;
    }

    left = Math.min(left, clippedLeft);
    top = Math.min(top, clippedTop);
    right = Math.max(right, clippedRight);
    bottom = Math.max(bottom, clippedBottom);
  }

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom)
  ) {
    return null;
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const renderPresetPng = async (options: {
  editor: Editor;
  preset: Web3Preset;
  projectName: string;
}) => {
  const { editor, preset, projectName } = options;

  const { workspace, left: workspaceLeft, top: workspaceTop, width, height } =
    getWorkspaceRect(editor);

  const exportObjects = editor.canvas
    .getObjects()
    .filter(
      (object) =>
        object.name !== "clip" &&
        object.name !== "safe-area" &&
        object.visible !== false,
    );

  const element = document.createElement("canvas");
  const tempCanvas = new fabric.StaticCanvas(element, {
    width: preset.width,
    height: preset.height,
  });

  const workspaceFill = (workspace as fabric.Rect).fill ?? "white";
  tempCanvas.setBackgroundColor(workspaceFill as any, () => {});

  const cloned = await Promise.all(exportObjects.map(cloneObject));

  for (const object of cloned) {
    object.set({
      left: (object.left ?? 0) - workspaceLeft,
      top: (object.top ?? 0) - workspaceTop,
    });
    object.setCoords();
    tempCanvas.add(object);
  }

  const union = computeVisibleUnionBounds(cloned, {
    width,
    height,
  });

  if (union && union.width > 0 && union.height > 0) {
    const safeWidth = Math.max(1, preset.width - preset.safeMargin * 2);
    const safeHeight = Math.max(1, preset.height - preset.safeMargin * 2);

    const scale = Math.min(safeWidth / union.width, safeHeight / union.height);

    const targetLeft =
      preset.safeMargin + (safeWidth - union.width * scale) / 2;
    const targetTop =
      preset.safeMargin + (safeHeight - union.height * scale) / 2;

    const translateX = targetLeft - union.left * scale;
    const translateY = targetTop - union.top * scale;

    tempCanvas.setViewportTransform([scale, 0, 0, scale, translateX, translateY]);
  }

  tempCanvas.renderAll();

  const fileName = `${sanitizeFileSegment(projectName)}_${
    preset.key
  }_${preset.width}x${preset.height}.png`;

  const dataUrl = tempCanvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 1,
  });

  tempCanvas.dispose();

  return {
    fileName,
    blob: dataUrlToBlob(dataUrl),
  };
};

export const exportPack = async (options: {
  editor: Editor;
  projectName: string;
  presets: Web3Preset[];
}): Promise<ExportedPackItem[]> => {
  const { editor, projectName, presets } = options;

  const sourceCanvas = editor.canvas;
  const previousViewport = sourceCanvas.viewportTransform?.slice() ?? [
    1, 0, 0, 1, 0, 0,
  ];

  sourceCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  sourceCanvas.renderAll();

  try {
    const items = await Promise.all(
      presets.map(async (preset) => {
        const { blob, fileName } = await renderPresetPng({
          editor,
          preset,
          projectName,
        });

        return {
          preset,
          fileName,
          blob,
        };
      }),
    );

    return items;
  } finally {
    sourceCanvas.setViewportTransform(previousViewport);
    sourceCanvas.renderAll();
  }
};
