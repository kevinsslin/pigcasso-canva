type StoreSnapshotRecord = Record<string, unknown>;

type TldrawStoreSnapshot = {
  store?: Record<string, StoreSnapshotRecord>;
};

export const sanitizeTldrawStoreSnapshot = <TSnapshot>(snapshot: TSnapshot): TSnapshot => {
  if (!snapshot || typeof snapshot !== "object") return snapshot;

  const raw = snapshot as unknown as TldrawStoreSnapshot & Record<string, unknown>;
  const store = raw.store;
  if (!store || typeof store !== "object") return snapshot;

  let changed = false;
  const nextStore: Record<string, StoreSnapshotRecord> = { ...store };

  Object.entries(store).forEach(([key, record]) => {
    if (!record || typeof record !== "object") return;
    const typeName = (record as any).typeName;
    const type = (record as any).type;
    if (typeName !== "asset" || type !== "image") return;

    const props = (record as any).props;
    if (!props || typeof props !== "object") return;

    const fileSize = Number((props as any).fileSize);
    if (Number.isFinite(fileSize) && fileSize > 0) return;

    changed = true;
    nextStore[key] = { ...(record as any), props: { ...(props as any), fileSize: 1 } };
  });

  if (!changed) return snapshot;
  return { ...(raw as any), store: nextStore } as TSnapshot;
};

