"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const PrivyAuthCard = () => {
  const { ready, login } = usePrivy();

  return (
    <Card className="w-full p-8 rounded-2xl bg-white/80 backdrop-blur">
      <CardHeader className="px-0 pt-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative size-10 shrink-0">
            <Image src="/logo.svg" alt="Pigcasso Canvas" fill sizes="40px" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl">Sign in to Pigcasso Canvas</CardTitle>
            <CardDescription>
              Continue with email, social, or wallet via Privy.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        <Button
          className="w-full"
          type="button"
          size="lg"
          disabled={!ready}
          onClick={() => login()}
        >
          {!ready ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 size-5" />
          )}
          Continue
        </Button>
        <p className="text-xs text-muted-foreground">
          By continuing, you will create an embedded wallet (optional external wallet
          connection) and agree to the app&apos;s terms.
        </p>
      </CardContent>
    </Card>
  );
};
