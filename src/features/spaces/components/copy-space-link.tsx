"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export const CopySpaceLink = ({ path, variant = "full" }: { path: string; variant?: "full" | "icon" }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const Icon = copied ? Check : Copy;
  const label = copied ? "Copied" : "Copy link";

  if (variant === "icon") {
    return (
      <Button type="button" variant="secondary" size="icon" onClick={() => void onCopy()} aria-label={label} title={label}>
        <Icon className="size-4" />
      </Button>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => void onCopy()}>
      <Icon className="mr-2 size-4" />
      {label}
    </Button>
  );
};
