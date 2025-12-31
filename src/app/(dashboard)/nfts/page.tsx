"use client";

import { Boxes, Loader, Sparkles } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { MANTLE_CHAIN_ID } from "@/lib/web3-constants";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NftsPage() {
  const { ready, authenticated } = useRequireAuth("/nfts");

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
          Turn designs into on-chain assets on Mantle (coming soon).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              Assets
            </CardTitle>
            <CardDescription>
              Your designs exported as mint-ready metadata and tracked on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Mantle first (chainId={MANTLE_CHAIN_ID})</li>
              <li>IPFS upload for image + metadata + source JSON</li>
              <li>Status tracking (draft → minted)</li>
              <li>Explorer links + refresh status</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" />
              Collections
            </CardTitle>
            <CardDescription>
              Manage your series/contracts for minting (factory pattern).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Create/manage collections (name, symbol, contract URI)</li>
              <li>Deploy via factory, then mint assets into a collection</li>
              <li>User-signed mint transactions</li>
              <li>Royalties: roadmap item</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            NFT export and minting will be enabled once contract addresses + ABI are finalized.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

