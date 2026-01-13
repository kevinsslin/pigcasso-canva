"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { CheckCircle2, Coins, ExternalLink, Loader, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useMe } from "@/features/auth/api/use-me";
import { useRefreshTokenGating } from "@/features/auth/api/use-refresh-token-gating";
import { useGetMyTemplates, type MyTemplateListItem } from "@/features/projects/api/use-get-my-templates";
import { useCreateTemplateToken } from "@/features/printr/api/use-create-template-token";
import { useDeleteTemplateToken } from "@/features/printr/api/use-delete-template-token";
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
import { PRINTR_EVM_CHAIN_OPTIONS, getPrintrEvmChainOption } from "@/features/printr/supported-chains";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

type KnownTemplateTokenStatus = "created" | "signed" | "live" | "failed";
type TemplateTokenStatus = MyTemplateListItem["token"]["status"];
type InitialBuyMode = "supply_percent" | "spend_usd" | "spend_native";

type QuoteState = null | {
  quote?: {
    total?: { cost_usd?: number; description?: string };
    costs?: Array<{ cost_usd?: number; description?: string; asset_id?: string }>;
  };
};

type WalletChoice = { address: string; label: string };

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
  const deleteToken = useDeleteTemplateToken();
  const updateToken = useUpdateTemplateToken();

  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [signingTemplateId, setSigningTemplateId] = useState<string | null>(null);
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [launchTemplate, setLaunchTemplate] = useState<MyTemplateListItem | null>(null);
  const [launchMode, setLaunchMode] = useState<"create" | "update">("create");
  const [launchExistingRecord, setLaunchExistingRecord] = useState<TemplateTokenRecord | null>(
    null,
  );

  const [launchName, setLaunchName] = useState("");
  const [launchSymbol, setLaunchSymbol] = useState("");
  const [launchDescription, setLaunchDescription] = useState("");
  const [launchWebsite, setLaunchWebsite] = useState("");
  const [launchX, setLaunchX] = useState("");
  const [launchTelegram, setLaunchTelegram] = useState("");
  const [launchChains, setLaunchChains] = useState<string[]>([MANTLE_CAIP2]);
  const [launchGraduationThreshold, setLaunchGraduationThreshold] = useState<69000 | 250000>(69000);
  const [launchInitialBuyMode, setLaunchInitialBuyMode] = useState<InitialBuyMode>("supply_percent");
  const [launchSupplyPercent, setLaunchSupplyPercent] = useState(0);
  const [launchSpendUsd, setLaunchSpendUsd] = useState(0);
  const [launchSpendNative, setLaunchSpendNative] = useState("0");
  const [launchCreatorAddress, setLaunchCreatorAddress] = useState("");
  const [launchQuote, setLaunchQuote] = useState<QuoteState>(null);
  const [quoting, setQuoting] = useState(false);

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

  const meUser = me.data?.data.user ?? null;
  const walletChoices: WalletChoice[] = useMemo(() => {
    const addresses = new Map<string, WalletChoice>();

    const add = (address: string | null | undefined, label: string) => {
      const trimmed = typeof address === "string" ? address.trim() : "";
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (addresses.has(key)) return;
      addresses.set(key, { address: trimmed, label });
    };

    add(meUser?.wallets.external, "External (primary)");
    add(meUser?.wallets.embedded, "Embedded");
    for (const address of meUser?.wallets.externals ?? []) {
      add(address, "External");
    }

    return Array.from(addresses.values());
  }, [meUser?.wallets.embedded, meUser?.wallets.external, meUser?.wallets.externals]);

  useEffect(() => {
    const defaultAddress = meUser?.wallets.external ?? meUser?.wallets.embedded ?? "";
    setLaunchCreatorAddress((current) => (current ? current : defaultAddress));
  }, [meUser?.wallets.embedded, meUser?.wallets.external]);

  const openLaunchDialog = (
    template: MyTemplateListItem,
    mode: "create" | "update" = "create",
  ) => {
    setLaunchTemplate(template);
    setLaunchMode(mode);
    setLaunchExistingRecord(null);
    setLaunchDialogOpen(true);
  };

  const launchTemplateId = launchTemplate?.id ?? "";
  const launchTemplateName = launchTemplate?.name ?? "";

  useEffect(() => {
    if (!launchTemplateId) return;
    setLaunchName(launchTemplateName);
    setLaunchSymbol(deriveTemplateTokenSymbol(launchTemplateName));
    setLaunchDescription(`Template token for “${launchTemplateName}”.`);
    setLaunchWebsite("");
    setLaunchX("");
    setLaunchTelegram("");
    setLaunchChains([MANTLE_CAIP2]);
    setLaunchGraduationThreshold(69000);
    setLaunchInitialBuyMode("supply_percent");
    setLaunchSupplyPercent(0);
    setLaunchSpendUsd(0);
    setLaunchSpendNative("0");
    setLaunchQuote(null);
    setLaunchExistingRecord(null);
  }, [launchTemplateId, launchTemplateName]);

  useEffect(() => {
    if (!launchDialogOpen) return;
    if (!launchTemplateId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const record = await fetchTemplateToken(launchTemplateId);
        if (cancelled) return;

        setLaunchExistingRecord(record);
        if (!record) return;

        setLaunchName(record.name ?? "");
        setLaunchSymbol(record.symbol ?? "");
        setLaunchDescription(record.description ?? "");

        if (record.chains?.length) {
          setLaunchChains(record.chains);
        }

        const creator = parseCaip10(record.creatorAccount);
        if (creator?.address) {
          setLaunchCreatorAddress(creator.address);
        }

        const initialBuy = record.initialBuy;
        if (initialBuy && typeof initialBuy === "object") {
          if ("supply_percent" in initialBuy) {
            const value = Number((initialBuy as { supply_percent?: unknown }).supply_percent);
            setLaunchInitialBuyMode("supply_percent");
            setLaunchSupplyPercent(Number.isFinite(value) ? value : 0);
          } else if ("spend_usd" in initialBuy) {
            const value = Number((initialBuy as { spend_usd?: unknown }).spend_usd);
            setLaunchInitialBuyMode("spend_usd");
            setLaunchSpendUsd(Number.isFinite(value) ? value : 0);
          } else if ("spend_native" in initialBuy) {
            const value = (initialBuy as { spend_native?: unknown }).spend_native;
            setLaunchInitialBuyMode("spend_native");
            setLaunchSpendNative(typeof value === "string" ? value : "0");
          }
        }

        const externalLinks = record.externalLinks;
        if (externalLinks && typeof externalLinks === "object") {
          const links = externalLinks as { website?: unknown; x?: unknown; telegram?: unknown };
          setLaunchWebsite(typeof links.website === "string" ? links.website : "");
          setLaunchX(typeof links.x === "string" ? links.x : "");
          setLaunchTelegram(typeof links.telegram === "string" ? links.telegram : "");
        }
      } catch {
        if (!cancelled) {
          setLaunchExistingRecord(null);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [launchDialogOpen, launchTemplateId]);

  const launchHomeChain = launchChains[0] ?? MANTLE_CAIP2;

  const toggleLaunchChain = (chainId: string) => {
    setLaunchChains((current) => {
      const alreadySelected = current.includes(chainId);
      if (alreadySelected) {
        if (current.length <= 1) return current;
        const next = current.filter((value) => value !== chainId);
        return next.length ? next : current;
      }
      return [...current, chainId];
    });
  };

  const setLaunchHomeChain = (chainId: string) => {
    setLaunchChains((current) => {
      if (!current.includes(chainId)) return current;
      return [chainId, ...current.filter((value) => value !== chainId)];
    });
  };

  const buildLaunchInitialBuy = () => {
    if (launchInitialBuyMode === "supply_percent") {
      return { supply_percent: launchSupplyPercent };
    }
    if (launchInitialBuyMode === "spend_usd") {
      return { spend_usd: launchSpendUsd };
    }
    return { spend_native: launchSpendNative.trim() };
  };

  const onGetLaunchQuote = async () => {
    if (!canCreate) return;
    if (!launchTemplate) return;
    if (!launchChains.length) {
      toast.error("Select at least one chain.");
      return;
    }

    setQuoting(true);
    toast.loading("Fetching quote…", { id: "printr:quote" });
    try {
      const response = await client.api.printr.print.quote.$post({
        json: {
          chains: launchChains,
          initial_buy: buildLaunchInitialBuy(),
          graduation_threshold_per_chain_usd: launchGraduationThreshold,
        },
      });

      const body = await readApiResponse<{ quote: unknown }>(response, "Failed to fetch quote");
      setLaunchQuote(body as QuoteState);
      toast.success("Quote ready.", { id: "printr:quote", duration: 2500 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch quote", {
        id: "printr:quote",
        duration: 4000,
      });
    } finally {
      setQuoting(false);
    }
  };

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
    if (!chainId) {
      toast.error("Invalid deployment payload chain.", { id: opts.toastId, duration: 3500 });
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
      transport: custom(provider),
    });

    const tx = buildEvmTransactionFromPrintrPayload(record.payload);
    const hash = await walletClient.sendTransaction({ ...tx, chain: null });

    await updateToken.mutateAsync({
      templateId: record.templateProjectId,
      txHash: hash,
      status: "signed",
    });

    toast.success("Transaction submitted.", { id: opts.toastId, duration: 3500 });
  };

  const onLaunchToken = async () => {
    const template = launchTemplate;
    if (!template) return;
    if (!canCreate) {
      toast.error(disabledReason ?? "Launch is unavailable right now.");
      return;
    }
    if (!launchName.trim() || !launchSymbol.trim() || !launchDescription.trim()) {
      toast.error("Name, symbol, and description are required.");
      return;
    }
    if (!launchChains.length) {
      toast.error("Select at least one chain.");
      return;
    }

    setCreatingTemplateId(template.id);
    const toastId = toast.loading(launchMode === "update" ? "Updating token draft…" : "Creating token draft…", {
      description: launchName.trim(),
    });

    try {
      if (launchMode === "update") {
        await deleteToken.mutateAsync({ templateId: template.id });
      } else {
        const record = await fetchTemplateToken(template.id);
        if (record) {
          toast.message("Token draft already exists. Sign the deployment from your template card.", {
            id: toastId,
            duration: 3500,
          });
          setLaunchDialogOpen(false);
          return;
        }
      }

      await createToken.mutateAsync({
        templateId: template.id,
        name: launchName.trim(),
        symbol: launchSymbol.trim().toUpperCase(),
        description: launchDescription.trim(),
        chains: launchChains,
        initial_buy: buildLaunchInitialBuy(),
        graduation_threshold_per_chain_usd: launchGraduationThreshold,
        ...(launchCreatorAddress.trim() ? { creatorAddress: launchCreatorAddress.trim() } : {}),
        external_links: {
          ...(launchWebsite.trim() ? { website: launchWebsite.trim() } : {}),
          ...(launchX.trim() ? { x: launchX.trim() } : {}),
          ...(launchTelegram.trim() ? { telegram: launchTelegram.trim() } : {}),
        },
      });

      toast.success("Token draft created. Next: sign the deployment tx.", {
        id: toastId,
        duration: 3500,
      });
      setLaunchDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create template token", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const onResetLaunchDraft = async (template: MyTemplateListItem) => {
    setCreatingTemplateId(template.id);
    const toastId = toast.loading("Resetting token draft…", { description: template.name });

    try {
      await deleteToken.mutateAsync({ templateId: template.id });
      toast.success("Draft reset. You can update settings and create a new draft.", {
        id: toastId,
        duration: 3500,
      });
      openLaunchDialog(template, "create");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset token draft", {
        id: toastId,
        duration: 5000,
      });
    } finally {
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

  const busy =
    createToken.isPending || deleteToken.isPending || updateToken.isPending || quoting;

  return (
    <div className="space-y-4">
      <Dialog
        open={launchDialogOpen}
        onOpenChange={(open) => {
          setLaunchDialogOpen(open);
          if (!open) {
            setLaunchTemplate(null);
            setLaunchQuote(null);
            setLaunchMode("create");
            setLaunchExistingRecord(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy template token</DialogTitle>
            <DialogDescription>
              Configure bonding curve size, initial buy, and target chains (first chain is the home chain you sign on).
            </DialogDescription>
          </DialogHeader>

          {launchTemplate ? (
            <div className="space-y-6">
              {launchExistingRecord ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="font-medium">Draft already exists</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {launchMode === "update"
                      ? "Updating will reset the draft and generate a new token id."
                      : "You can sign the deployment from your template card, or reset the draft to change settings."}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="launch-token-name">Token name</Label>
                  <Input
                    id="launch-token-name"
                    value={launchName}
                    onChange={(e) => setLaunchName(e.target.value)}
                    disabled={!canCreate || busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="launch-token-symbol">Token symbol</Label>
                  <Input
                    id="launch-token-symbol"
                    value={launchSymbol}
                    onChange={(e) => setLaunchSymbol(e.target.value.toUpperCase())}
                    disabled={!canCreate || busy}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="launch-token-description">Description</Label>
                  <Textarea
                    id="launch-token-description"
                    value={launchDescription}
                    onChange={(e) => setLaunchDescription(e.target.value)}
                    disabled={!canCreate || busy}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Initial buy</Label>
                  <select
                    className={cn(
                      "w-full h-10 rounded-md border bg-background px-3 text-sm",
                      (!canCreate || busy) && "opacity-60",
                    )}
                    value={launchInitialBuyMode}
                    onChange={(e) => setLaunchInitialBuyMode(e.target.value as InitialBuyMode)}
                    disabled={!canCreate || busy}
                  >
                    <option value="supply_percent">Supply (%)</option>
                    <option value="spend_usd">Spend (USD)</option>
                    <option value="spend_native">Spend (native)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {launchInitialBuyMode === "supply_percent"
                      ? "Supply percent"
                      : launchInitialBuyMode === "spend_usd"
                        ? "Spend USD"
                        : "Spend native (atomic)"}
                  </Label>
                  {launchInitialBuyMode === "supply_percent" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[Number.isFinite(launchSupplyPercent) ? launchSupplyPercent : 0]}
                          min={0}
                          max={69}
                          step={0.1}
                          onValueChange={(value) =>
                            setLaunchSupplyPercent(value[0] ?? 0)
                          }
                          disabled={!canCreate || busy}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={69}
                          step={0.1}
                          className="w-24"
                          value={String(launchSupplyPercent)}
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value);
                            setLaunchSupplyPercent(Number.isFinite(value) ? value : 0);
                          }}
                          disabled={!canCreate || busy}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        0%–69% (0% = no initial buy)
                      </div>
                    </div>
                  ) : launchInitialBuyMode === "spend_usd" ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={String(launchSpendUsd)}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value);
                        setLaunchSpendUsd(Number.isFinite(value) ? value : 0);
                      }}
                      disabled={!canCreate || busy}
                    />
                  ) : (
                    <Input
                      value={launchSpendNative}
                      onChange={(e) => setLaunchSpendNative(e.target.value)}
                      disabled={!canCreate || busy}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Bonding curve size</Label>
                  <select
                    className={cn(
                      "w-full h-10 rounded-md border bg-background px-3 text-sm",
                      (!canCreate || busy) && "opacity-60",
                    )}
                    value={launchGraduationThreshold}
                    onChange={(e) =>
                      setLaunchGraduationThreshold(Number(e.target.value) as 69000 | 250000)
                    }
                    disabled={!canCreate || busy}
                  >
                    <option value={69000}>$69,000</option>
                    <option value={250000}>$250,000</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chains</Label>
                <div className="rounded-md border p-3 space-y-3">
	                  <div className="grid gap-2 sm:grid-cols-2">
	                    {PRINTR_EVM_CHAIN_OPTIONS.map((option) => {
	                      const checked = launchChains.includes(option.caip2);
	                      return (
                        <label
                          key={option.caip2}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                            (!canCreate || busy) && "opacity-60",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLaunchChain(option.caip2)}
                            disabled={!canCreate || busy}
                          />
                          <span className="flex-1 font-medium">{option.label}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {option.caip2}
                          </span>
                        </label>
                      );
	                    })}
	                  </div>

	                  {launchChains.length > 1 ? (
	                    <div className="grid gap-2">
                      <Label>Home chain</Label>
                      <select
                        className={cn(
                          "w-full h-10 rounded-md border bg-background px-3 text-sm",
                          (!canCreate || busy) && "opacity-60",
                        )}
                        value={launchHomeChain}
                        onChange={(e) => setLaunchHomeChain(e.target.value)}
                        disabled={!canCreate || busy}
                      >
                        {launchChains.map((chain) => (
                          <option key={chain} value={chain}>
                            {(getPrintrEvmChainOption(chain)?.label ?? chain) + ` (${chain})`}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-muted-foreground">
                        You will sign the deployment tx on the home chain.
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      The selected chain is used as the home chain for signing.
                    </div>
                  )}
                </div>
              </div>

              {walletChoices.length ? (
                <div className="space-y-2">
                  <Label>Creator wallet</Label>
                  <select
                    className={cn(
                      "w-full h-10 rounded-md border bg-background px-3 text-sm",
                      (!canCreate || busy) && "opacity-60",
                    )}
                    value={launchCreatorAddress}
                    onChange={(e) => setLaunchCreatorAddress(e.target.value)}
                    disabled={!canCreate || busy}
                  >
                    {walletChoices.map((choice) => (
                      <option key={choice.address} value={choice.address}>
                        {shortHash(choice.address)} · {choice.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground">
                    The deployment transaction must be signed by this wallet.
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="launch-link-website">Website (optional)</Label>
                  <Input
                    id="launch-link-website"
                    value={launchWebsite}
                    onChange={(e) => setLaunchWebsite(e.target.value)}
                    disabled={!canCreate || busy}
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="launch-link-x">X (optional)</Label>
                  <Input
                    id="launch-link-x"
                    value={launchX}
                    onChange={(e) => setLaunchX(e.target.value)}
                    disabled={!canCreate || busy}
                    placeholder="https://x.com/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="launch-link-telegram">Telegram (optional)</Label>
                  <Input
                    id="launch-link-telegram"
                    value={launchTelegram}
                    onChange={(e) => setLaunchTelegram(e.target.value)}
                    disabled={!canCreate || busy}
                    placeholder="https://t.me/…"
                  />
                </div>
              </div>

              {launchQuote?.quote?.total ? (
                <div className="rounded-md border p-3 text-sm">
                  Estimated total cost:{" "}
                  {typeof launchQuote.quote.total.cost_usd === "number"
                    ? `$${launchQuote.quote.total.cost_usd.toFixed(2)}`
                    : "—"}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onGetLaunchQuote}
              disabled={!canCreate || busy || !launchTemplate}
            >
              {quoting ? "Quoting…" : "Get quote"}
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={onLaunchToken}
              disabled={!canCreate || busy || !launchTemplate}
            >
              {launchMode === "update" ? "Update draft" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            const cardBusy =
              creating || signing || createToken.isPending || deleteToken.isPending || updateToken.isPending;

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
                        disabled={!canCreate || cardBusy}
                        onClick={() => openLaunchDialog(template, "create")}
                      >
                        {creating ? "Creating…" : "Create draft"}
                      </Button>
                    ) : status === "created" ? (
                      <>
                        <Button
                          type="button"
                          className="rounded-full"
                          disabled={cardBusy}
                          onClick={() => onSignDeployment(template)}
                        >
                          {signing ? "Signing…" : "Sign deployment"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full"
                          disabled={cardBusy}
                          onClick={() => openLaunchDialog(template, "update")}
                        >
                          Edit draft
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-full"
                          disabled={cardBusy}
                          onClick={() => onResetLaunchDraft(template)}
                        >
                          Reset
                        </Button>
                      </>
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
