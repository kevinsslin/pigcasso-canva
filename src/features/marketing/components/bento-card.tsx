import { Tilt } from "@/components/tilt";

import { cn } from "@/lib/utils";

export const BentoCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Tilt className={cn("h-full", className)} max={7} scale={1.01}>
      <div className="group relative h-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 backdrop-blur shadow-soft ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-cyan-400/12 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6 pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/55 to-white/0 opacity-0 group-hover:opacity-100 motion-safe:animate-[pigcasso-sheen_5.25s_ease-in-out_0.8s_infinite]" />
        </div>
        <div className="relative h-full p-6 sm:p-7 lg:p-8">{children}</div>
      </div>
    </Tilt>
  );
};

