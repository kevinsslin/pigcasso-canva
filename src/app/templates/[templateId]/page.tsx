"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetTemplate } from "@/features/projects/api/use-get-template";
import { useGetTemplateUsage } from "@/features/projects/api/use-get-template-usage";
import { useRemixTemplate } from "@/features/projects/api/use-remix-template";
import { useGetPrintrDeployments } from "@/features/printr/api/use-get-printr-deployments";
import { buildPrintrTokenUrl, MANTLE_CAIP2, MANTLE_EXPLORER_BASE_URL } from "@/features/printr/constants";
import { shortHash } from "@/features/printr/lib/format";

import { Button } from "@/components/ui/button";
import { normalizeIpfsUrl } from "@/lib/ipfs";

export default function TemplatePage({
  params,
}: {
  params: { templateId: string };
}) {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth(`/templates/${params.templateId}`);

  const templateQuery = useGetTemplate(params.templateId, {
    enabled: ready && authenticated,
  });
  const usage = useGetTemplateUsage(params.templateId, {
    enabled: ready && authenticated,
  });
  const remix = useRemixTemplate();
  const printrTokenId = templateQuery.data?.data.token?.printrTokenId ?? null;
  const deployments = useGetPrintrDeployments(printrTokenId, {
    enabled: ready && authenticated && Boolean(printrTokenId),
  });

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
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Template not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This template may have been unpublished or the link is invalid.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.push("/app")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const data = templateQuery.data.data;
  const locked = templateQuery.data.locked ?? false;
  const tokenStatus = data.token?.status ?? null;
  const mantleDeployment =
    deployments.data?.deployments?.find((deployment) => deployment.chain_id === MANTLE_CAIP2) ??
    null;
  const remixCount = usage.data?.remixCount ?? null;
  const thumbnailSrc = normalizeIpfsUrl(data.thumbnailUrl);

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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {data.width}×{data.height}
            {typeof remixCount === "number" ? (
              <>
                {" "}
                · {remixCount} remix{remixCount === 1 ? "" : "es"}
              </>
            ) : null}
            {data.creatorWallet ? (
              <>
                {" "}
                · Created by {shortHash(data.creatorWallet)}
              </>
            ) : null}
            {data.parentProjectId ? (
              <>
                {" "}
                · Remixed from{" "}
                <Link className="underline" href={`/templates/${data.parentProjectId}`}>
                  {shortHash(data.parentProjectId)}
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        <div
          className="relative w-full"
          style={{ aspectRatio: `${data.width}/${data.height}` }}
        >
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={data.name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              draggable={false}
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No preview available
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-2">
        <div className="text-sm font-medium">Template Token</div>
        {printrTokenId ? (
          <>
            <div className="text-xs text-muted-foreground break-all">
              Token ID: <span className="font-mono">{printrTokenId}</span>
            </div>
            {tokenStatus ? (
              <div className="text-xs text-muted-foreground">
                Status: {tokenStatus}
              </div>
            ) : null}
            {mantleDeployment?.contract_address ? (
              <div className="text-xs text-muted-foreground">
                Contract:{" "}
                <a
                  className="underline font-mono"
                  href={`${MANTLE_EXPLORER_BASE_URL}/address/${mantleDeployment.contract_address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortHash(mantleDeployment.contract_address)}
                </a>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="secondary">
                <a
                  href={buildPrintrTokenUrl(printrTokenId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Printr
                </a>
              </Button>
              {mantleDeployment?.contract_address ? (
                <Button asChild variant="outline">
                  <a
                    href={`${MANTLE_EXPLORER_BASE_URL}/address/${mantleDeployment.contract_address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on explorer
                  </a>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            No token launched for this template yet.
          </div>
        )}
      </div>
    </div>
  );
}
