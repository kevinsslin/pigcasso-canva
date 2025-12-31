"use client";

import Link from "next/link";
import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { TemplatesSection } from "../templates-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreatorHubPage() {
  const { ready, authenticated } = useRequireAuth("/creator-hub");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 max-w-screen-xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold">Creator Hub</h1>
        <p className="text-sm text-muted-foreground">
          Browse and remix templates.
        </p>
      </div>

      <Card className="bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle>Template Token Launchpad</CardTitle>
          <CardDescription>
            Launch a token for your template on Printr (coming soon).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Turn templates into tradable creator assets. Users will unlock usage by staking
            the template token (discounts/credits), or pay per use (roadmap).
          </p>
          <Button asChild variant="secondary" className="rounded-full shrink-0">
            <Link href="/creator-hub/launchpad">Learn more</Link>
          </Button>
        </CardContent>
      </Card>

      <TemplatesSection />
    </div>
  );
}
