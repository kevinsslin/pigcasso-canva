"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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
import { MANTLE_EXPLORER_BASE_URL } from "@/features/printr/constants";

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

const isUserRejectedWalletAction = (error: unknown) => {
  let current: any = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const code = (current as any)?.code;
    if (code === 4001 || code === "ACTION_REJECTED") return true;

    const messageRaw =
      (typeof (current as any)?.shortMessage === "string" && (current as any).shortMessage) ||
      (typeof (current as any)?.message === "string" && (current as any).message) ||
      "";
    const message = messageRaw.toLowerCase();
    if (
      message.includes("user rejected") ||
      message.includes("rejected the request") ||
      message.includes("user denied") ||
      message.includes("denied transaction") ||
      message.includes("denied signature")
    ) {
      return true;
    }

    current = (current as any)?.cause;
  }
  return false;
};

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
  metadataUrl: string | null;
  imageUrl: string | null;
};

type MintView = "configure" | "progress";

type MintStepKey = "ipfs" | "collection" | "mint";
type MintStepStatus = "pending" | "active" | "done" | "skipped" | "error";

type MintStepsState = Record<MintStepKey, { status: MintStepStatus; detail?: string }>;

const getInitialMintSteps = (): MintStepsState => ({
  ipfs: { status: "pending" },
  collection: { status: "pending" },
  mint: { status: "pending" },
});

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

  const ipfsConfigured = me.data?.data.integrations.ipfs.configured;
  const uploadthingConfigured = me.data?.data.integrations.uploadthing.configured;

  const [tokenName, setTokenName] = useState("");
  const tokenNameTouchedRef = useRef(false);
  const [tokenDescription, setTokenDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintView, setMintView] = useState<MintView>("configure");
  const [mintSteps, setMintSteps] = useState<MintStepsState>(() => getInitialMintSteps());
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<{
    collectionAddress: `0x${string}`;
    txHash: `0x${string}`;
    tokenId: string | null;
    tokenUri: string;
  } | null>(null);

  const [collectionMode, setCollectionMode] = useState<"auto" | "existing" | "new">("auto");
  const [selectedCollectionAddress, setSelectedCollectionAddress] = useState("");
  const [selectedCollectionRecordId, setSelectedCollectionRecordId] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionSymbol, setNewCollectionSymbol] = useState("");
  const [newCollectionMaxSupply, setNewCollectionMaxSupply] = useState("10000");
  const [newCollectionContractUri, setNewCollectionContractUri] = useState("");

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [exportedAsset, setExportedAsset] = useState<ExportedAsset | null>(null);

  const factoryAddress = getFactoryAddress();
  const factoryConfigured = isEvmAddress(factoryAddress);

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

  useEffect(() => {
    if (!open) {
      setUploadedImageUrl(null);
      setExportedAsset(null);
      setTokenName("");
      tokenNameTouchedRef.current = false;
      setTokenDescription("");
      setShowAdvanced(false);
      setIsMinting(false);
      setMintView("configure");
      setMintSteps(getInitialMintSteps());
      setMintError(null);
      setMintResult(null);
      setLocalPreviewUrl(null);
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
    if (tokenNameTouchedRef.current) return;
    const pageLabel = activePage ? `Page ${activePage.index + 1}` : "NFT";
    setTokenName(`${projectName} · ${pageLabel}`);
  }, [activePage, open, projectName]);

  useEffect(() => {
    if (!open) return;
    if (!editor || !activePage) {
      setLocalPreviewUrl(null);
      return;
    }

    try {
      setLocalPreviewUrl(makeWorkspacePngDataUrl(editor, 0.75));
    } catch {
      setLocalPreviewUrl(null);
    }
  }, [activePage, editor, open]);

  const setMintStep = (key: MintStepKey, patch: Partial<MintStepsState[MintStepKey]>) => {
    setMintSteps((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isMinting) return;
    onOpenChange(nextOpen);
  };

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

  const exportToIpfs = async ({
    onProgress,
  }: {
    onProgress?: (detail: string) => void;
  }) => {
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

    onProgress?.("Uploading image…");
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
    onProgress?.("Pinning metadata to IPFS…");

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
      metadataUrl: asset.metadataUrl || null,
      imageUrl: asset.imageUrl || null,
    } satisfies ExportedAsset;

    setExportedAsset(next);
    return next;
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
    let deployed = false;
    if (collectionMode === "new") {
      const defaults = getAutoCollectionDefaults();
      const name = newCollectionName.trim() || defaults.name;
      const symbol = newCollectionSymbol.trim() || defaults.symbol;
      const supplyRaw = newCollectionMaxSupply.trim();
      const supplyParsed = Number(supplyRaw);
      const maxSupply = Number.isFinite(supplyParsed) && supplyParsed > 0 ? BigInt(supplyParsed) : defaults.maxSupply;
      const contractUri = newCollectionContractUri.trim();

      onProgress?.("Deploying collection…");
      deployed = true;
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

      return { address, recordId: record.data.id, deployed };
    }

    if (collectionMode === "existing") {
      const trimmed = selectedCollectionAddress.trim();
      if (trimmed && !isEvmAddress(trimmed)) {
        throw new Error("Invalid collection address.");
      }
      if (trimmed && isEvmAddress(trimmed)) {
        return { address: trimmed as `0x${string}`, recordId: selectedCollectionRecordId, deployed };
      }
    }

    if (defaultCollection) {
      return { address: defaultCollection.address, recordId: defaultCollection.id, deployed };
    }

    const defaults = getAutoCollectionDefaults();
    onProgress?.("Deploying collection…");
    deployed = true;
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

    return { address, recordId: record.data.id, deployed };
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

    const alreadyExported = Boolean(exportedAsset?.metadataUri);
    setMintView("progress");
    setMintError(null);
    setMintResult(null);
    setMintSteps(() => ({
      ipfs: alreadyExported ? { status: "done", detail: "Already pinned to IPFS." } : { status: "active", detail: "Preparing export…" },
      collection: { status: "pending" },
      mint: { status: "pending" },
    }));
    setIsMinting(true);

    let currentStep: MintStepKey = alreadyExported ? "collection" : "ipfs";

    try {
      const asset = alreadyExported
        ? exportedAsset
        : await exportToIpfs({
            onProgress: (detail) => setMintStep("ipfs", { status: "active", detail }),
          });
      if (!asset?.metadataUri) {
        throw new Error("Missing token URI. Please try again.");
      }

      if (!alreadyExported) {
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
      setMintStep("collection", {
        status: "done",
        detail: collection.deployed ? `Deployed ${collection.address}` : `Using ${collection.address}`,
      });

      currentStep = "mint";
      setMintStep("mint", { status: "active", detail: "Minting NFT…" });
      const tokenUri =
        asset.metadataUrl ||
        ipfsToHttpUrl(asset.metadataUri) ||
        asset.metadataUri;
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

      setMintStep("mint", { status: "active", detail: "Finalizing…" });
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

      setMintResult({ collectionAddress: collection.address, txHash: hash, tokenId, tokenUri });
      setMintStep("mint", { status: "done", detail: tokenId ? `Minted token #${tokenId}.` : "NFT minted." });
      const explorerBase = MANTLE_EXPLORER_BASE_URL.replace(/\/$/, "");
      const txUrl = `${explorerBase}/tx/${encodeURIComponent(hash)}`;
      const tokenUrl = tokenId
        ? `${explorerBase}/token/${encodeURIComponent(collection.address)}?a=${encodeURIComponent(tokenId)}`
        : `${explorerBase}/address/${encodeURIComponent(collection.address)}`;
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

  const previewUrl =
    ipfsToHttpUrl(exportedAsset?.imageUri) ??
    exportedAsset?.imageUrl ??
    uploadedImageUrl ??
    localPreviewUrl;
  const imageUrlForDisplay = exportedAsset?.imageUrl
    ? exportedAsset.imageUrl
    : exportedAsset?.imageUri
      ? ipfsToHttpUrl(exportedAsset.imageUri) ?? exportedAsset.imageUri
      : null;
  const tokenUriForDisplay = exportedAsset?.metadataUrl
    ? exportedAsset.metadataUrl
    : exportedAsset?.metadataUri
      ? ipfsToHttpUrl(exportedAsset.metadataUri) ?? exportedAsset.metadataUri
      : null;

  const collectionLabel =
    collectionMode === "existing" && isEvmAddress(selectedCollectionAddress.trim())
      ? selectedCollectionAddress.trim()
      : defaultCollection?.name ?? "Auto";

  const canMintNow =
    Boolean(editor) &&
    Boolean(activePage) &&
    ipfsConfigured === true &&
    uploadthingConfigured === true &&
    factoryConfigured &&
    Boolean(preferredWallet) &&
    !isMinting &&
    !exportAsset.isPending &&
    !updateAsset.isPending &&
    !createCollectionRecord.isPending;

  const mintDisabledReasons = useMemo(() => {
    if (canMintNow) return [];

    const reasons: string[] = [];
    if (!editor) reasons.push("Editor is still loading. Please wait a moment.");
    if (!activePage) reasons.push("Select a page to mint.");
    if (!preferredWallet) reasons.push("Connect an Ethereum wallet to mint.");
    if (!factoryConfigured) reasons.push("NFT minting is not configured (missing `NEXT_PUBLIC_NFT_FACTORY_ADDRESS`).");
    if (ipfsConfigured === undefined) {
      reasons.push("Loading IPFS status…");
    } else if (!ipfsConfigured) {
      reasons.push("IPFS pinning is not configured (missing `PINATA_JWT` or Pinata API key/secret).");
    }
    if (uploadthingConfigured === undefined) {
      reasons.push("Loading UploadThing status…");
    } else if (!uploadthingConfigured) {
      reasons.push("Uploads are not configured (missing `UPLOADTHING_TOKEN`).");
    }
    if (isMinting) reasons.push("Minting is already in progress.");
    if (exportAsset.isPending || updateAsset.isPending || createCollectionRecord.isPending) {
      reasons.push("Please wait for the current request to finish.");
    }

    return reasons;
  }, [
    activePage,
    canMintNow,
    createCollectionRecord.isPending,
    editor,
    exportAsset.isPending,
    factoryConfigured,
    ipfsConfigured,
    isMinting,
    preferredWallet,
    updateAsset.isPending,
    uploadthingConfigured,
  ]);

  const mintDebugRows = useMemo(() => {
    const rows = [
      {
        label: "Editor ready",
        ok: Boolean(editor),
        value: editor ? "Yes" : "No",
      },
      {
        label: "Selected page",
        ok: Boolean(activePage),
        value: activePage ? `#${activePage.index + 1} (${activePage.id})` : "None",
      },
      {
        label: "UploadThing configured",
        ok: uploadthingConfigured === true,
        value:
          uploadthingConfigured === undefined
            ? "Loading…"
            : uploadthingConfigured
              ? "Yes"
              : "No",
      },
      {
        label: "IPFS (Pinata) configured",
        ok: ipfsConfigured === true,
        value:
          ipfsConfigured === undefined
            ? "Loading…"
            : ipfsConfigured
              ? "Yes"
              : "No",
      },
      {
        label: "NFT factory address",
        ok: factoryConfigured,
        value: factoryAddress || "Missing",
      },
      {
        label: "Connected wallets (session)",
        ok: connectedEthereumWallets.length > 0,
        value: connectedEthereumWallets.length
          ? connectedEthereumWallets.map((wallet) => wallet.address).join(", ")
          : "None",
      },
      {
        label: "Signing wallet",
        ok: Boolean(preferredWallet),
        value: preferredWallet?.address ?? "None",
      },
      {
        label: "Wallets (server)",
        ok: true,
        value: [
          externalWalletAddress ? `external=${externalWalletAddress}` : null,
          embeddedWalletAddress ? `embedded=${embeddedWalletAddress}` : null,
        ]
          .filter(Boolean)
          .join(", ") || "None",
      },
      {
        label: "Pending state",
        ok:
          !isMinting &&
          !exportAsset.isPending &&
          !updateAsset.isPending &&
          !createCollectionRecord.isPending,
        value: [
          isMinting ? "minting" : null,
          exportAsset.isPending ? "exportAsset" : null,
          updateAsset.isPending ? "updateAsset" : null,
          createCollectionRecord.isPending ? "createCollection" : null,
        ]
          .filter(Boolean)
          .join(", ") || "idle",
      },
      {
        label: "Target chain",
        ok: true,
        value: `Mantle (${mantle.id})`,
      },
    ];

    return rows;
  }, [
    activePage,
    connectedEthereumWallets,
    createCollectionRecord.isPending,
    editor,
    embeddedWalletAddress,
    exportAsset.isPending,
    externalWalletAddress,
    factoryAddress,
    factoryConfigured,
    ipfsConfigured,
    isMinting,
    preferredWallet,
    updateAsset.isPending,
    uploadthingConfigured,
  ]);

  const mintStepList = [
    { key: "ipfs" as const, label: "Upload to IPFS" },
    { key: "collection" as const, label: "Prepare collection" },
    { key: "mint" as const, label: "Mint" },
  ];

  const renderStepIcon = (status: MintStepStatus, stepNumber: number) => {
    if (status === "active") {
      return (
        <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-primary" />
        </div>
      );
    }
    if (status === "done") {
      return <CheckCircle2 className="size-6 text-green-500" />;
    }
    if (status === "skipped") {
      return <CheckCircle2 className="size-6 text-muted-foreground" />;
    }
    if (status === "error") {
      return <AlertTriangle className="size-6 text-destructive" />;
    }
    return (
      <div className="size-6 rounded-full border flex items-center justify-center text-xs font-medium text-muted-foreground">
        {stepNumber}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Mint as NFT</DialogTitle>
          <DialogDescription>
            {mintView === "configure"
              ? "Review details, then mint. We’ll only upload to IPFS after you confirm."
              : "Keep this window open while we complete the steps below."}
          </DialogDescription>
        </DialogHeader>

        {mintView === "progress" ? (
          <div className="space-y-4">
            <div className="rounded-xl border p-3 text-sm">
              <div className="font-medium">{projectName}</div>
              <div className="text-xs text-muted-foreground">
                {activePage ? `Page ${activePage.index + 1}` : "Select a page"}
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-3">
              <div className="text-sm font-medium">Progress</div>
              <ol className="space-y-3">
                {mintStepList.map((step, index) => {
                  const state = mintSteps[step.key];
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      {renderStepIcon(state.status, index + 1)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{step.label}</div>
                        {state.detail ? (
                          <div className="text-xs text-muted-foreground break-words">{state.detail}</div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {previewUrl ? (
              <div className="rounded-xl border overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="NFT preview" className="w-full h-auto" />
              </div>
            ) : null}

            {exportedAsset?.metadataUri ? (
              <div className="rounded-lg border p-3 text-xs space-y-1">
                <div className="font-medium">Metadata URL (tokenURI)</div>
                <div className="font-mono break-all">{tokenUriForDisplay}</div>
              </div>
            ) : null}

            {imageUrlForDisplay ? (
              <div className="rounded-lg border p-3 text-xs space-y-1">
                <div className="font-medium">Image URL</div>
                <div className="font-mono break-all">{imageUrlForDisplay}</div>
              </div>
            ) : null}

            {mintResult ? (
              <div className="rounded-lg border p-3 text-xs space-y-1">
                <div className="font-medium">Mint result</div>
                <div className="font-mono break-all">Collection: {mintResult.collectionAddress}</div>
                <div className="font-mono break-all">Tx: {mintResult.txHash}</div>
                <div className="font-mono break-all">Token ID: {mintResult.tokenId ?? "Unknown"}</div>
                <div className="font-mono break-all">Token URI: {mintResult.tokenUri}</div>
              </div>
            ) : null}

            {mintError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
                {mintError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (isMinting) return;
                  if (mintResult) {
                    onOpenChange(false);
                    return;
                  }
                  setMintView("configure");
                }}
                disabled={isMinting}
              >
                {mintResult ? "Close" : "Back"}
              </Button>
              {!isMinting && !mintResult && mintError ? (
                <Button type="button" onClick={onMintNow} disabled={!canMintNow}>
                  Retry
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        ) : (
          <>
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
                  onChange={(e) => {
                    tokenNameTouchedRef.current = true;
                    setTokenName(e.target.value);
                  }}
                  placeholder="Give your NFT a name (optional)"
                  maxLength={120}
                  disabled={isMinting}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Mint to: <span className="font-mono">{collectionLabel}</span>
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

              <div className="text-[11px] text-muted-foreground">
                Your NFTs are minted into a collection contract. Each mint creates a unique token (NFT).
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
                    <div className="text-sm font-medium">NFT contract</div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={collectionMode === "auto" ? "default" : "secondary"}
                        onClick={() => setCollectionMode("auto")}
                        disabled={isMinting}
                      >
                        Default
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={collectionMode === "existing" ? "default" : "secondary"}
                        onClick={() => setCollectionMode("existing")}
                        disabled={isMinting}
                      >
                        Existing contract
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={collectionMode === "new" ? "default" : "secondary"}
                        onClick={() => setCollectionMode("new")}
                        disabled={isMinting}
                      >
                        New contract
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
                          placeholder="0x… contract address"
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
                          placeholder="Contract name (optional)"
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
                          We’ll deploy this contract when you mint.
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
                      <div className="font-medium">Metadata URL (tokenURI)</div>
                      <div className="font-mono break-all">{tokenUriForDisplay}</div>
                    </div>
                  ) : null}

                  {imageUrlForDisplay ? (
                    <div className="rounded-lg border p-3 text-xs space-y-1">
                      <div className="font-medium">Image URL</div>
                      <div className="font-mono break-all">{imageUrlForDisplay}</div>
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
                  Preview is unavailable right now.
                </div>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                {preferredWallet ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>Signing wallet</span>
                    <span className="font-mono">{preferredWallet.address}</span>
                  </div>
                ) : null}

                {mintDisabledReasons.length ? (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start gap-2 text-foreground">
                      <AlertTriangle className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="font-medium">Mint NFT is disabled</div>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      {mintDisabledReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <details className="rounded-lg border bg-background/60 p-3" open>
                      <summary className="cursor-pointer text-xs font-medium text-foreground">
                        Debug details
                      </summary>
                      <div className="mt-3 space-y-2 text-xs">
                        {mintDebugRows.map((row) => (
                          <div key={row.label} className="grid grid-cols-1 gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{row.label}</span>
                              <span className={row.ok ? "text-green-600" : "text-destructive"}>
                                {row.ok ? "OK" : "Blocked"}
                              </span>
                            </div>
                            <div className="font-mono break-all text-muted-foreground">
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isMinting}>
                Close
              </Button>
              <Button type="button" onClick={onMintNow} disabled={!canMintNow}>
                {isMinting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                Mint NFT
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
