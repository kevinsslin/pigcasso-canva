import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { UserButton } from "@/features/auth/components/user-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

import { MobileNav } from "./mobile-nav";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-20 w-full border-b border-border bg-background/70 backdrop-blur px-4 lg:px-6 h-[68px] flex items-center">
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center gap-2 lg:hidden">
          <MobileNav />
          <Link href="/app" className="flex md:hidden items-center gap-2">
            <div className="size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg">
              <Image src="/logo-pig.png" alt="Pigcasso" width={36} height={36} />
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 dark:to-cyan-300">
              Pigcasso
            </span>
          </Link>
        </div>
        <div className="hidden md:block flex-1 max-w-xl">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search projects, templates, or ideas…"
              className="pl-9 rounded-full"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </nav>
  );
};
