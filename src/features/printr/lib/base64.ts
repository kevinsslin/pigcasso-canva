export const base64ToHex = (value: string): `0x${string}` => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Missing base64 value");
  }

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);

  let hex = "0x";
  for (let i = 0; i < binary.length; i += 1) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }

  return hex as `0x${string}`;
};

