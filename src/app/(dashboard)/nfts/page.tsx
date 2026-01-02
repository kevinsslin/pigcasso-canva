"use client";

import Image from "next/image";
import { Boxes, ExternalLink, Loader, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useListNftAssets } from "@/features/nfts/api/use-list-assets";
import { useListNftCollections } from "@/features/nfts/api/use-list-collections";
import { ipfsToHttpUrl } from "@/features/nfts/ipfs";
import { buildNftMarketplaceUrl, getNftMarketplaceLabel } from "@/features/nfts/marketplace";
import { MANTLE_EXPLORER_BASE_URL } from "@/features/printr/constants";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const shortHash = (value: string, head = 6, tail = 4) => {
  const trimmed = value.trim();
  if (trimmed.length <= head + tail) return trimmed;
  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
};

export default function NftsPage() {
  const { ready, authenticated } = useRequireAuth("/nfts");
  const assets = useListNftAssets(undefined, { enabled: ready && authenticated });
  const collections = useListNftCollections(undefined, { enabled: ready && authenticated });

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">NFTs</h1>
        <p className="text-sm text-muted-foreground">
          Export your designs to IPFS, then mint on Mantle with your wallet.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              Assets
            </CardTitle>
            <CardDescription>Recently exported assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assets.isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader className="size-5 text-muted-foreground animate-spin" />
              </div>
            ) : assets.isError ? (
              <div className="flex flex-col gap-2 items-center justify-center h-24 text-sm text-muted-foreground">
                <TriangleAlert className="size-5" />
                <div>{assets.error?.message || "Failed to load assets"}</div>
              </div>
            ) : assets.data?.data.length ? (
              <div className="space-y-3">
                {assets.data.data.map((asset) => {
                  const preview =
                    ipfsToHttpUrl(asset.imageUri) ??
                    asset.pageThumbnailUrl ??
                    asset.projectThumbnailUrl ??
                    null;

                  const tokenUri = asset.metadataUri ? ipfsToHttpUrl(asset.metadataUri) ?? asset.metadataUri : null;
                  const imageUrl = asset.imageUri ? ipfsToHttpUrl(asset.imageUri) ?? asset.imageUri : null;

                  const tokenLink =
                    asset.collectionAddress && asset.tokenId
                      ? `${MANTLE_EXPLORER_BASE_URL}/token/${asset.collectionAddress}?a=${asset.tokenId}`
                      : null;

                  const marketplaceLink =
                    asset.collectionAddress && asset.tokenId
                      ? buildNftMarketplaceUrl({
                          collectionAddress: asset.collectionAddress,
                          tokenId: asset.tokenId,
                        })
                      : null;

                  const txLink = asset.txHash
                    ? `${MANTLE_EXPLORER_BASE_URL}/tx/${asset.txHash}`
                    : null;

                  return (
                    <div key={asset.id} className="flex gap-3 rounded-xl border p-3">
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {preview ? (
                          <Image
                            src={preview}
                            alt={asset.name ?? asset.projectName}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium">
                            {asset.name ?? `${asset.projectName}${asset.pageIndex !== null ? ` · Page ${asset.pageIndex + 1}` : ""}`}
                          </div>
                          <div className="text-[11px] rounded-full border px-2 py-0.5 text-muted-foreground">
                            {asset.status}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                          {tokenUri ? (
                            <button
                              type="button"
                              className="underline underline-offset-4"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(tokenUri);
                                  toast.success("Token URI copied.");
                                } catch {
                                  toast.error("Failed to copy.");
                                }
                              }}
                            >
                              Copy token URI
                            </button>
                          ) : null}
                          {tokenUri ? (
                            <a
                              className="inline-flex items-center gap-1 underline underline-offset-4"
                              href={tokenUri}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open token URI <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                          {imageUrl ? (
                            <a
                              className="inline-flex items-center gap-1 underline underline-offset-4"
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open image <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                          {tokenLink ? (
                            <a
                              className="inline-flex items-center gap-1 underline underline-offset-4"
                              href={tokenLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View token <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                          {marketplaceLink ? (
                            <a
                              className="inline-flex items-center gap-1 underline underline-offset-4"
                              href={marketplaceLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {getNftMarketplaceLabel()} <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                          {txLink ? (
                            <a
                              className="inline-flex items-center gap-1 underline underline-offset-4"
                              href={txLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View tx <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                        {asset.collectionAddress ? (
                          <div className="mt-2 text-[11px] text-muted-foreground font-mono">
                            {shortHash(asset.collectionAddress)}{" "}
                            {asset.tokenId ? `#${asset.tokenId}` : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No assets yet. Open a project and use{" "}
                <span className="font-medium">File → Export as NFT</span>.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" />
              Collections
            </CardTitle>
            <CardDescription>Your deployed collections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {collections.isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader className="size-5 text-muted-foreground animate-spin" />
              </div>
            ) : collections.isError ? (
              <div className="flex flex-col gap-2 items-center justify-center h-24 text-sm text-muted-foreground">
                <TriangleAlert className="size-5" />
                <div>{collections.error?.message || "Failed to load collections"}</div>
              </div>
            ) : collections.data?.data.length ? (
              <div className="space-y-2">
                {collections.data.data.map((collection) => (
                  <div key={collection.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">
                        {collection.name}{" "}
                        <span className="text-xs text-muted-foreground">({collection.symbol})</span>
                      </div>
                      {collection.address ? (
                        <Button asChild variant="secondary" size="sm">
                          <a
                            href={`${MANTLE_EXPLORER_BASE_URL}/address/${collection.address}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Explorer <ExternalLink className="size-3 ml-2" />
                          </a>
                        </Button>
                      ) : (
                        <div className="text-xs text-muted-foreground">Not deployed</div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
                      {collection.address ?? "—"}
                    </div>
                    {collection.contractUri ? (
                      <div className="mt-2 text-xs text-muted-foreground break-all">
                        Contract URI: <span className="font-mono">{collection.contractUri}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No collections yet. Create one in{" "}
                <span className="font-medium">File → Export as NFT</span>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
