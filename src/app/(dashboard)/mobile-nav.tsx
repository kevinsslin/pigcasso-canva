"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Logo } from "./logo";
import { SidebarRoutes } from "./sidebar-routes";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="lg:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="left-0 top-0 h-[100dvh] w-[320px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r p-0 gap-0 sm:rounded-none"
      >
        <aside className="flex flex-col h-full bg-card/80 backdrop-blur border-r border-border">
          <div className="border-b border-border">
            <Logo onClick={() => setOpen(false)} />
          </div>
          <SidebarRoutes onNavigate={() => setOpen(false)} />
        </aside>
      </DialogContent>
    </Dialog>
  );
};
