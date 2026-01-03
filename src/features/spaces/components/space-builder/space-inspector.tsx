import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader, Plus, RefreshCcw, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { getSpaceModuleDefinition } from "@/features/spaces/lib/space-modules";
import type { SpaceBlock, SpaceLink, SpaceNftItem } from "@/features/spaces/lib/space-document";
import { useMe } from "@/features/auth/api/use-me";
import { getAuthToken } from "@/lib/auth-token";
import { uploadFiles } from "@/lib/uploadthing";
import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";
import { useResolveSpaceNft } from "@/features/spaces/api/use-resolve-space-nft";

type InspectorProps = {
  block: SpaceBlock;
  onChange: (next: SpaceBlock) => void;
  onDelete: () => void;
};

const NFT_CHAIN_OPTIONS = [
  { chainId: 5000, label: "Mantle" },
  { chainId: 1, label: "Ethereum" },
  { chainId: 8453, label: "Base" },
  { chainId: 42161, label: "Arbitrum" },
  { chainId: 43114, label: "Avalanche" },
  { chainId: 56, label: "BNB Chain" },
  { chainId: 143, label: "Monad" },
] as const;

const getChainLabel = (chainId: number) =>
  NFT_CHAIN_OPTIONS.find((option) => option.chainId === chainId)?.label ?? `Chain ${chainId}`;

const UploadImageField = ({
  label,
  description,
  value,
  onChange,
  uploadthingConfigured,
  slug,
  maxBytes,
  maxFileSizeLabel,
  toastId,
}: {
  label: string;
  description?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadthingConfigured: boolean | undefined;
  slug: "avatarUploader" | "imageUploader";
  maxBytes: number;
  maxFileSizeLabel: string;
  toastId: string;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
      uploadAbortRef.current = null;

      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };
  }, []);

  const onUpload = async (file: File) => {
    if (uploadthingConfigured !== true) {
      toast.error("Uploads are currently unavailable.");
      return;
    }

    if (file.size > maxBytes) {
      toast.error(`File is too large. Max size is ${maxFileSizeLabel}.`);
      return;
    }

    uploadAbortRef.current?.abort();

    const abortController = new AbortController();
    uploadAbortRef.current = abortController;

    setUploading(true);
    toast.loading("Uploading image…", { id: toastId, duration: Infinity });

    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
    }
    uploadTimeoutRef.current = setTimeout(() => {
      abortController.abort();
      toast.error("Upload is taking longer than expected. Please try again.", { id: toastId, duration: 4000 });
      setUploading(false);
      uploadTimeoutRef.current = null;
    }, 60_000);

    try {
      const token = await getAuthToken({
        maxWaitMs: 2000,
        retries: 4,
        retryDelayMs: 200,
      });

      if (!token) {
        throw new Error("Missing auth token. Please sign in again.");
      }

      const uploaded = await uploadFiles(slug, {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      });

      const url =
        uploaded?.[0]?.ufsUrl ??
        uploaded?.[0]?.url ??
        (uploaded?.[0] as { serverData?: { url?: string } } | undefined)?.serverData?.url;

      if (!url) {
        throw new Error("Upload finished but no URL was returned.");
      }

      onChange(url);
      toast.success("Upload complete.", { id: toastId, duration: 3000 });
    } catch (err) {
      if (abortController.signal.aborted) {
        return;
      }
      toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel }), { id: toastId, duration: 4000 });
    } finally {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      uploadAbortRef.current = null;
      setUploading(false);
    }
  };

  const uploadEnabled = uploadthingConfigured === true && !uploading;

  const helperText =
    uploadthingConfigured === undefined
      ? "Checking upload configuration…"
      : uploadthingConfigured
        ? description ?? `PNG/JPG up to ${maxFileSizeLabel}.`
        : "Uploads are currently unavailable.";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {value ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-red-500 hover:text-red-600"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <X className="mr-1 size-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="size-14 overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10" />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void onUpload(file);
          }}
        />

        <Button
          type="button"
          variant="secondary"
          className="text-sm font-medium"
          disabled={!uploadEnabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
          {value ? "Replace" : "Upload"}
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground">{helperText}</div>
    </div>
  );
};

const BioInspectorFields = ({
  block,
  onChange,
  uploadthingConfigured,
}: {
  block: Extract<SpaceBlock, { type: "bio" }>;
  onChange: InspectorProps["onChange"];
  uploadthingConfigured: boolean | undefined;
}) => {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Display name</div>
        <Input
          value={block.data.displayName}
          onChange={(e) => onChange({ ...block, data: { ...block.data, displayName: e.target.value } })}
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Subtitle</div>
        <Input
          value={block.data.subtitle ?? ""}
          onChange={(e) => onChange({ ...block, data: { ...block.data, subtitle: e.target.value } })}
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Bio</div>
        <Textarea
          value={block.data.bio ?? ""}
          onChange={(e) => onChange({ ...block, data: { ...block.data, bio: e.target.value } })}
          rows={4}
        />
      </div>
      <div>
        <UploadImageField
          label="Avatar image"
          value={block.data.avatarUrl ?? null}
          onChange={(url) => onChange({ ...block, data: { ...block.data, avatarUrl: url } })}
          uploadthingConfigured={uploadthingConfigured}
          slug="avatarUploader"
          maxBytes={8 * 1024 * 1024}
          maxFileSizeLabel="8MB"
          toastId="pigcasso:space:upload-avatar"
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Status badge</div>
        <Input
          value={block.data.statusLabel ?? ""}
          onChange={(e) => onChange({ ...block, data: { ...block.data, statusLabel: e.target.value } })}
          placeholder="Available"
        />
      </div>
    </div>
  );
};

const LinksInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "links" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Title</div>
          <Input
            value={block.data.title}
            onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
          />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Description</div>
          <Input
            value={block.data.description ?? ""}
            onChange={(e) => onChange({ ...block, data: { ...block.data, description: e.target.value } })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Links</div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const nextLinks = [...(block.data.links as SpaceLink[]), { label: "New link", url: "https://example.com" }];
              onChange({ ...block, data: { ...block.data, links: nextLinks } });
            }}
          >
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>

        <div className="space-y-3">
          {(block.data.links as SpaceLink[]).map((link, index) => (
            <Card key={`${link.url}-${index}`} className="p-3">
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Label</div>
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const next = [...(block.data.links as SpaceLink[])];
                        next[index] = { ...next[index], label: e.target.value };
                        onChange({ ...block, data: { ...block.data, links: next } });
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">URL</div>
                    <Input
                      value={link.url}
                      onChange={(e) => {
                        const next = [...(block.data.links as SpaceLink[])];
                        next[index] = { ...next[index], url: e.target.value };
                        onChange({ ...block, data: { ...block.data, links: next } });
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="justify-start text-red-500 hover:text-red-600"
                  onClick={() => {
                    const next = [...(block.data.links as SpaceLink[])];
                    next.splice(index, 1);
                    onChange({ ...block, data: { ...block.data, links: next } });
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const ImageInspectorFields = ({
  block,
  onChange,
  uploadthingConfigured,
}: {
  block: Extract<SpaceBlock, { type: "image" }>;
  onChange: InspectorProps["onChange"];
  uploadthingConfigured: boolean | undefined;
}) => {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Title</div>
        <Input
          value={block.data.title ?? ""}
          onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
        />
      </div>
      <div>
        <UploadImageField
          label="Image"
          value={block.data.imageUrl ?? null}
          onChange={(url) => onChange({ ...block, data: { ...block.data, imageUrl: url } })}
          uploadthingConfigured={uploadthingConfigured}
          slug="imageUploader"
          maxBytes={4 * 1024 * 1024}
          maxFileSizeLabel="4MB"
          toastId="pigcasso:space:upload-image"
        />
      </div>
    </div>
  );
};

const TextInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "text" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Title</div>
        <Input
          value={block.data.title}
          onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Body</div>
        <Textarea
          value={block.data.body}
          onChange={(e) => onChange({ ...block, data: { ...block.data, body: e.target.value } })}
          rows={6}
        />
      </div>
    </div>
  );
};

const StatInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "stat" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Label</div>
        <Input
          value={block.data.label}
          onChange={(e) => onChange({ ...block, data: { ...block.data, label: e.target.value } })}
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Value</div>
        <Input
          value={block.data.value}
          onChange={(e) => onChange({ ...block, data: { ...block.data, value: e.target.value } })}
        />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Tone</div>
        <div className="grid grid-cols-3 gap-2">
          {(["secondary", "primary", "accent"] as const).map((tone) => (
            <Button
              key={tone}
              type="button"
              variant={block.data.tone === tone ? "default" : "secondary"}
              size="sm"
              onClick={() => onChange({ ...block, data: { ...block.data, tone } })}
            >
              {tone}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const NftShowcaseInspectorFields = ({
  block,
  onChange,
  walletAddresses,
}: {
  block: Extract<SpaceBlock, { type: "nftShowcase" }>;
  onChange: InspectorProps["onChange"];
  walletAddresses: string[];
}) => {
  const resolveMutation = useResolveSpaceNft();
  const [chainId, setChainId] = useState<number>(NFT_CHAIN_OPTIONS[0].chainId);
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [walletAddress, setWalletAddress] = useState<string>("");

  const addOrUpdateItem = (item: SpaceNftItem) => {
    const nextItems = [...(block.data.items as SpaceNftItem[])];
    const key = `${item.chainId}:${item.contractAddress.toLowerCase()}:${item.tokenId}`;
    const index = nextItems.findIndex(
      (entry) =>
        `${entry.chainId}:${entry.contractAddress.toLowerCase()}:${entry.tokenId}` === key,
    );

    if (index === -1) {
      if (nextItems.length >= 36) {
        toast.error("NFT showcase is full (max 36 items).");
        return;
      }
      nextItems.unshift(item);
    } else {
      nextItems[index] = item;
    }

    onChange({
      ...block,
      data: {
        ...block.data,
        items: nextItems,
      },
    });
  };

  const onResolve = async (params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    walletAddress?: string | null;
  }) => {
    const toastId = `pigcasso:space:nft-resolve:${params.chainId}:${params.contractAddress}:${params.tokenId}`;
    toast.loading("Loading NFT metadata…", { id: toastId, duration: Infinity });

    try {
      const response = await resolveMutation.mutateAsync({
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        tokenId: params.tokenId,
        walletAddress: params.walletAddress ?? null,
      });

      const resolved = response.data;

      if (!resolved.ownedBy) {
        toast.error("Ownership not verified. Link the wallet that holds this NFT.", { id: toastId, duration: 4500 });
        return;
      }

      addOrUpdateItem({
        chainId: resolved.chainId,
        contractAddress: resolved.contractAddress,
        tokenId: resolved.tokenId,
        name: resolved.name,
        imageUrl: resolved.imageUrl,
        tokenUri: resolved.tokenUri,
        tokenStandard: resolved.tokenStandard,
        ownedBy: resolved.ownedBy,
        resolvedAt: new Date().toISOString(),
      });

      toast.success("NFT added.", { id: toastId, duration: 2500 });
      setContractAddress("");
      setTokenId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load NFT metadata", { id: toastId, duration: 4500 });
    }
  };

  const items = (block.data.items as SpaceNftItem[]) ?? [];
  const hasLinkedWallet = walletAddresses.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Title</div>
          <Input
            value={block.data.title}
            onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
          />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Description</div>
          <Input
            value={block.data.description ?? ""}
            onChange={(e) => onChange({ ...block, data: { ...block.data, description: e.target.value } })}
          />
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add NFT</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Paste contract + tokenId. We will verify ownership using your linked wallets.
          </div>
        </div>

        {!hasLinkedWallet ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            Link a wallet first to verify ownership.
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Chain</div>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={chainId}
                onChange={(event) => setChainId(Number(event.target.value))}
              >
                {NFT_CHAIN_OPTIONS.map((option) => (
                  <option key={option.chainId} value={option.chainId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Verify wallet</div>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
              >
                <option value="">Any linked wallet</option>
                {walletAddresses.map((address) => (
                  <option key={address} value={address}>
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-muted-foreground">Contract address</div>
            <Input
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x…"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">Token ID</div>
            <Input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="123" />
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95"
          disabled={!contractAddress.trim() || !tokenId.trim() || resolveMutation.isPending || !hasLinkedWallet}
          onClick={() => void onResolve({ chainId, contractAddress, tokenId, walletAddress: walletAddress || null })}
        >
          {resolveMutation.isPending ? <Loader className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
          Verify & add
        </Button>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</div>
          <div className="text-xs text-muted-foreground">{items.length}/36</div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
            No NFTs added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={`${item.chainId}-${item.contractAddress}-${item.tokenId}`} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/30">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-900">
                      {item.name ?? `Token #${item.tokenId}`}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 font-semibold">
                        {getChainLabel(item.chainId)}
                      </span>
                      <span className="truncate font-mono">
                        {item.contractAddress.slice(0, 6)}…{item.contractAddress.slice(-4)}
                      </span>
                      {item.ownedBy ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="size-3" />
                          Owned
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2"
                      disabled={resolveMutation.isPending}
                      onClick={() =>
                        void onResolve({
                          chainId: item.chainId,
                          contractAddress: item.contractAddress,
                          tokenId: item.tokenId,
                          walletAddress: walletAddress || null,
                        })
                      }
                    >
                      <RefreshCcw className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-500 hover:text-red-600"
                      onClick={() => {
                        const next = items.filter(
                          (entry) =>
                            !(
                              entry.chainId === item.chainId &&
                              entry.contractAddress.toLowerCase() === item.contractAddress.toLowerCase() &&
                              entry.tokenId === item.tokenId
                            ),
                        );
                        onChange({ ...block, data: { ...block.data, items: next } });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SpaceInspector = ({ block, onChange, onDelete }: InspectorProps) => {
  const moduleDefinition = getSpaceModuleDefinition(block.type);
  const me = useMe();
  const uploadthingConfigured = me.data?.data.integrations?.uploadthing.configured;
  const walletAddresses = Array.from(
    new Set(
      [
        me.data?.data.user.wallets.external,
        ...(me.data?.data.user.wallets.externals ?? []),
        me.data?.data.user.wallets.embedded,
      ]
        .filter((value): value is string => Boolean(value))
        .map((addr) => addr.trim())
        .filter(Boolean)
        .map((addr) => addr.toLowerCase()),
    ),
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Editing
            </div>
            <div className="mt-1 flex items-center gap-2">
              {moduleDefinition ? <moduleDefinition.icon className="size-4 text-primary" /> : null}
              <div className="text-base font-bold text-gray-900 truncate">
                {moduleDefinition?.label ?? block.type}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={onDelete}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Module visibility</div>
                <div className="text-xs text-muted-foreground">Show this module on your public Space.</div>
              </div>
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  block.isVisible ? "bg-primary" : "bg-muted",
                )}
                onClick={() => onChange({ ...block, isVisible: !block.isVisible })}
              >
                <span
                  className={cn(
                    "inline-block size-4 transform rounded-full bg-white transition-transform",
                    block.isVisible ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </Card>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>

            {block.type === "bio" ? (
              <BioInspectorFields block={block} onChange={onChange} uploadthingConfigured={uploadthingConfigured} />
            ) : block.type === "links" ? (
              <LinksInspectorFields block={block} onChange={onChange} />
            ) : block.type === "image" ? (
              <ImageInspectorFields block={block} onChange={onChange} uploadthingConfigured={uploadthingConfigured} />
            ) : block.type === "text" ? (
              <TextInspectorFields block={block} onChange={onChange} />
            ) : block.type === "stat" ? (
              <StatInspectorFields block={block} onChange={onChange} />
            ) : block.type === "nftShowcase" ? (
              <NftShowcaseInspectorFields block={block} onChange={onChange} walletAddresses={walletAddresses} />
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
