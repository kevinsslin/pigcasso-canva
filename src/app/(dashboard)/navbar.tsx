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
    <nav className="sticky top-0 z-20 w-full bg-background/70 backdrop-blur h-[68px] flex items-center px-2 lg:px-4">
      <MobileSidebar open={open} onOpenChange={setOpen} />
      <div className="lg:hidden flex items-center gap-1">
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
      <div className="ml-auto pr-2 lg:pr-0">
        <UserButton />
      </div>
    </nav>
  );
};
