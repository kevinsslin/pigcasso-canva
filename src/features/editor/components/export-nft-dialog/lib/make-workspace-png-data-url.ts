import { fabric } from "fabric";

import type { Editor } from "@/features/editor/types";

export const makeWorkspacePngDataUrl = (editor: Editor, multiplier = 1) => {
  const workspace = editor.getWorkspace() as fabric.Rect | undefined;
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const canvas = editor.canvas;
  const previousViewport = canvas.viewportTransform?.slice() ?? [1, 0, 0, 1, 0, 0];

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    width: workspace.getScaledWidth(),
    height: workspace.getScaledHeight(),
    left: workspace.left ?? 0,
    top: workspace.top ?? 0,
    multiplier,
  });

  canvas.setViewportTransform(previousViewport);
  canvas.renderAll();

  return dataUrl;
};

