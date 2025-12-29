"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader2, ShieldCheck } from "lucide-react";

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
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Sign in to Pigcasso Canvas</CardTitle>
        <CardDescription>
          Continue with email, social, or wallet via Privy.
        </CardDescription>
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

