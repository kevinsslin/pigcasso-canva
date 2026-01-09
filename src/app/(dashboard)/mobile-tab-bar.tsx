"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { MOBILE_DOCK_ITEMS, isNavItemActive } from "./nav-items";

const DockItem = ({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("size-5", active ? "text-primary" : undefined)} />
      <span className="text-[10px] leading-none">{label}</span>
    </Link>
  );
};

export const MobileTabBar = () => {
  const pathname = usePathname() ?? "";

  const items = MOBILE_DOCK_ITEMS;
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none"
      aria-label="Primary navigation"
    >
      <div className="pointer-events-auto px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex h-16 items-stretch justify-between gap-2 rounded-2xl border bg-card/80 backdrop-blur shadow-soft px-2">
            {left.map((item) => (
              <DockItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavItemActive(pathname, item)}
              />
            ))}

            <div className="flex w-[68px] items-center justify-center">
              <Link
                href="/app?new=1"
                className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-pink-500/20 flex items-center justify-center active:scale-95 transition"
                aria-label="New"
              >
                <Plus className="size-5" />
              </Link>
            </div>

            {right.map((item) => (
              <DockItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavItemActive(pathname, item)}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

