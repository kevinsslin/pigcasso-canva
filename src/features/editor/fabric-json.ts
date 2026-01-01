type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTextBaseline = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  switch (trimmed.toLowerCase()) {
    case "alphabetical":
      return "alphabetic";
    case "ideographical":
      return "ideographic";
    default:
      return value;
  }
};

const walkFabricJson = (node: unknown): void => {
  if (Array.isArray(node)) {
    node.forEach(walkFabricJson);
    return;
  }

  if (!isJsonRecord(node)) {
    return;
  }

  if ("textBaseline" in node) {
    node.textBaseline = normalizeTextBaseline(node.textBaseline);
  }

  const nestedKeys = [
    "objects",
    "clipPath",
    "backgroundImage",
    "overlayImage",
    "group",
    "path",
  ];

  for (const key of nestedKeys) {
    if (key in node) {
      walkFabricJson(node[key]);
    }
  }
};

export const normalizeFabricJson = (data: unknown) => {
  walkFabricJson(data);
  return data;
};

