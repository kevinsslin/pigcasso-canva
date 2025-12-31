import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
  isActive,
  onClick,
}: SidebarItemProps) => {
  return (
    <Link href={href} onClick={onClick}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
        isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
      )}>
        <Icon className="size-4 stroke-2" />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
};
