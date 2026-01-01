"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fabric } from "fabric";
import { createPublicClient, createWalletClient, custom, erc721Abi, parseEventLogs, zeroAddress } from "viem";
import { mantle } from "viem/chains";
import { useWallets } from "@privy-io/react-auth";

import type { Editor } from "@/features/editor/types";
import { JSON_KEYS } from "@/features/editor/types";
import type { PageBarItem } from "@/features/editor/components/pages-bar";

import { pigcassoCollectionAbi, pigcassoNftFactoryAbi } from "@/features/nfts/abi";
import { ipfsToHttpUrl } from "@/features/nfts/ipfs";
import { useMe } from "@/features/auth/api/use-me";
import { useListNftCollections } from "@/features/nfts/api/use-list-collections";
import { useCreateNftCollection } from "@/features/nfts/api/use-create-collection";
import { useExportNftAsset } from "@/features/nfts/api/use-export-asset";
import { useUpdateNftAsset } from "@/features/nfts/api/use-update-asset";

import { getAuthToken } from "@/lib/auth-token";
import { uploadFiles } from "@/lib/uploadthing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getFactoryAddress = () => process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS?.trim() ?? "";

const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

const makeWorkspacePngDataUrl = (editor: Editor, multiplier = 1) => {
  const workspace = editor.getWorkspace() as fabric.Rect | undefined;
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const canvas = editor.canvas;
  const previousViewport = canvas.viewportTransform?.slice() ?? [1, 0, 0, 1, 0, 0];

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    width: workspace.getScaledWidth(),
    height: workspace.getScaledHeight(),
    left: workspace.left ?? 0,
    top: workspace.top ?? 0,
    multiplier,
  });

  canvas.setViewportTransform(previousViewport);
  canvas.renderAll();

  return dataUrl;
};

type ExportedAsset = {
  id: string;
  metadataUri: string | null;
  imageUri: string | null;
};

type ToastId = ReturnType<typeof toast.loading>;

type ExportNftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | undefined;
  projectId: string;
  projectName: string;
  activePage: PageBarItem | null;
};

export const ExportNftDialog = ({
  open,
  onOpenChange,
  editor,
  projectId,
  projectName,
  activePage,
}: ExportNftDialogProps) => {
  const me = useMe();
  const { wallets } = useWallets();

  const collections = useListNftCollections(undefined, { enabled: open });
  const createCollectionRecord = useCreateNftCollection();
  const exportAsset = useExportNftAsset();
  const updateAsset = useUpdateNftAsset();

  const ipfsConfigured = me.data?.data.integrations.ipfs.configured === true;

  const [tokenName, setTokenName] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const [collectionMode, setCollectionMode] = useState<"auto" | "existing" | "new">("auto");
  const [selectedCollectionAddress, setSelectedCollectionAddress] = useState("");
  const [selectedCollectionRecordId, setSelectedCollectionRecordId] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionSymbol, setNewCollectionSymbol] = useState("");
  const [newCollectionMaxSupply, setNewCollectionMaxSupply] = useState("10000");
  const [newCollectionContractUri, setNewCollectionContractUri] = useState("");

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [exportedAsset, setExportedAsset] = useState<ExportedAsset | null>(null);

  const factoryAddress = getFactoryAddress();
  const factoryConfigured = isEvmAddress(factoryAddress);

  const preferredWalletAddress = me.data?.data.user.wallets.external ?? me.data?.data.user.wallets.embedded;

  const preferredWallet = useMemo(() => {
    if (!preferredWalletAddress) return null;
    const target = preferredWalletAddress.toLowerCase();
    return (
      wallets.find((wallet) => wallet.type === "ethereum" && wallet.address.toLowerCase() === target) ??
      null
    );
  }, [preferredWalletAddress, wallets]);

  useEffect(() => {
    if (!open) {
      setUploadedImageUrl(null);
      setExportedAsset(null);
      setTokenName("");
      setTokenDescription("");
      setShowAdvanced(false);
      setIsMinting(false);
      setCollectionMode("auto");
      setSelectedCollectionAddress("");
      setSelectedCollectionRecordId(null);
      setNewCollectionName("");
      setNewCollectionSymbol("");
      setNewCollectionMaxSupply("10000");
      setNewCollectionContractUri("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const pageLabel = activePage ? `Page ${activePage.index + 1}` : "NFT";
    setTokenName((prev) => (prev ? prev : `${projectName} · ${pageLabel}`));
  }, [activePage, open, projectName]);

  const collectionsList = useMemo(() => collections.data?.data ?? [], [collections.data?.data]);

  const defaultCollection = useMemo(() => {
    const found = collectionsList.find((collection) => isEvmAddress(collection.address ?? ""));
    if (!found?.address) return null;
    return { ...found, address: found.address as `0x${string}` };
  }, [collectionsList]);

  const getAutoCollectionDefaults = () => {
    const userName = me.data?.data.user.name?.trim();
    const name = userName ? `${userName}'s Pigcasso Collection` : "My Pigcasso Collection";
    return {
      name,
      symbol: "PIG",
      maxSupply: BigInt(10_000),
      contractUri: "",
    };
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

  const exportToIpfs = async (toastId: ToastId) => {
    if (!editor || !activePage) {
      throw new Error("Select a page to mint.");
    }
    if (!ipfsConfigured) {
      throw new Error("NFT export is not available right now.");
    }

    const dataUrl = makeWorkspacePngDataUrl(editor, 1);
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `pigcasso-${projectId}-${activePage.index + 1}.png`, {
      type: "image/png",
    });

    const token = await getAuthToken({
      maxWaitMs: 2000,
      retries: 4,
      retryDelayMs: 200,
    });
    if (!token) {
      throw new Error("Missing auth token. Please sign in again.");
    }

    toast.loading("Uploading image…", { id: toastId });
    const uploaded = await uploadFiles("nftUploader", {
      files: [file],
      headers: { Authorization: `Bearer ${token}` },
    });

    const url =
      uploaded?.[0]?.ufsUrl ??
      uploaded?.[0]?.url ??
      (uploaded?.[0] as { serverData?: { url?: string } } | undefined)?.serverData?.url;

    if (!url) {
      throw new Error("Upload finished but no URL was returned.");
    }

    setUploadedImageUrl(url);
    toast.loading("Pinning to IPFS…", { id: toastId });

    const sourceJson = JSON.stringify(editor.canvas.toJSON(JSON_KEYS));

    const result = await exportAsset.mutateAsync({
      projectId,
      projectPageId: activePage.id,
      imageUrl: url,
      sourceJson,
      name: tokenName.trim() || undefined,
      description: tokenDescription.trim() || undefined,
    });

    const asset = result.data;
    const next = {
      id: asset.id,
      metadataUri: asset.metadataUri,
      imageUri: asset.imageUri,
    } satisfies ExportedAsset;

    setExportedAsset(next);
    return next;
  };

  const resolveOrCreateCollection = async ({
    walletClient,
    publicClient,
    toastId,
  }: {
    walletClient: Awaited<ReturnType<typeof ensureClients>>["walletClient"];
    publicClient: Awaited<ReturnType<typeof ensureClients>>["publicClient"];
    toastId: ToastId;
  }) => {
    if (collectionMode === "new") {
      const defaults = getAutoCollectionDefaults();
      const name = newCollectionName.trim() || defaults.name;
      const symbol = newCollectionSymbol.trim() || defaults.symbol;
      const supplyRaw = newCollectionMaxSupply.trim();
      const supplyParsed = Number(supplyRaw);
      const maxSupply = Number.isFinite(supplyParsed) && supplyParsed > 0 ? BigInt(supplyParsed) : defaults.maxSupply;
      const contractUri = newCollectionContractUri.trim();

      toast.loading("Deploying collection…", { id: toastId });
      const address = await deployCollectionOnChain({
        walletClient,
        publicClient,
        name,
        symbol,
        maxSupply,
        contractUri,
      });

      const record = await createCollectionRecord.mutateAsync({
        name,
        symbol,
        contractUri: contractUri || undefined,
        address,
      });

      setSelectedCollectionAddress(address);
      setSelectedCollectionRecordId(record.data.id);
      setCollectionMode("existing");

      return { address, recordId: record.data.id };
    }

    if (collectionMode === "existing") {
      const trimmed = selectedCollectionAddress.trim();
      if (trimmed && !isEvmAddress(trimmed)) {
        throw new Error("Invalid collection address.");
      }
      if (trimmed && isEvmAddress(trimmed)) {
        return { address: trimmed as `0x${string}`, recordId: selectedCollectionRecordId };
      }
    }

    if (defaultCollection) {
      return { address: defaultCollection.address, recordId: defaultCollection.id };
    }

    const defaults = getAutoCollectionDefaults();
    toast.loading("Deploying collection…", { id: toastId });
    const address = await deployCollectionOnChain({
      walletClient,
      publicClient,
      ...defaults,
    });

    const record = await createCollectionRecord.mutateAsync({
      name: defaults.name,
      symbol: defaults.symbol,
      contractUri: defaults.contractUri || undefined,
      address,
    });

    setSelectedCollectionAddress(address);
    setSelectedCollectionRecordId(record.data.id);
    setCollectionMode("existing");

    return { address, recordId: record.data.id };
  };

  const onMintNow = async () => {
    if (!editor || !activePage) {
      toast.error("Select a page to mint.");
      return;
    }
    if (!ipfsConfigured) {
      toast.error("NFT export is not available right now.");
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

    const toastId = toast.loading("Preparing…");
    setIsMinting(true);

    try {
      const asset = exportedAsset?.metadataUri ? exportedAsset : await exportToIpfs(toastId);
      if (!asset?.metadataUri) {
        throw new Error("Missing token URI. Please try again.");
      }

      toast.loading("Connecting wallet…", { id: toastId });
      const { walletClient, publicClient } = await ensureClients();

      const collection = await resolveOrCreateCollection({ walletClient, publicClient, toastId });

      toast.loading("Minting NFT…", { id: toastId });
      const hash = await walletClient.writeContract({
        address: collection.address,
        abi: pigcassoCollectionAbi,
        functionName: "mint",
        args: [walletClient.account.address, asset.metadataUri],
      });

      toast.loading("Waiting for confirmation…", { id: toastId });
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

      toast.loading("Finalizing…", { id: toastId });
      await updateAsset.mutateAsync({
        id: asset.id,
        values: {
          status: "minted",
          collectionId: collection.recordId,
          collectionAddress: collection.address,
          tokenId,
          txHash: hash,
        },
      });

      toast.success("NFT minted.", { id: toastId, duration: 3500 });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mint", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setIsMinting(false);
    }
  };

  const previewUrl = ipfsToHttpUrl(exportedAsset?.imageUri) ?? uploadedImageUrl;

  const collectionLabel =
    collectionMode === "existing" && isEvmAddress(selectedCollectionAddress.trim())
      ? selectedCollectionAddress.trim()
      : defaultCollection?.name ?? "Auto";

  const canMintNow =
    Boolean(editor) &&
    Boolean(activePage) &&
    ipfsConfigured &&
    factoryConfigured &&
    Boolean(preferredWallet) &&
    !isMinting &&
    !exportAsset.isPending &&
    !updateAsset.isPending &&
    !createCollectionRecord.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Mint as NFT</DialogTitle>
          <DialogDescription>Upload → IPFS → mint on Mantle, in one click.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">{projectName}</div>
            <div className="text-xs text-muted-foreground">
              {activePage ? `Page ${activePage.index + 1}` : "Select a page"}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">NFT title</div>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Give your NFT a name (optional)"
              maxLength={120}
              disabled={isMinting}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Collection: <span className="font-mono">{collectionLabel}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? "Hide options" : "More options"}
            </Button>
          </div>

          {showAdvanced ? (
            <div className="space-y-4 rounded-xl border p-3">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Description</div>
                <Textarea
                  value={tokenDescription}
                  onChange={(e) => setTokenDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  maxLength={500}
                  disabled={isMinting}
                />
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Collection</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={collectionMode === "auto" ? "default" : "secondary"}
                    onClick={() => setCollectionMode("auto")}
                    disabled={isMinting}
                  >
                    Auto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={collectionMode === "existing" ? "default" : "secondary"}
                    onClick={() => setCollectionMode("existing")}
                    disabled={isMinting}
                  >
                    Existing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={collectionMode === "new" ? "default" : "secondary"}
                    onClick={() => setCollectionMode("new")}
                    disabled={isMinting}
                  >
                    New
                  </Button>
                </div>

                {collectionMode === "existing" ? (
                  <div className="space-y-2">
                    <Input
                      value={selectedCollectionAddress}
                      onChange={(e) => {
                        setSelectedCollectionRecordId(null);
                        setSelectedCollectionAddress(e.target.value);
                      }}
                      placeholder="0x… collection address"
                      disabled={isMinting}
                    />

                    {collections.isLoading ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" />
                        Loading your collections…
                      </div>
                    ) : collectionsList.length ? (
                      <div className="rounded-lg border p-2 space-y-2">
                        <div className="text-xs text-muted-foreground">Or pick one:</div>
                        <div className="space-y-1 max-h-40 overflow-auto">
                          {collectionsList.map((collection) => (
                            <button
                              key={collection.id}
                              type="button"
                              className="w-full text-left rounded-md px-2 py-1 hover:bg-muted text-sm"
                              onClick={() => {
                                setSelectedCollectionRecordId(collection.id);
                                setSelectedCollectionAddress(collection.address ?? "");
                              }}
                              disabled={!collection.address || isMinting}
                            >
                              <div className="font-medium">{collection.name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {collection.address ?? "No address"}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No collections yet.</div>
                    )}
                  </div>
                ) : null}

                {collectionMode === "new" ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="Collection name (optional)"
                      maxLength={120}
                      disabled={isMinting}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newCollectionSymbol}
                        onChange={(e) => setNewCollectionSymbol(e.target.value)}
                        placeholder="Symbol (optional)"
                        maxLength={16}
                        disabled={isMinting}
                      />
                      <Input
                        value={newCollectionMaxSupply}
                        onChange={(e) => setNewCollectionMaxSupply(e.target.value)}
                        placeholder="Max supply"
                        inputMode="numeric"
                        disabled={isMinting}
                      />
                    </div>
                    <Input
                      value={newCollectionContractUri}
                      onChange={(e) => setNewCollectionContractUri(e.target.value)}
                      placeholder="Contract URI (optional)"
                      disabled={isMinting}
                    />
                    <div className="text-xs text-muted-foreground">
                      We’ll deploy this collection when you mint.
                    </div>
                  </div>
                ) : null}

                {!factoryConfigured ? (
                  <div className="text-xs text-muted-foreground">
                    Minting is not configured yet. Set `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`.
                  </div>
                ) : null}
              </div>

              {exportedAsset?.metadataUri ? (
                <div className="rounded-lg border p-3 text-xs space-y-1">
                  <div className="font-medium">Token URI</div>
                  <div className="font-mono break-all">{exportedAsset.metadataUri}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {previewUrl ? (
            <div className="rounded-xl border overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="NFT preview" className="w-full h-auto" />
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-6 text-xs text-muted-foreground text-center">
              Preview appears after upload starts.
            </div>
          )}

          {!ipfsConfigured ? (
            <div className="text-xs text-muted-foreground">
              NFT export is temporarily unavailable. Ask an admin to configure IPFS.
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={onMintNow} disabled={!canMintNow}>
            {isMinting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Mint NFT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
