"use client";

import Link from "next/link";
import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Banner } from "./banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { ready, authenticated } = useRequireAuth("/");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
      <Banner />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creator Hub</CardTitle>
            <CardDescription>
              Presets, templates, and your recent projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/creator-hub">Open Creator Hub</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>NFTs</CardTitle>
            <CardDescription>
              Export designs as on-chain assets (coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/nfts">Explore NFTs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
