"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { mantle } from "viem/chains";
import { CheckCircle2, Coins, ExternalLink, Loader, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useMe } from "@/features/auth/api/use-me";
import { useRefreshTokenGating } from "@/features/auth/api/use-refresh-token-gating";
import { useGetMyTemplates, type MyTemplateListItem } from "@/features/projects/api/use-get-my-templates";
import { useCreateTemplateToken } from "@/features/printr/api/use-create-template-token";
import type { TemplateTokenRecord } from "@/features/printr/api/use-get-template-token";
import { useUpdateTemplateToken } from "@/features/printr/api/use-update-template-token";
import { buildPrintrTokenUrl, MANTLE_CAIP2 } from "@/features/printr/constants";
import { parseCaip10 } from "@/features/printr/lib/caip";
import { deriveTemplateTokenSymbol, shortHash } from "@/features/printr/lib/format";
import {
  buildEvmTransactionFromPrintrPayload,
  getPayloadEip155ChainId,
  isPrintrEvmPayload,
} from "@/features/printr/lib/payload";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type KnownTemplateTokenStatus = "created" | "signed" | "live" | "failed";
type TemplateTokenStatus = MyTemplateListItem["token"]["status"];

const statusLabel: Record<KnownTemplateTokenStatus, string> = {
  created: "Created",
  signed: "Signed",
  live: "Live",
  failed: "Failed",
};

const statusTone: Record<KnownTemplateTokenStatus, string> = {
  created: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  signed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  live: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

const isKnownTemplateTokenStatus = (value: string): value is KnownTemplateTokenStatus =>
  Object.prototype.hasOwnProperty.call(statusLabel, value);

const TemplateTokenStatusPill = ({ status }: { status: TemplateTokenStatus }) => {
  if (!status) return null;
  const label = isKnownTemplateTokenStatus(status) ? statusLabel[status] : status;
  const tone = isKnownTemplateTokenStatus(status)
    ? statusTone[status]
    : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      {status === "live" ? <CheckCircle2 className="size-3" /> : null}
      {status === "failed" ? <XCircle className="size-3" /> : null}
      {label}
    </span>
  );
};

const fetchTemplateToken = async (templateId: string): Promise<TemplateTokenRecord | null> => {
  const response = await client.api.printr["template-tokens"][":templateId"].$get({
    param: { templateId },
  });

  if (response.status === 404) {
    return null;
  }

  const body = await readApiResponse<{ data: TemplateTokenRecord }>(
    response,
    "Failed to fetch template token",
  );
  return body.data;
};

export const MyTemplatesSection = () => {
  const me = useMe();
  const { wallets } = useWallets();
  const myTemplates = useGetMyTemplates({ publicOnly: "true" });
  const refreshTokenGating = useRefreshTokenGating();

  const createToken = useCreateTemplateToken();
  const updateToken = useUpdateTemplateToken();

  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [signingTemplateId, setSigningTemplateId] = useState<string | null>(null);

  const printrConfigured = me.data?.data.integrations.printr.configured === true;
  const isPro = me.data?.data.pro.isPro === true;
  const canCreate = !me.isLoading && !me.isError && printrConfigured && isPro;

  const hasTemplates = (myTemplates.data?.length ?? 0) > 0;

  const disabledReason = useMemo(() => {
    if (me.isLoading) return "Checking eligibility…";
    if (me.isError) return "Unable to verify eligibility. Please try again.";
    if (!printrConfigured) return "Launchpad is temporarily unavailable right now.";
    if (!isPro) return "Pro required to launch template tokens.";
    return null;
  }, [isPro, me.isError, me.isLoading, printrConfigured]);

  const signDeploymentRecord = async (
    record: TemplateTokenRecord,
    opts: { toastId: string | number },
  ) => {
    if (record.txHash) {
      toast.message("Deployment transaction already submitted.", { id: opts.toastId, duration: 3000 });
      return;
    }

    if (!record.payload) {
      toast.error("Missing deployment payload.", { id: opts.toastId, duration: 3500 });
      return;
    }

    if (!isPrintrEvmPayload(record.payload)) {
      toast.error("Unsupported deployment payload.", { id: opts.toastId, duration: 3500 });
      return;
    }

    const chainId = getPayloadEip155ChainId(record.payload);
    if (chainId !== mantle.id) {
      toast.error("Only Mantle is supported right now.", { id: opts.toastId, duration: 3500 });
      return;
    }

    const creator = parseCaip10(record.creatorAccount);
    if (!creator) {
      toast.error("Invalid creator account.", { id: opts.toastId, duration: 3500 });
      return;
    }

    const wallet = wallets.find(
      (candidate) =>
        candidate.type === "ethereum" &&
        candidate.address.toLowerCase() === creator.address.toLowerCase(),
    );

    if (!wallet || wallet.type !== "ethereum") {
      toast.error("Creator wallet is not connected.", { id: opts.toastId, duration: 3500 });
      return;
    }

    toast.loading("Waiting for wallet signature…", { id: opts.toastId });

    await wallet.switchChain(chainId);
    const provider = await wallet.getEthereumProvider();

    const walletClient = createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: mantle,
      transport: custom(provider),
    });

    const tx = buildEvmTransactionFromPrintrPayload(record.payload);
    const hash = await walletClient.sendTransaction(tx);

    await updateToken.mutateAsync({
      templateId: record.templateProjectId,
      txHash: hash,
      status: "signed",
    });

    toast.success("Transaction submitted.", { id: opts.toastId, duration: 3500 });
  };

  const onLaunchToken = async (template: MyTemplateListItem) => {
    if (!canCreate) {
      toast.error(disabledReason ?? "Launch is unavailable right now.");
      return;
    }

    setCreatingTemplateId(template.id);
    setSigningTemplateId(template.id);
    const toastId = toast.loading("Launching template token…", {
      description: template.name,
    });

    try {
      await createToken.mutateAsync({
        templateId: template.id,
        name: template.name,
        symbol: deriveTemplateTokenSymbol(template.name),
        description: `Template token for “${template.name}”.`,
        chains: [MANTLE_CAIP2],
        initial_buy: { supply_percent: 10 },
        graduation_threshold_per_chain_usd: 69000,
      });

      const record = await fetchTemplateToken(template.id);
      if (!record) {
        toast.error("Token created, but record is missing.", { id: toastId, duration: 3500 });
        return;
      }

      await signDeploymentRecord(record, { toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to launch template token", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setSigningTemplateId(null);
      setCreatingTemplateId(null);
    }
  };

  const onSignDeployment = async (template: MyTemplateListItem) => {
    setSigningTemplateId(template.id);
    const toastId = toast.loading("Preparing deployment…", { description: template.name });

    try {
      const record = await fetchTemplateToken(template.id);
      if (!record) {
        toast.error("Create a token first.", { id: toastId, duration: 3500 });
        return;
      }

      await signDeploymentRecord(record, { toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit transaction", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setSigningTemplateId(null);
    }
  };

  if (myTemplates.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Templates</h2>
        <div className="flex items-center justify-center h-32">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (myTemplates.isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Templates</h2>
        <div className="flex flex-col gap-y-3 items-center justify-center h-32 text-sm text-muted-foreground">
          <TriangleAlert className="size-6" />
          <p>{myTemplates.error?.message || "Failed to load templates"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">My Templates</h2>
        <p className="text-sm text-muted-foreground">
          Launch a template token directly from your published templates.
        </p>
      </div>

      {!canCreate ? (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>{disabledReason ?? "Launch is unavailable right now."}</div>
            {!me.isLoading && !me.isError && !isPro ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={refreshTokenGating.isPending}
                onClick={() => refreshTokenGating.mutate()}
              >
                <RefreshCw className={cn("mr-2 size-4", refreshTokenGating.isPending && "animate-spin")} />
                Refresh Pro status
              </Button>
            ) : null}
            {me.isError ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => me.refetch()}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hasTemplates ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            No published templates yet. Export a design as a template, then come back here to launch a token.
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myTemplates.data?.map((template) => {
            const tokenId = template.token?.printrTokenId ?? null;
            const status = (template.token?.status ?? null) as TemplateTokenStatus;
            const creating = creatingTemplateId === template.id;
            const signing = signingTemplateId === template.id;
            const busy = creating || signing || createToken.isPending || updateToken.isPending;

            return (
              <Card key={template.id} className="overflow-hidden">
                <div
                  className="relative w-full border-b bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]"
                  style={{ aspectRatio: "16/10" }}
                >
                  {template.thumbnailUrl ? (
                    <Image
                      fill
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="object-cover"
                    />
                  ) : null}

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    {tokenId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                        <Coins className="size-3" />
                        Token
                      </span>
                    ) : null}
                    <TemplateTokenStatusPill status={status} />
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.width}×{template.height}px
                        </div>
                      </div>
                      <Link
                        className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                        href={`/templates/${template.id}`}
                      >
                        Details
                      </Link>
                    </div>

                    {tokenId ? (
                      <div className="text-xs text-muted-foreground">
                        Token:{" "}
                        <a
                          href={buildPrintrTokenUrl(tokenId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {shortHash(tokenId)} <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!tokenId ? (
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={!canCreate || busy}
                        onClick={() => onLaunchToken(template)}
                      >
                        {creating || signing ? "Launching…" : "Launch token"}
                      </Button>
                    ) : status === "created" ? (
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={busy}
                        onClick={() => onSignDeployment(template)}
                      >
                        {signing ? "Signing…" : "Sign deployment"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-full"
                        asChild
                      >
                        <a href={buildPrintrTokenUrl(tokenId)} target="_blank" rel="noreferrer">
                          View on Printr
                        </a>
                      </Button>
                    )}

                    {tokenId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        asChild
                      >
                        <Link href={`/templates/${template.id}`}>
                          Manage
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
