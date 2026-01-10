import type { LucideIcon } from "lucide-react";
import { FolderOpen, Github, Home, LayoutGrid, Settings, UserRound } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  showInDock?: boolean;
};

const matchPrefix = (prefix: string) => {
  return (pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export const isNavItemActive = (pathname: string, item: DashboardNavItem) => {
  if (item.match) {
    return item.match(pathname);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/app", label: "Home", icon: Home, match: matchPrefix("/app"), showInDock: true },
  { href: "/canvases", label: "Boards", icon: LayoutGrid, match: matchPrefix("/canvases"), showInDock: true },
  { href: "/repositories", label: "Repositories", icon: Github, match: matchPrefix("/repositories"), showInDock: false },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderOpen,
    match: (pathname) => matchPrefix("/projects")(pathname) || matchPrefix("/leaderboards")(pathname),
    showInDock: true,
  },
  {
    href: "/space",
    label: "My Space",
    icon: UserRound,
    match: (pathname) =>
      matchPrefix("/space")(pathname) ||
      pathname === "/nfts" ||
      pathname === "/assets" ||
      pathname === "/collections",
    showInDock: true,
  },
  { href: "/settings", label: "Settings", icon: Settings, match: matchPrefix("/settings"), showInDock: false },
];

export const MOBILE_DOCK_ITEMS = DASHBOARD_NAV_ITEMS.filter((item) => item.showInDock);
