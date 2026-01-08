"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { UserButton } from "@/features/auth/components/user-button";
import { Button } from "@/components/ui/button";

import { Logo } from "./logo";
import { MobileSidebar } from "./mobile-sidebar";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <MobileSidebar open={open} onOpenChange={setOpen} />
      <div className="h-14 flex items-center px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <Logo compact onClick={() => setOpen(false)} />
          </div>

          <div className="hidden md:flex">
            <Logo compact />
          </div>
        </div>

        <div className="ml-auto">
          <UserButton />
        </div>
      </div>
    </nav>
  );
};
