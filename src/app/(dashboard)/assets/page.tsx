"use client";

import Link from "next/link";
import { Loader, Sparkles } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssetsPage() {
  const { ready, authenticated } = useRequireAuth("/assets");

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
        <h1 className="text-2xl font-semibold">Assets</h1>
        <p className="text-sm text-muted-foreground">
          Mint-ready NFTs, metadata, and on-chain history for your designs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            Coming soon
          </CardTitle>
          <CardDescription>
            NFT export and minting will land here once the contract report (addresses + ABI) is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Mantle first (chainId=5000)</li>
            <li>User-signed mint transactions</li>
            <li>IPFS upload for image, metadata, and source JSON</li>
            <li>Asset status tracking (draft → minted)</li>
            <li>Explorer links + refresh status</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/">Back to Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/web3">Web3 settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

