"use client";

import Link from "next/link";
import { Boxes, Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectionsPage() {
  const { ready, authenticated } = useRequireAuth("/collections");

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
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Manage your series/contracts for minting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-muted-foreground" />
            Coming soon
          </CardTitle>
          <CardDescription>
            We’ll support a factory pattern (Mantle-first) so you can create collections and mint into them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Create/manage collections (name, symbol, contract URI)</li>
            <li>Deploy via factory, then mint assets into a collection</li>
            <li>Mint recipient: embedded or external wallet</li>
            <li>Royalties: in roadmap (not in initial mint)</li>
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

