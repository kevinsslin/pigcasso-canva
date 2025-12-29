"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Loader, LogOut, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const shortAddress = (address: string) => {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const UserButton = () => {
  const { ready, authenticated, user, logout, linkWallet } = usePrivy();

  if (!ready) {
    return <Loader className="size-4 animate-spin text-muted-foreground" />;
  }

  if (!authenticated || !user) {
    return null;
  }

  const walletAddress = user.wallet?.address;
  const label = walletAddress ? shortAddress(walletAddress) : "Account";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="outline-none relative">
        <div className="flex items-center gap-x-2">
          <Avatar className="size-9">
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

