"use client";

import { Loader, Wallet } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Web3SettingsPage() {
  const { ready, authenticated } = useRequireAuth("/settings/web3");

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
        <h1 className="text-2xl font-semibold">Web3 Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure minting preferences for Pigcasso assets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            Coming soon
          </CardTitle>
          <CardDescription>
            These settings will be enabled when the NFT contracts are finalized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Planned settings:</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Default mint recipient (embedded vs external wallet)</li>
            <li>IPFS pinning provider configuration</li>
            <li>Metadata defaults (name/description/attributes)</li>
            <li>Explorer & network defaults (Mantle first)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

