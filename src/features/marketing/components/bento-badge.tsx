export const BentoBadge = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[0_2px_10px_rgb(0_0_0_/_0.04)]">
      {children}
    </span>
  );
};

