"use client";

import Link from "next/link";
import { ArrowLeftRight, Coins, Loader, Sparkles } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreatorHubLaunchpadPage() {
  const { ready, authenticated } = useRequireAuth("/creator-hub/launchpad");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Template Token Launchpad</h1>
          <p className="text-sm text-muted-foreground">
            Launch a token for your template on Printr (coming soon).
          </p>
        </div>
        <Button asChild variant="secondary" className="rounded-full">
          <Link href="/creator-hub">Back to Creator Hub</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              Template Tokens
            </CardTitle>
            <CardDescription>
              Turn templates into tradable assets (beyond Canva templates).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>One token per template/creator (design asset)</li>
              <li>Price discovery driven by meme + usage cashflow narrative</li>
              <li>Markets powered by Printr (internal/external markets)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              Stake-to-Use
            </CardTitle>
            <CardDescription>
              Unlock templates by staking tokens or paying (roadmap).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Stake to unlock template usage (discounts/credits)</li>
              <li>Optional pay-to-use as a fallback (roadmap)</li>
              <li>Usage events feed creator analytics + token narrative</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            Coming soon
          </CardTitle>
          <CardDescription>
            The launch flow will be enabled once Printr API + token/contract specs are finalized.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

