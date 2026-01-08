const LAYER_ID_KEY = "__pigcassoLayerId" as const;

export const getLayerId = (object: unknown) => {
  const anyObject = object as { [LAYER_ID_KEY]?: unknown };
  if (typeof anyObject[LAYER_ID_KEY] === "string") {
    return anyObject[LAYER_ID_KEY];
  }

  const id = crypto.randomUUID();
  anyObject[LAYER_ID_KEY] = id;
  return id;
};

export const ensureUniqueLayerIds = (objects: unknown[]) => {
  const seen = new Set<string>();
  for (const object of objects) {
    const anyObject = object as { [LAYER_ID_KEY]?: unknown };
    let id =
      typeof anyObject[LAYER_ID_KEY] === "string" ? anyObject[LAYER_ID_KEY] : null;

    if (!id || seen.has(id)) {
      id = crypto.randomUUID();
      anyObject[LAYER_ID_KEY] = id;
    }

    seen.add(id);
  }
};

export const swapLayerIds = (order: string[], activeId: string, overId: string) => {
  if (activeId === overId) return order;
  const fromIndex = order.indexOf(activeId);
  const toIndex = order.indexOf(overId);
  if (fromIndex < 0 || toIndex < 0) return order;
  if (fromIndex === toIndex) return order;

  const next = order.slice();
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
};

export type CanvasLike<TObject extends { name?: string | null }> = {
  getObjects: () => TObject[];
  moveTo: (object: TObject, index: number) => unknown;
  setActiveObject?: (object: TObject) => unknown;
  requestRenderAll?: () => unknown;
  fire?: (eventName: string) => unknown;
};

export const applyLayerOrderToCanvas = <TObject extends { name?: string | null }>(
  canvas: CanvasLike<TObject>,
  layerIdsTopToBottom: string[],
  options?: { activeId?: string; clipName?: string },
) => {
  const clipName = options?.clipName ?? "clip";
  const objects = canvas.getObjects();

  const clipObjects: TObject[] = [];
  const layerObjects: TObject[] = [];

  for (const object of objects) {
    if (object.name === clipName) {
      clipObjects.push(object);
    } else {
      layerObjects.push(object);
    }
  }

  ensureUniqueLayerIds(layerObjects);

  const objectsById = new Map<string, TObject>();
  for (const object of layerObjects) {
    const id = (object as unknown as { [LAYER_ID_KEY]?: unknown })[LAYER_ID_KEY];
    if (typeof id === "string") {
      objectsById.set(id, object);
    }
  }

  const desiredBottomToTop: TObject[] = [];
  const seen = new Set<string>();

  for (const id of layerIdsTopToBottom.slice().reverse()) {
    const object = objectsById.get(id);
    if (!object) continue;
    desiredBottomToTop.push(object);
    seen.add(id);
  }

  for (const object of layerObjects) {
    const id = (object as unknown as { [LAYER_ID_KEY]?: unknown })[LAYER_ID_KEY];
    if (typeof id !== "string") continue;
    if (seen.has(id)) continue;
    desiredBottomToTop.push(object);
    seen.add(id);
  }

  const startIndex = clipObjects.length;

  desiredBottomToTop.forEach((object, index) => {
    canvas.moveTo(object, startIndex + index);
  });

  if (options?.activeId && canvas.setActiveObject) {
    const activeObject = objectsById.get(options.activeId);
    if (activeObject) {
      canvas.setActiveObject(activeObject);
    }
  }

  canvas.requestRenderAll?.();
  canvas.fire?.("object:modified");
};
