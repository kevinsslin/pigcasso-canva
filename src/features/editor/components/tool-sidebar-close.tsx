import { ChevronsLeft, X } from "lucide-react";

interface ToolSidebarCloseProps {
  onClick: () => void;
};

export const ToolSidebarClose = ({
  onClick,
}: ToolSidebarCloseProps) => {
  return (
    <>
      <button
        onClick={onClick}
        className="hidden lg:flex absolute -right-[1.80rem] h-[70px] bg-card/90 backdrop-blur top-1/2 transform -translate-y-1/2 items-center justify-center rounded-r-xl px-1 pr-2 border-r border-y border-border/60 shadow-soft group"
        aria-label="Close sidebar"
        type="button"
      >
        <ChevronsLeft className="size-4 text-foreground group-hover:opacity-75 transition" />
      </button>
      <button
        onClick={onClick}
        className="lg:hidden absolute right-3 top-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center"
        aria-label="Close"
        type="button"
      >
        <X className="size-4 text-foreground" />
      </button>
    </>
  );
};
