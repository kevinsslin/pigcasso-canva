import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tilt } from "@/components/tilt";

export const FeatureCard = ({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) => {
  return (
    <Tilt className="h-full">
      <Card
        className={cn(
          "h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/40">
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
          {description}
        </CardContent>
      </Card>
    </Tilt>
  );
};

