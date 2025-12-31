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

  const [collectionMode, setCollectionMode] = useState<"existing" | "new">("existing");
  const [selectedCollectionAddress, setSelectedCollectionAddress] = useState("");
  const [selectedCollectionRecordId, setSelectedCollectionRecordId] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionSymbol, setNewCollectionSymbol] = useState("");
  const [newCollectionMaxSupply, setNewCollectionMaxSupply] = useState("100");
  const [newCollectionContractUri, setNewCollectionContractUri] = useState("");

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [exportedAsset, setExportedAsset] = useState<{
    id: string;
    metadataUri: string | null;
    imageUri: string | null;
  } | null>(null);

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
      setSelectedCollectionRecordId(null);
      setSelectedCollectionAddress("");
      setTokenName("");
      setTokenDescription("");
      setCollectionMode("existing");
      setNewCollectionName("");
      setNewCollectionSymbol("");
      setNewCollectionMaxSupply("100");
      setNewCollectionContractUri("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const pageLabel = activePage ? `Page ${activePage.index + 1}` : "NFT";
    setTokenName((prev) => (prev ? prev : `${projectName} · ${pageLabel}`));
  }, [activePage, open, projectName]);

  const canPrepare =
    Boolean(editor) && Boolean(activePage) && ipfsConfigured && !exportAsset.isPending;

  const canMint =
    Boolean(exportedAsset?.metadataUri) &&
    factoryConfigured &&
    Boolean(preferredWallet) &&
    !updateAsset.isPending;

  const resolveActiveCollection = () => {
    if (collectionMode === "existing") {
      const trimmed = selectedCollectionAddress.trim();
      return isEvmAddress(trimmed) ? (trimmed as `0x${string}`) : null;
    }
    return null;
  };

  const onPrepareIpfs = async () => {
    if (!editor || !activePage) return;
    if (!ipfsConfigured) {
      toast.error("IPFS pinning is not configured.");
      return;
    }

    const toastId = toast.loading("Uploading NFT image…");

    try {
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
      setExportedAsset({
        id: asset.id,
        metadataUri: asset.metadataUri,
        imageUri: asset.imageUri,
      });

      toast.success("IPFS ready.", { id: toastId, duration: 3000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export NFT", {
        id: toastId,
        duration: 5000,
      });
    }
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

    return { walletClient, publicClient, provider };
  };

  const onDeployCollection = async () => {
    if (!factoryConfigured) {
      toast.error("NFT factory is not configured.");
      return;
    }

    const name = newCollectionName.trim();
    const symbol = newCollectionSymbol.trim();
    const supplyRaw = newCollectionMaxSupply.trim();
    const maxSupply = Number(supplyRaw);

    if (!name || !symbol) {
      toast.error("Collection name and symbol are required.");
      return;
    }

    if (!Number.isFinite(maxSupply) || maxSupply <= 0) {
      toast.error("Max supply must be a positive number.");
      return;
    }

    const toastId = toast.loading("Deploying collection…");

    try {
      const { walletClient, publicClient } = await ensureClients();
      const contractUri = newCollectionContractUri.trim();

      const hash = await walletClient.writeContract({
        address: factoryAddress as `0x${string}`,
        abi: pigcassoNftFactoryAbi,
        functionName: "createCollection",
        args: [name, symbol, BigInt(maxSupply), contractUri],
      });

      toast.loading("Waiting for confirmation…", { id: toastId });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const parsed = parseEventLogs({
        abi: pigcassoNftFactoryAbi,
        logs: receipt.logs,
      }).find((log) => log.eventName === "CollectionCreated");

      const address = parsed?.args?.collection;
      if (!address || typeof address !== "string") {
        throw new Error("CollectionCreated event not found.");
      }

      const record = await createCollectionRecord.mutateAsync({
        name,
        symbol,
        contractUri: contractUri || undefined,
        address,
      });

      setSelectedCollectionAddress(address);
      setSelectedCollectionRecordId(record.data.id);
      setCollectionMode("existing");

      toast.success("Collection deployed.", { id: toastId, duration: 3500 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deploy collection", {
        id: toastId,
        duration: 5000,
      });
    }
  };

  const onMint = async () => {
    if (!exportedAsset?.metadataUri) {
      toast.error("Missing token URI.");
      return;
    }

    const collectionAddress = resolveActiveCollection();
    if (!collectionAddress) {
      toast.error("Select a valid collection address.");
      return;
    }

    const toastId = toast.loading("Minting NFT…");

    try {
      const { walletClient, publicClient } = await ensureClients();

      const hash = await walletClient.writeContract({
        address: collectionAddress,
        abi: pigcassoCollectionAbi,
        functionName: "mint",
        args: [walletClient.account.address, exportedAsset.metadataUri],
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

      await updateAsset.mutateAsync({
        id: exportedAsset.id,
        values: {
          status: "minted",
          collectionId: selectedCollectionRecordId,
          collectionAddress,
          tokenId,
          txHash: hash,
        },
      });

      toast.success("Minted.", { id: toastId, duration: 3500 });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mint", {
        id: toastId,
        duration: 5000,
      });
    }
  };

  const previewUrl = ipfsToHttpUrl(exportedAsset?.imageUri) ?? uploadedImageUrl;

  const collectionsList = collections.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export as NFT</DialogTitle>
          <DialogDescription>
            Upload → pin to IPFS → mint on Mantle. You can mint after deploying a collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <div className="font-medium">{projectName}</div>
            <div className="text-xs text-muted-foreground">
              {activePage ? `Page ${activePage.index + 1}` : "Select a page"}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Token metadata</div>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="NFT name"
              maxLength={120}
              disabled={exportAsset.isPending}
            />
            <Textarea
              value={tokenDescription}
              onChange={(e) => setTokenDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              maxLength={500}
              disabled={exportAsset.isPending}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Collection</div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={collectionMode === "existing" ? "default" : "secondary"}
                onClick={() => setCollectionMode("existing")}
              >
                Use existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant={collectionMode === "new" ? "default" : "secondary"}
                onClick={() => setCollectionMode("new")}
              >
                Create new
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
                          disabled={!collection.address}
                        >
                          <div className="font-medium">{collection.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {collection.address ?? "Deploy to get an address"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No collections yet. Create one below.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name"
                  maxLength={120}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={newCollectionSymbol}
                    onChange={(e) => setNewCollectionSymbol(e.target.value)}
                    placeholder="Symbol"
                    maxLength={16}
                  />
                  <Input
                    value={newCollectionMaxSupply}
                    onChange={(e) => setNewCollectionMaxSupply(e.target.value)}
                    placeholder="Max supply"
                    inputMode="numeric"
                  />
                  <Button type="button" variant="secondary" onClick={onDeployCollection} disabled={!factoryConfigured}>
                    Deploy
                  </Button>
                </div>
                <Input
                  value={newCollectionContractUri}
                  onChange={(e) => setNewCollectionContractUri(e.target.value)}
                  placeholder="Contract URI (optional)"
                />
                {!factoryConfigured ? (
                  <div className="text-xs text-muted-foreground">
                    Minting is not configured yet. Set `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {previewUrl ? (
            <div className="rounded-lg border overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="NFT preview" className="w-full h-auto" />
            </div>
          ) : null}

          {exportedAsset?.metadataUri ? (
            <div className="rounded-lg border p-3 text-xs space-y-1">
              <div className="font-medium">Token URI</div>
              <div className="font-mono break-all">{exportedAsset.metadataUri}</div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={onPrepareIpfs} disabled={!canPrepare}>
            {exportAsset.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Upload & Pin
          </Button>
          <Button type="button" onClick={onMint} disabled={!canMint}>
            Mint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
