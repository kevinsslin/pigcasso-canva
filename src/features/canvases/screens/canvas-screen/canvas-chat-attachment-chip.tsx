"use client";

import { Code2, Image as ImageIcon } from "lucide-react";

import type { CanvasChatAttachment } from "@/features/canvases/screens/canvas-screen/types";

export const CanvasChatAttachmentChip = ({
  attachment,
  onClick,
}: {
  attachment: CanvasChatAttachment;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
    onClick={onClick}
  >
    {attachment.type === "image" ? (
      attachment.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt="" className="h-4 w-4 rounded-sm object-cover" />
      ) : (
        <ImageIcon className="size-3 text-muted-foreground" />
      )
    ) : (
      <Code2 className="size-3 text-muted-foreground" />
    )}
    <span className="max-w-[140px] truncate">{attachment.label}</span>
  </button>
);

