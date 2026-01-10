export type NanoBananaProfileOption = "auto" | "nano-banana" | "nano-banana-pro";

export const NANO_BANANA_PROFILE_STORAGE_KEY = "pigcasso:aiProfile";

export const NANO_BANANA_PROFILE_OPTIONS: Array<{
  id: NanoBananaProfileOption;
  label: string;
  description: string;
}> = [
  { id: "auto", label: "Auto", description: "Default quality (recommended)." },
  { id: "nano-banana", label: "Nano Banana", description: "Fast, standard quality." },
  { id: "nano-banana-pro", label: "Nano Banana Pro", description: "Higher quality (Pro gated)." },
];

export const parseNanoBananaProfileOption = (raw: string | null | undefined): NanoBananaProfileOption | null => {
  const value = raw?.trim();
  if (!value) return null;
  if (value === "auto") return "auto";
  if (value === "nano-banana") return "nano-banana";
  if (value === "nano-banana-pro") return "nano-banana-pro";
  return null;
};

export const toNanoBananaApiProfile = (
  option: NanoBananaProfileOption,
): "nano-banana" | "nano-banana-pro" | undefined => {
  if (option === "nano-banana" || option === "nano-banana-pro") return option;
  return undefined;
};

