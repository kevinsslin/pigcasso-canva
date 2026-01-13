export type ExportedAsset = {
  id: string;
  metadataUri: string | null;
  imageUri: string | null;
  metadataUrl: string | null;
  imageUrl: string | null;
};

export type MintView = "configure" | "progress";

export type MintStepKey = "ipfs" | "collection" | "mint";
export type MintStepStatus = "pending" | "active" | "done" | "skipped" | "error";

export type MintStepsState = Record<
  MintStepKey,
  { status: MintStepStatus; detail?: string }
>;

export const getInitialMintSteps = (): MintStepsState => ({
  ipfs: { status: "pending" },
  collection: { status: "pending" },
  mint: { status: "pending" },
});

