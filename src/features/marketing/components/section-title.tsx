import { cn } from "@/lib/utils";

export const SectionTitle = ({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) => {
  const alignment = align === "left" ? "text-left" : "text-center";
  return (
    <div className={cn("max-w-3xl mx-auto", alignment)}>
      <div className="text-xs font-extrabold text-primary uppercase tracking-[0.2em]">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-muted-foreground text-lg">{description}</p>
      ) : null}
    </div>
  );
};

