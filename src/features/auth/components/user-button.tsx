"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Crown, Loader, LogOut, RefreshCw, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const shortAddress = (address: string) => {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

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

  const walletAddress = user.wallet?.address;
  const label = walletAddress ? shortAddress(walletAddress) : "Account";
  const isPro = me.data?.data.pro.isPro ?? false;

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
            <AvatarFallback className="bg-slate-900 font-medium text-white flex items-center justify-center">
              {label.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" className="px-2">
            <Wallet className="mr-2 size-4 text-muted-foreground" />
            {label}
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
