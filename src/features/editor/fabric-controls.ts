type FabricControl = {
  x?: number;
  y?: number;
  sizeX?: number | null;
  sizeY?: number | null;
  touchSizeX?: number | null;
  touchSizeY?: number | null;
};

type FabricControlCtor = new (options: Record<string, unknown>) => FabricControl;

type FabricLike = {
  Control: FabricControlCtor;
  Object: { prototype: { controls: Record<string, FabricControl> } };
  Textbox?: { prototype: { controls: Record<string, FabricControl> } };
};

export type CanvaLikeControlsOptions = {
  edgeControlSize?: number;
  edgeTouchLength?: number;
  edgeTouchThickness?: number;
};

const setOrCreateControl = (
  fabric: FabricLike,
  controls: Record<string, FabricControl>,
  key: string,
  options: Record<string, unknown>,
) => {
  const existing = controls[key];
  if (existing) {
    Object.assign(existing, options);
    return existing;
  }

  const created = new fabric.Control(options);
  controls[key] = created;
  return created;
};

export const applyCanvaLikeResizeControls = (
  fabric: FabricLike,
  options?: CanvaLikeControlsOptions,
) => {
  const edgeControlSize = options?.edgeControlSize ?? 18;
  const edgeTouchLength = options?.edgeTouchLength ?? 9999;
  const edgeTouchThickness = options?.edgeTouchThickness ?? 44;

  const objectControls = fabric.Object.prototype.controls;

  setOrCreateControl(fabric, objectControls, "ml", {
    x: -0.5,
    y: 0,
    sizeX: edgeControlSize,
    sizeY: edgeControlSize,
    touchSizeX: edgeTouchThickness,
    touchSizeY: edgeTouchLength,
  });

  setOrCreateControl(fabric, objectControls, "mr", {
    x: 0.5,
    y: 0,
    sizeX: edgeControlSize,
    sizeY: edgeControlSize,
    touchSizeX: edgeTouchThickness,
    touchSizeY: edgeTouchLength,
  });

  setOrCreateControl(fabric, objectControls, "mt", {
    x: 0,
    y: -0.5,
    sizeX: edgeControlSize,
    sizeY: edgeControlSize,
    touchSizeX: edgeTouchLength,
    touchSizeY: edgeTouchThickness,
  });

  setOrCreateControl(fabric, objectControls, "mb", {
    x: 0,
    y: 0.5,
    sizeX: edgeControlSize,
    sizeY: edgeControlSize,
    touchSizeX: edgeTouchLength,
    touchSizeY: edgeTouchThickness,
  });

  const textboxControls = fabric.Textbox?.prototype.controls;
  if (textboxControls) {
    setOrCreateControl(fabric, textboxControls, "ml", {
      x: -0.5,
      y: 0,
      sizeX: edgeControlSize,
      sizeY: edgeControlSize,
      touchSizeX: edgeTouchThickness,
      touchSizeY: edgeTouchLength,
    });

    setOrCreateControl(fabric, textboxControls, "mr", {
      x: 0.5,
      y: 0,
      sizeX: edgeControlSize,
      sizeY: edgeControlSize,
      touchSizeX: edgeTouchThickness,
      touchSizeY: edgeTouchLength,
    });

    setOrCreateControl(fabric, textboxControls, "mt", {
      x: 0,
      y: -0.5,
      sizeX: edgeControlSize,
      sizeY: edgeControlSize,
      touchSizeX: edgeTouchLength,
      touchSizeY: edgeTouchThickness,
    });

    setOrCreateControl(fabric, textboxControls, "mb", {
      x: 0,
      y: 0.5,
      sizeX: edgeControlSize,
      sizeY: edgeControlSize,
      touchSizeX: edgeTouchLength,
      touchSizeY: edgeTouchThickness,
    });
  }
};
