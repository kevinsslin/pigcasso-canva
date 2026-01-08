import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoProps = {
  compact?: boolean;
  onClick?: () => void;
};

export const Logo = ({ compact, onClick }: LogoProps) => {
  return (
    <Link href="/app" onClick={onClick}>
      <div
        className={cn(
          "flex items-center gap-x-3 hover:opacity-90 transition",
          compact ? "px-4 py-3" : "h-[68px] px-5",
        )}
      >
        <div
          className={cn(
            "rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg",
            compact ? "size-8" : "size-10",
          )}
        >
          <Image
            src="/logo-pig.png"
            alt="Pigcasso"
            width={compact ? 32 : 40}
            height={compact ? 32 : 40}
          />
        </div>
        {compact ? (
          <h1
            className={cn(
              "text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 dark:to-cyan-300",
            )}
          >
            Pigcasso
          </h1>
        ) : (
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
        )}
      </div>
    </Link>
  );
};
