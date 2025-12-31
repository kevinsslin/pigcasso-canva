"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Crown, Loader, LogOut, RefreshCw, Settings, Wallet } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useMe } from "@/features/auth/api/use-me";
import { useRefreshTokenGating } from "@/features/auth/api/use-refresh-token-gating";
import { getAvatarFallbackText, getUserDisplayLabel } from "@/features/auth/lib/user-display";

export const UserButton = () => {
  const { ready, authenticated, user, logout, linkWallet } = usePrivy();
  const me = useMe({ enabled: ready && authenticated });
  const refreshMutation = useRefreshTokenGating();

  if (!ready) {
    return <Loader className="size-4 animate-spin text-muted-foreground" />;
  }

  if (!authenticated || !user) {
    return null;
  }

  const isPro = me.data?.data.pro.isPro ?? false;
  const avatarUrl = me.data?.data.user.image ?? null;
  const meUser = me.data?.data.user;
  const walletAddress =
    meUser?.wallets.external ?? meUser?.wallets.embedded ?? user.wallet?.address ?? null;
  const displayLabel = getUserDisplayLabel({
    name: meUser?.name,
    email: meUser?.email,
    walletAddress,
  });

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="outline-none relative">
        <div className="flex items-center gap-x-2">
          <Avatar className="size-9">
            {isPro && (
              <div className="absolute -top-1 -left-1 z-10 flex items-center justify-center">
                <div className="rounded-full bg-white flex items-center justify-center p-1 drop-shadow-sm">
                  <Crown className="size-3 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
            )}
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayLabel} />
            ) : null}
            <AvatarFallback className="bg-slate-900 font-medium text-white flex items-center justify-center">
              {getAvatarFallbackText(displayLabel)}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" className="px-2 max-w-[220px] min-w-0">
            <Wallet className="mr-2 size-4 text-muted-foreground" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild className="h-10">
          <Link href="/settings">
            <Settings className="size-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="h-10"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh Pro status
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10" onClick={() => linkWallet()}>
          <Wallet className="size-4 mr-2" />
          Connect external wallet
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10" onClick={() => logout()}>
          <LogOut className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
