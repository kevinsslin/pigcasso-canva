"use client";

import { Crown, FolderOpen, Home, LayoutGrid, RefreshCw, Settings, Trophy, UserRound, Wallet } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { usePro } from "@/features/auth/hooks/use-pro";
import { useRefreshTokenGating } from "@/features/auth/api/use-refresh-token-gating";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { SidebarItem } from "./sidebar-item";

export const SidebarRoutes = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { ready, authenticated } = usePrivy();
  const { isLoading, isPro } = usePro({ enabled: ready && authenticated });
  const refreshMutation = useRefreshTokenGating();

  const pathname = usePathname() ?? "";
  const isNftsActive =
    pathname === "/nfts" || pathname === "/assets" || pathname === "/collections";
  const isCreatorHubActive = pathname === "/creator-hub";
  const isProjectsActive = pathname === "/projects" || pathname.startsWith("/projects/");
  const isLeaderboardsActive = pathname === "/leaderboards";
  const isSpaceActive = pathname === "/space" || pathname.startsWith("/space/");

  return (
    <div className="flex flex-col gap-y-4 flex-1">
      {!isLoading && authenticated && (
        <>
          <div className="px-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-cyan-400 p-4 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-2 -bottom-2 opacity-20">
                <Crown className="size-20" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-x-2">
                  <Crown className="size-4 fill-white text-white" />
                  <p className="text-sm font-bold">
                    {isPro ? "Pigcasso Pro unlocked" : "Unlock Pigcasso Pro"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-white/80">
                  {isPro
                    ? "Token gating is active on Mantle."
                    : "Hold 100,000 PIGCASSO on Mantle to unlock Pro packs."}
                </p>
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="w-full mt-3 bg-white/20 text-white border border-white/25 hover:bg-white/30 hover:text-white"
                  variant="secondary"
                  size="sm"
                >
                  <RefreshCw className="mr-2 size-4" />
                  Refresh status
                </Button>
              </div>
            </div>
          </div>
          <div className="px-3">
            <Separator />
          </div>
        </>
      )}
      <ul className="flex flex-col gap-y-1 px-3">
        <SidebarItem href="/app" icon={Home} label="Home" isActive={pathname === "/app"} onClick={onNavigate} />
        <SidebarItem
          href="/projects"
          icon={FolderOpen}
          label="Projects"
          isActive={isProjectsActive}
          onClick={onNavigate}
        />
        <SidebarItem
          href="/leaderboards"
          icon={Trophy}
          label="Leaderboards"
          isActive={isLeaderboardsActive}
          onClick={onNavigate}
        />
        <SidebarItem
          href="/creator-hub"
          icon={LayoutGrid}
          label="Creator Hub"
          isActive={isCreatorHubActive}
          onClick={onNavigate}
        />
        <SidebarItem
          href="/space"
          icon={UserRound}
          label="My Space"
          isActive={isSpaceActive}
          onClick={onNavigate}
        />
        <SidebarItem
          href="/nfts"
          icon={Wallet}
          label="NFTs"
          isActive={isNftsActive}
          onClick={onNavigate}
        />
        <SidebarItem
          href="/settings"
          icon={Settings}
          label="Settings"
          isActive={pathname === "/settings"}
          onClick={onNavigate}
        />
      </ul>
    </div>
  );
};
