"use client";

import Link from "next/link";
import { PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useMe } from "@/features/auth/api/use-me";

type SpaceOwnerActionsProps = {
  spaceUserId: string;
  hasPublishedDocument: boolean;
};

export const SpaceOwnerActions = ({ spaceUserId, hasPublishedDocument }: SpaceOwnerActionsProps) => {
  const me = useMe();
  const isOwner = me.data?.data.user.id === spaceUserId;

  if (!isOwner) return null;

  return (
    <Button
      asChild
      size="sm"
      variant={hasPublishedDocument ? "secondary" : "default"}
      className="rounded-xl bg-white/80 border border-white/60 shadow-soft hover:bg-white"
    >
      <Link href="/space/builder">
        <PencilLine className="mr-2 size-4" />
        {hasPublishedDocument ? "Edit Space" : "Build your Space"}
      </Link>
    </Button>
  );
};

