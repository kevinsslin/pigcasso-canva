import { Search } from "lucide-react";

import { UserButton } from "@/features/auth/components/user-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-20 w-full border-b border-border bg-background/70 backdrop-blur px-4 lg:px-6 h-[68px] flex items-center">
      <div className="flex items-center gap-3 w-full">
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
