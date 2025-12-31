import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export const Logo = () => {
  return (
    <Link href="/app">
      <div className="flex items-center gap-x-3 hover:opacity-90 transition h-[68px] px-5">
        <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg">
          <Image src="/logo-pig.png" alt="Pigcasso" width={40} height={40} />
        </div>
        <div className="min-w-0">
          <h1
            className={cn(
              "text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 dark:to-cyan-300",
            )}
          >
            Pigcasso
          </h1>
          <div className="text-[11px] text-muted-foreground leading-none truncate">
            Web3-native design canvas
          </div>
        </div>
      </div>
    </Link>
  );
};
