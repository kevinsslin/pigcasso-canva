"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { DASHBOARD_NAV_ITEMS, isNavItemActive } from "./nav-items";

export const FloatingSidebar = () => {
  const pathname = usePathname() ?? "";

  return (
    <TooltipProvider delayDuration={120}>
      <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/app?new=1"
              className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition"
              aria-label="New"
            >
              <Plus className="size-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">New</TooltipContent>
        </Tooltip>

        <nav className="bg-card/80 backdrop-blur shadow-soft rounded-full py-4 px-2 flex flex-col gap-5 items-center border border-border">
          {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
            const isActive = isNavItemActive(pathname, { href, label, icon: Icon, match });
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      isActive ? "bg-primary/10 text-primary" : null,
                    )}
                    aria-label={label}
                  >
                    <Icon className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
};
