export const parseCaip2 = (value: string) => {
  const trimmed = value.trim();
  const parts = trimmed.split(":");
  if (parts.length !== 2) return null;
  const [namespace, reference] = parts;
  if (!namespace || !reference) return null;
  return { namespace, reference, value: `${namespace}:${reference}` };
};

export const parseCaip10 = (value: string) => {
  const trimmed = value.trim();
  const parts = trimmed.split(":");
  if (parts.length !== 3) return null;
  const [namespace, reference, address] = parts;
  if (!namespace || !reference || !address) return null;
  return { chain: `${namespace}:${reference}`, address };
};

export const getEip155ChainId = (chain: string): number | null => {
  const parsed = parseCaip2(chain);
  if (!parsed || parsed.namespace !== "eip155") return null;
  const id = Number(parsed.reference);
  if (!Number.isFinite(id)) return null;
  return id;
};

