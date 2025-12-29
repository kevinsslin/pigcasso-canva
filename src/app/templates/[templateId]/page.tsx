"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useGetTemplate } from "@/features/projects/api/use-get-template";
import { useRemixTemplate } from "@/features/projects/api/use-remix-template";

import { Button } from "@/components/ui/button";

const shortAddress = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

export default function TemplatePage({
  params,
}: {
  params: { templateId: string };
}) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace(`/sign-in?redirect=/templates/${params.templateId}`);
    }
  }, [authenticated, params.templateId, ready, router]);

  const templateQuery = useGetTemplate(params.templateId, {
    enabled: ready && authenticated,
  });
  const remix = useRemixTemplate();

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/templates/${params.templateId}`;
  }, [params.templateId]);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (templateQuery.isError || !templateQuery.data?.data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Template not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This template may have been unpublished or the link is invalid.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const data = templateQuery.data.data;
  const locked = templateQuery.data.locked ?? false;

  const onRemix = () => {
    remix.mutate(
      { id: data.id },
      {
        onSuccess: ({ data: created }) => {
          router.push(`/editor/${created.id}`);
        },
      },
    );
  };

  const onCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {data.width}×{data.height}
            {data.creatorWallet ? (
              <>
                {" "}
                · Created by {shortAddress(data.creatorWallet)}
              </>
            ) : null}
            {data.parentProjectId ? (
              <>
                {" "}
                · Remixed from{" "}
                <a
                  className="underline"
                  href={`/templates/${data.parentProjectId}`}
                >
                  {shortAddress(data.parentProjectId)}
                </a>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCopyLink} disabled={!shareUrl}>
            Copy link
          </Button>
          <Button onClick={onRemix} disabled={locked || remix.isPending}>
            {remix.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Remix
          </Button>
        </div>
      </div>

      {locked ? (
        <div className="rounded-lg border p-4 bg-muted text-sm">
          This template is Pro-only. Hold 100,000 PIGCASSO to remix.
        </div>
      ) : null}

      <div className="rounded-xl border overflow-hidden bg-muted">
        {data.thumbnailUrl ? (
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={data.thumbnailUrl}
              alt={data.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
}
