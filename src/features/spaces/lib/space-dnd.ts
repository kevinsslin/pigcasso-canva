import type { SpaceBlock } from "@/features/spaces/lib/space-document";

const SPACE_MODULE_DRAG_TYPE = "application/x-pigcasso-space-module";

export const setSpaceModuleDragData = (dataTransfer: DataTransfer, moduleType: SpaceBlock["type"]) => {
  dataTransfer.effectAllowed = "copy";

  try {
    dataTransfer.setData(SPACE_MODULE_DRAG_TYPE, moduleType);
  } catch {
    // Ignore (some browsers can throw if type is unsupported).
  }

  try {
    dataTransfer.setData("text/plain", moduleType);
  } catch {
    // Ignore.
  }
};

export const getSpaceModuleDragData = (dataTransfer: DataTransfer | null) => {
  if (!dataTransfer) return null;

  const raw =
    dataTransfer.getData(SPACE_MODULE_DRAG_TYPE) ||
    dataTransfer.getData("text/plain") ||
    "";

  return raw.trim() ? (raw.trim() as SpaceBlock["type"]) : null;
};

