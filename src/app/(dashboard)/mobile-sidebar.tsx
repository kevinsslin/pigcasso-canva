"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Logo } from "./logo";
import { SidebarRoutes } from "./sidebar-routes";

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const MobileSidebar = ({ open, onOpenChange }: MobileSidebarProps) => {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    onOpenChange(false);
  }, [pathname, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-full w-[320px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none sm:rounded-none p-0 gap-0">
        <div className="border-b">
          <Logo compact onClick={() => onOpenChange(false)} />
        </div>
        <div className="flex-1 overflow-auto py-4">
          <SidebarRoutes onNavigate={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
