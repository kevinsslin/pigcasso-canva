"use client";

import { Crown, Home, MessageCircleQuestion, RefreshCw, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { usePro } from "@/features/auth/hooks/use-pro";
import { useRefreshTokenGating } from "@/features/auth/api/use-refresh-token-gating";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { SidebarItem } from "./sidebar-item";

export const SidebarRoutes = () => {
  const { ready, authenticated } = usePrivy();
  const { isLoading, isPro } = usePro({ enabled: ready && authenticated });
  const refreshMutation = useRefreshTokenGating();

  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-y-4 flex-1">
      {!isLoading && authenticated && (
        <>
          <div className="px-3">
            <div className="rounded-xl border bg-white p-3">
              <div className="flex items-center gap-x-2">
                <Crown className="size-4 text-yellow-500 fill-yellow-500" />
                <p className="text-sm font-medium">
                  {isPro ? "Pigcasso Pro unlocked" : "Unlock Pigcasso Pro"}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPro
                  ? "Token gating is active on Mantle."
                  : "Hold 100,000 PIGCASSO on Mantle to unlock Pro features."}
              </p>
              <Button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="w-full mt-3 rounded-lg"
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh status
              </Button>
            </div>
          </div>
          <div className="px-3">
            <Separator />
          </div>
        </>
      )}
      <ul className="flex flex-col gap-y-1 px-3">
        <SidebarItem href="/" icon={Home} label="Home" isActive={pathname === "/"} />
        <SidebarItem
          href="/settings"
          icon={Settings}
          label="Settings"
          isActive={pathname === "/settings"}
        />
      </ul>
      <div className="px-3">
        <Separator />
      </div>
      <ul className="flex flex-col gap-y-1 px-3">
        <SidebarItem
          href="mailto:support@example.com"
          icon={MessageCircleQuestion}
          label="Get Help"
        />
      </ul>
    </div>
  );
};
