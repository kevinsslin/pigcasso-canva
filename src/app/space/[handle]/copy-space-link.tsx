"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export const CopySpaceLink = ({ path }: { path: string }) => {
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

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => void onCopy()}>
      {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
};
