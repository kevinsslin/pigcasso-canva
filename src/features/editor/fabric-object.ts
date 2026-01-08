export const ALL_CONTROLS_VISIBLE = {
  ml: true,
  mr: true,
  mt: true,
  mb: true,
  tl: true,
  tr: true,
  bl: true,
  br: true,
  mtr: true,
} as const;

export type FabricObjectLike = {
  name?: string | null;
  set: (properties: Record<string, unknown>) => unknown;
  setControlsVisibility?: (options: Record<string, boolean>) => unknown;
};

export const makeObjectInteractive = (object: FabricObjectLike) => {
  if (object.name === "clip" || object.name === "safe-area") return;

  object.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    hoverCursor: "move",
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
  });

  object.setControlsVisibility?.(ALL_CONTROLS_VISIBLE);
};

