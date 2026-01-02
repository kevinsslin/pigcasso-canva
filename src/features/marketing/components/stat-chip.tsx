import { Tilt } from "@/components/tilt";

export const StatChip = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Tilt>
      <div className="flex items-start gap-3 rounded-2xl bg-white/70 backdrop-blur border border-white/50 px-4 py-3 shadow-soft transition-shadow duration-300 hover:shadow-glow">
        <div className="mt-0.5 size-9 rounded-xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/40">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        </div>
      </div>
    </Tilt>
  );
};

