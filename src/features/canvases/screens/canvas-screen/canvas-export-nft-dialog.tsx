"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPublicClient, createWalletClient, custom, erc721Abi, parseEventLogs, zeroAddress } from "viem";
import { mantle } from "viem/chains";
import { useWallets } from "@privy-io/react-auth";

import { pigcassoCollectionAbi, pigcassoNftFactoryAbi } from "@/features/nfts/abi";
import { ipfsToHttpUrl } from "@/features/nfts/ipfs";
import { useMe } from "@/features/auth/api/use-me";
import { useListNftCollections } from "@/features/nfts/api/use-list-collections";
import { useCreateNftCollection } from "@/features/nfts/api/use-create-collection";
import { useExportCanvasNft } from "@/features/canvases/api/use-export-canvas-nft";
import { MANTLE_EXPLORER_BASE_URL } from "@/features/printr/constants";
import { isUserRejectedWalletAction } from "@/lib/wallet-errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const getFactoryAddress = () => process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS?.trim() ?? "";

const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

type MintStepKey = "ipfs" | "collection" | "mint";
type MintStepStatus = "pending" | "active" | "done" | "error";

type MintStepsState = Record<MintStepKey, { status: MintStepStatus; detail?: string }>;

const getInitialMintSteps = (): MintStepsState => ({
  ipfs: { status: "pending" },
  collection: { status: "pending" },
  mint: { status: "pending" },
});

export type CanvasExportNftTarget = {
  canvasId: string;
  canvasName: string;
  shapeId: string;
  imageUrl: string;
  previewUrl: string;
  defaultName?: string | null;
};

type ExportedCanvasNft = {
  imageUri: string;
  metadataUri: string;
  imageUrl: string;
  metadataUrl: string;
};

type CollectionMode = "existing" | "new";
type TokenUriMode = "ipfs" | "https";

const formatAddress = (address: string) => {
  const trimmed = address.trim();
  if (!isEvmAddress(trimmed)) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

export const CanvasExportNftDialog = ({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CanvasExportNftTarget | null;
}) => {
  const me = useMe();
  const { wallets } = useWallets();

  const exportNft = useExportCanvasNft({ toast: false });
  const collections = useListNftCollections(undefined, { enabled: open });
  const createCollectionRecord = useCreateNftCollection();

  const ipfsConfigured = me.data?.data.integrations.ipfs.configured;
  const factoryAddress = getFactoryAddress();
  const factoryConfigured = isEvmAddress(factoryAddress);

  const [tokenName, setTokenName] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [tokenUriMode, setTokenUriMode] = useState<TokenUriMode>("https");

  const [collectionMode, setCollectionMode] = useState<CollectionMode>("existing");
  const [selectedCollectionAddress, setSelectedCollectionAddress] = useState<string>("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionSymbol, setNewCollectionSymbol] = useState("");
  const [newCollectionMaxSupply, setNewCollectionMaxSupply] = useState("10000");
  const [newCollectionContractUri, setNewCollectionContractUri] = useState("");

  const [exported, setExported] = useState<ExportedCanvasNft | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintSteps, setMintSteps] = useState<MintStepsState>(() => getInitialMintSteps());
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<{
    collectionAddress: string;
    txHash: string;
    tokenId: string | null;
    tokenUri: string;
  } | null>(null);

  const collectionsList = useMemo(() => collections.data?.data ?? [], [collections.data?.data]);
  const defaultCollection = useMemo(() => {
    const found = collectionsList.find((collection) => isEvmAddress(collection.address ?? ""));
    if (!found?.address) return null;
    return { ...found, address: found.address as `0x${string}` };
  }, [collectionsList]);

  const connectedEthereumWallets = useMemo(
    () => wallets.filter((wallet) => wallet.type === "ethereum"),
    [wallets],
  );

  const externalWalletAddress = me.data?.data.user.wallets.external?.toLowerCase() ?? null;
  const embeddedWalletAddress = me.data?.data.user.wallets.embedded?.toLowerCase() ?? null;

  const preferredWallet = useMemo(() => {
    const candidates = [externalWalletAddress, embeddedWalletAddress].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const match = connectedEthereumWallets.find((wallet) => wallet.address.toLowerCase() === candidate);
      if (match) return match;
    }
    return connectedEthereumWallets[0] ?? null;
  }, [connectedEthereumWallets, embeddedWalletAddress, externalWalletAddress]);

  const getAutoCollectionDefaults = useCallback(() => {
    const userName = me.data?.data.user.name?.trim();
    const name = userName ? `${userName}'s Pigcasso Collection` : "My Pigcasso Collection";
    return {
      name,
      symbol: "PIG",
      maxSupply: BigInt(10_000),
      contractUri: "",
    };
  }, [me.data?.data.user.name]);

  useEffect(() => {
    if (!open) {
      setTokenName("");
      setTokenDescription("");
      setTokenUriMode("https");
      setCollectionMode("existing");
      setSelectedCollectionAddress("");
      setNewCollectionName("");
      setNewCollectionSymbol("");
      setNewCollectionMaxSupply("10000");
      setNewCollectionContractUri("");
      setExported(null);
      setIsMinting(false);
      setMintSteps(getInitialMintSteps());
      setMintError(null);
      setMintResult(null);
      return;
    }

    const baseName =
      target?.defaultName?.trim() ||
      target?.canvasName?.trim() ||
      "Untitled";
    setTokenName(`${baseName} · NFT`);
    setTokenUriMode("https");

    const defaults = getAutoCollectionDefaults();
    setNewCollectionName(defaults.name);
    setNewCollectionSymbol(defaults.symbol);
    setNewCollectionMaxSupply(defaults.maxSupply.toString());
    setNewCollectionContractUri(defaults.contractUri);
    setCollectionMode("existing");
  }, [getAutoCollectionDefaults, open, target?.canvasName, target?.defaultName]);

  useEffect(() => {
    if (!open) return;
    if (isMinting) return;
    if (collectionMode !== "existing") return;

    const validCollections = collectionsList.filter((collection) => isEvmAddress(collection.address ?? ""));
    if (!validCollections.length) {
      setSelectedCollectionAddress("");
      setCollectionMode("new");
      return;
    }

    setSelectedCollectionAddress((current) => {
      const normalizedCurrent = current.trim().toLowerCase();
      if (normalizedCurrent && validCollections.some((item) => (item.address ?? "").trim().toLowerCase() === normalizedCurrent)) {
        return current;
      }

      const defaultAddress =
        defaultCollection?.address ??
        (validCollections[0]?.address as string | undefined) ??
        "";
      return defaultAddress;
    });
  }, [collectionMode, collectionsList, defaultCollection?.address, isMinting, open]);

  const setMintStep = (key: MintStepKey, patch: Partial<MintStepsState[MintStepKey]>) => {
    setMintSteps((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const ensureClients = async () => {
    if (!preferredWallet || preferredWallet.type !== "ethereum") {
      throw new Error("Wallet not connected.");
    }

    await preferredWallet.switchChain(mantle.id);
    const provider = await preferredWallet.getEthereumProvider();

    const walletClient = createWalletClient({
      account: preferredWallet.address as `0x${string}`,
      chain: mantle,
      transport: custom(provider),
    });

    const publicClient = createPublicClient({
      chain: mantle,
      transport: custom(provider),
    });

    return { walletClient, publicClient };
  };

  const deployCollectionOnChain = async ({
    walletClient,
    publicClient,
    name,
    symbol,
    maxSupply,
    contractUri,
  }: {
    walletClient: Awaited<ReturnType<typeof ensureClients>>["walletClient"];
    publicClient: Awaited<ReturnType<typeof ensureClients>>["publicClient"];
    name: string;
    symbol: string;
    maxSupply: bigint;
    contractUri: string;
  }) => {
    const hash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: pigcassoNftFactoryAbi,
      functionName: "createCollection",
      args: [name, symbol, maxSupply, contractUri],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const parsed = parseEventLogs({
      abi: pigcassoNftFactoryAbi,
      logs: receipt.logs,
    }).find((log) => log.eventName === "CollectionCreated");

    const address = parsed?.args?.collection;
    if (!address || typeof address !== "string") {
      throw new Error("CollectionCreated event not found.");
    }

    return address as `0x${string}`;
  };

  const resolveOrCreateCollection = async ({
    walletClient,
    publicClient,
    onProgress,
  }: {
    walletClient: Awaited<ReturnType<typeof ensureClients>>["walletClient"];
    publicClient: Awaited<ReturnType<typeof ensureClients>>["publicClient"];
    onProgress?: (detail: string) => void;
  }) => {
    if (collectionMode === "existing") {
      const address = selectedCollectionAddress.trim();
      if (!isEvmAddress(address)) {
        throw new Error("Select a valid collection.");
      }
      return { address: address as `0x${string}` };
    }

    const defaults = getAutoCollectionDefaults();
    const name = newCollectionName.trim() || defaults.name;
    const symbol = newCollectionSymbol.trim() || defaults.symbol;
    const contractUri = newCollectionContractUri.trim() || defaults.contractUri;
    const maxSupplyRaw = Number(newCollectionMaxSupply);
    const maxSupply = Number.isFinite(maxSupplyRaw) && maxSupplyRaw > 0 ? BigInt(Math.floor(maxSupplyRaw)) : defaults.maxSupply;

    onProgress?.("Deploying collection…");
    const address = await deployCollectionOnChain({
      walletClient,
      publicClient,
      name,
      symbol,
      maxSupply,
      contractUri,
    });

    await createCollectionRecord.mutateAsync({
      name,
      symbol,
      contractUri: contractUri || undefined,
      address,
    });

    return { address };
  };

  const onMintNow = async () => {
    if (!target) return;
    if (!ipfsConfigured) {
      toast.error("IPFS export is not available right now.");
      return;
    }
    if (!factoryConfigured) {
      toast.error("NFT minting is not configured.");
      return;
    }
    if (!preferredWallet) {
      toast.error("Connect a wallet to mint.");
      return;
    }

    const alreadyExported = Boolean(exported?.metadataUri);
    setMintError(null);
    setMintResult(null);
    setMintSteps(() => ({
      ipfs: alreadyExported ? { status: "done", detail: "Already pinned." } : { status: "active", detail: "Pinning to IPFS…" },
      collection: { status: "pending" },
      mint: { status: "pending" },
    }));
    setIsMinting(true);

    let currentStep: MintStepKey = alreadyExported ? "collection" : "ipfs";

    try {
      const exportedAsset = alreadyExported
        ? exported
        : (
            await exportNft.mutateAsync({
              param: { id: target.canvasId },
              json: {
                imageUrl: target.imageUrl,
                shapeId: target.shapeId,
                name: tokenName.trim() || undefined,
                description: tokenDescription.trim() || undefined,
              },
            })
          ).data;

      if (!exportedAsset?.metadataUri) {
        throw new Error("Missing token URI. Please try again.");
      }

      if (!alreadyExported) {
        const next = {
          imageUri: exportedAsset.imageUri,
          metadataUri: exportedAsset.metadataUri,
          imageUrl: exportedAsset.imageUrl,
          metadataUrl: exportedAsset.metadataUrl,
        } satisfies ExportedCanvasNft;
        setExported(next);
        setMintStep("ipfs", { status: "done", detail: "Pinned to IPFS." });
      }

      currentStep = "collection";
      setMintStep("collection", { status: "active", detail: "Connecting wallet…" });
      const { walletClient, publicClient } = await ensureClients();

      const collection = await resolveOrCreateCollection({
        walletClient,
        publicClient,
        onProgress: (detail) => setMintStep("collection", { status: "active", detail }),
      });
      setMintStep("collection", { status: "done", detail: `Using ${collection.address}` });

      currentStep = "mint";
      setMintStep("mint", { status: "active", detail: "Minting NFT…" });

      const tokenUri =
        tokenUriMode === "ipfs"
          ? exportedAsset.metadataUri || exportedAsset.metadataUrl
          : exportedAsset.metadataUrl || ipfsToHttpUrl(exportedAsset.metadataUri) || exportedAsset.metadataUri;

      const hash = await walletClient.writeContract({
        address: collection.address,
        abi: pigcassoCollectionAbi,
        functionName: "mint",
        args: [walletClient.account.address, tokenUri],
      });

      setMintStep("mint", { status: "active", detail: "Waiting for confirmation…" });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const transfer = parseEventLogs({
        abi: erc721Abi,
        logs: receipt.logs,
      }).find(
        (
          log,
        ): log is Extract<
          ReturnType<typeof parseEventLogs<typeof erc721Abi>>[number],
          { eventName: "Transfer" }
        > =>
          log.eventName === "Transfer" &&
          log.args.from.toLowerCase() === zeroAddress &&
          log.args.to.toLowerCase() === walletClient.account.address.toLowerCase(),
      );

      const tokenId = transfer ? transfer.args.tokenId.toString() : null;

      const explorerBase = MANTLE_EXPLORER_BASE_URL.replace(/\/$/, "");
      const txUrl = `${explorerBase}/tx/${encodeURIComponent(hash)}`;
      const tokenUrl = tokenId
        ? `${explorerBase}/token/${encodeURIComponent(collection.address)}?a=${encodeURIComponent(tokenId)}`
        : `${explorerBase}/address/${encodeURIComponent(collection.address)}`;

      setMintResult({ collectionAddress: collection.address, txHash: hash, tokenId, tokenUri });
      setMintStep("mint", { status: "done", detail: tokenId ? `Minted token #${tokenId}.` : "NFT minted." });
      toast.success("NFT minted.", {
        duration: 4500,
        action: {
          label: "View tx",
          onClick: () => window.open(txUrl, "_blank", "noreferrer"),
        },
        cancel: {
          label: tokenId ? "View token" : "View collection",
          onClick: () => window.open(tokenUrl, "_blank", "noreferrer"),
        },
      });
    } catch (error) {
      if (isUserRejectedWalletAction(error)) {
        setMintError(null);
        setMintStep(currentStep, { status: "pending", detail: "Canceled by user." });
        toast.message("User rejected the transaction.", { duration: 2500 });
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to mint";
      setMintError(message);
      setMintStep(currentStep, { status: "error", detail: message });
      toast.error(message, { duration: 5000 });
    } finally {
      setIsMinting(false);
    }
  };

  const busy =
    exportNft.isPending ||
    collections.isLoading ||
    createCollectionRecord.isPending ||
    isMinting;

  const previewUrl = useMemo(() => {
    const raw = exported?.imageUrl ?? target?.previewUrl ?? "";
    if (!raw) return "";
    return ipfsToHttpUrl(raw) ?? raw;
  }, [exported?.imageUrl, target?.previewUrl]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isMinting) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Mint as NFT</DialogTitle>
          <DialogDescription>Export this canvas item to IPFS, then mint it onchain.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {!target ? (
            <div className="text-sm text-muted-foreground">Select an image on the canvas to mint.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
              <div className="md:col-span-2">
              <div className="rounded-xl border bg-muted/30 overflow-hidden">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
                    Preview unavailable
                  </div>
                )}
              </div>

                {exported ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="rounded-lg border bg-background/60 p-3">
                      <div className="font-medium">Metadata URL (tokenURI)</div>
                      <div className="mt-1 space-y-1 font-mono break-all">
                        <div className={cn(tokenUriMode === "ipfs" ? "text-foreground" : "text-muted-foreground")}>
                          {exported.metadataUri}
                        </div>
                        <div className={cn(tokenUriMode === "https" ? "text-foreground" : "text-muted-foreground")}>
                          {exported.metadataUrl}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background/60 p-3">
                      <div className="font-medium">Image URL</div>
                      <div className="mt-1 space-y-1 font-mono break-all">
                        <div>{exported.imageUri}</div>
                        <div className="text-muted-foreground">{exported.imageUrl}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-3 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Token URI format</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={tokenUriMode === "https" ? "default" : "secondary"}
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => setTokenUriMode("https")}
                    >
                      Gateway URL (recommended)
                    </Button>
                    <Button
                      type="button"
                      variant={tokenUriMode === "ipfs" ? "default" : "secondary"}
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => setTokenUriMode("ipfs")}
                    >
                      IPFS URI (advanced)
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Default uses an HTTPS gateway for best preview compatibility. Switch to IPFS URI if you specifically
                    want an ipfs:// tokenURI.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Name</div>
                  <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} disabled={busy} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Description</div>
                  <Textarea
                    value={tokenDescription}
                    onChange={(e) => setTokenDescription(e.target.value)}
                    placeholder="Created with Pigcasso Canvas."
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Collection</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={collectionMode === "existing" ? "default" : "secondary"}
                      className="rounded-full"
                      disabled={busy || !collectionsList.length}
                      onClick={() => setCollectionMode("existing")}
                    >
                      Use existing
                    </Button>
                    <Button
                      type="button"
                      variant={collectionMode === "new" ? "default" : "secondary"}
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => setCollectionMode("new")}
                    >
                      Deploy new
                    </Button>
                  </div>

                  {collectionMode === "existing" ? (
                    collectionsList.filter((collection) => isEvmAddress(collection.address ?? "")).length ? (
                      <div className="grid gap-2">
                        {collectionsList
                          .filter((collection) => isEvmAddress(collection.address ?? ""))
                          .map((collection) => {
                            const address = (collection.address ?? "").trim();
                            const selected = address.toLowerCase() === selectedCollectionAddress.trim().toLowerCase();
                            return (
                              <button
                                key={collection.id}
                                type="button"
                                className={cn(
                                  "w-full rounded-xl border px-3 py-2 text-left transition",
                                  selected ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/30",
                                )}
                                disabled={busy}
                                onClick={() => setSelectedCollectionAddress(address)}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold truncate">{collection.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {collection.symbol} · {formatAddress(address)}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "shrink-0 inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-semibold",
                                      selected ? "border-primary text-primary" : "border-border/60 text-muted-foreground",
                                    )}
                                  >
                                    {selected ? "Selected" : "Select"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No collections found yet. Deploy a new one to get started.
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-3 rounded-xl border bg-background/60 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Name</div>
                          <Input
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Symbol</div>
                          <Input
                            value={newCollectionSymbol}
                            onChange={(e) => setNewCollectionSymbol(e.target.value.toUpperCase())}
                            disabled={busy}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Max supply</div>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={newCollectionMaxSupply}
                            onChange={(e) => setNewCollectionMaxSupply(e.target.value)}
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground">Contract URI (optional)</div>
                          <Input
                            value={newCollectionContractUri}
                            onChange={(e) => setNewCollectionContractUri(e.target.value)}
                            disabled={busy}
                            placeholder="ipfs://…"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Deploying creates a new onchain ERC-721 collection and saves it to your account for future mints.
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-background/60 p-4 space-y-2 text-sm">
                  <div className="font-medium">Mint status</div>
                  {(["ipfs", "collection", "mint"] as const).map((key, idx) => {
                    const step = mintSteps[key];
                    const icon =
                      step.status === "done" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : step.status === "error" ? (
                        <AlertTriangle className="size-4 text-rose-500" />
                      ) : step.status === "active" ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] text-muted-foreground">
                          {idx + 1}
                        </span>
                      );

                    const label = key === "ipfs" ? "Export" : key === "collection" ? "Collection" : "Mint";

                    return (
                      <div key={key} className="flex items-start gap-3">
                        <div className="mt-0.5">{icon}</div>
                        <div className="min-w-0">
                          <div className="font-semibold">{label}</div>
                          <div className="text-xs text-muted-foreground">{step.detail ?? "Pending"}</div>
                        </div>
                      </div>
                    );
                  })}

                  {mintError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      {mintError}
                    </div>
                  ) : null}

                  {mintResult ? (
                    <div className="rounded-lg border bg-background p-3 text-xs space-y-1">
                      <div className="font-medium">Mint result</div>
                      <div className="font-mono break-all">Collection: {mintResult.collectionAddress}</div>
                      <div className="font-mono break-all">Tx: {mintResult.txHash}</div>
                      {mintResult.tokenId ? <div className="font-mono break-all">Token ID: {mintResult.tokenId}</div> : null}
                      <div className="font-mono break-all">Token URI: {mintResult.tokenUri}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 shrink-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isMinting}>
            Close
          </Button>
          <Button type="button" onClick={() => void onMintNow()} disabled={!target || busy || !tokenName.trim()}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Mint NFT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
