"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createWalletClient, custom } from "viem";
import { useWallets } from "@privy-io/react-auth";

import { useMe } from "@/features/auth/api/use-me";
import { useGetPrintrDeployments } from "@/features/printr/api/use-get-printr-deployments";
import { MANTLE_CAIP2, buildPrintrTokenUrl } from "@/features/printr/constants";
import { shortHash } from "@/features/printr/lib/format";
import {
  buildEvmTransactionFromPrintrPayload,
  getPayloadEip155ChainId,
  isPrintrEvmPayload,
} from "@/features/printr/lib/payload";
import { getPrintrEvmChainOption } from "@/features/printr/supported-chains";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type CanvasPrintrLaunchTarget = {
  canvasId: string;
  canvasName: string;
  shapeId: string;
  imageDataUrl: string;
  defaultName?: string | null;
};

type PrintrPrintResponse = {
  token_id: string;
  payload: unknown;
  quote?: unknown;
};

const deriveSymbol = (value: string) => {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return cleaned || "PIG";
};

const isUserRejectedWalletAction = (error: unknown) => {
  let current: any = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const code = (current as any)?.code;
    if (code === 4001 || code === "ACTION_REJECTED") return true;

    const messageRaw =
      (typeof (current as any)?.shortMessage === "string" && (current as any).shortMessage) ||
      (typeof (current as any)?.message === "string" && (current as any).message) ||
      "";
    const message = messageRaw.toLowerCase();
    if (
      message.includes("user rejected") ||
      message.includes("rejected the request") ||
      message.includes("user denied") ||
      message.includes("denied transaction") ||
      message.includes("denied signature")
    ) {
      return true;
    }

    current = (current as any)?.cause;
  }
  return false;
};

const getBase64FromDataUrl = (dataUrl: string) => {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return "";
  return dataUrl.slice(comma + 1).trim();
};

export const CanvasPrintrLaunchDialog = ({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CanvasPrintrLaunchTarget | null;
}) => {
  const me = useMe({ enabled: open });
  const { wallets } = useWallets();

  const ipfsConfigured = me.data?.data.integrations.ipfs.configured;
  const printrConfigured = me.data?.data.integrations.printr.configured;
  const isPro = me.data?.data.pro.isPro;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [supplyPercent, setSupplyPercent] = useState("0");
  const [tokenResult, setTokenResult] = useState<PrintrPrintResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connectedEthereumWallets = useMemo(
    () => wallets.filter((wallet) => wallet.type === "ethereum"),
    [wallets],
  );

  const externalWalletAddress = me.data?.data.user.wallets.external?.toLowerCase() ?? null;
  const embeddedWalletAddress = me.data?.data.user.wallets.embedded?.toLowerCase() ?? null;

  const preferredWallet = useMemo(() => {
    const candidates = [externalWalletAddress, embeddedWalletAddress].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const match = connectedEthereumWallets.find((wallet) => wallet.address.toLowerCase() === candidate);
      if (match) return match;
    }
    return connectedEthereumWallets[0] ?? null;
  }, [connectedEthereumWallets, embeddedWalletAddress, externalWalletAddress]);

  useEffect(() => {
    if (!open) {
      setName("");
      setSymbol("");
      setDescription("");
      setSupplyPercent("0");
      setTokenResult(null);
      setTxHash(null);
      setBusy(false);
      return;
    }

    const baseName = target?.defaultName?.trim() || target?.canvasName?.trim() || "Untitled";
    setName(`${baseName} · Token`);
    setSymbol(deriveSymbol(baseName));
    setDescription("Launched from Pigcasso Canvas.");
    setSupplyPercent("0");
    setTokenResult(null);
    setTxHash(null);
  }, [open, target?.canvasName, target?.defaultName]);

  const deployments = useGetPrintrDeployments(tokenResult?.token_id ?? null, {
    enabled: Boolean(tokenResult?.token_id),
    refetchIntervalMs: 5_000,
  });

  const canLaunch = Boolean(printrConfigured) && Boolean(isPro);
  const homeDeployment = deployments.data?.deployments?.find((deployment) => deployment.chain_id === MANTLE_CAIP2) ?? null;
  const homeExplorer = getPrintrEvmChainOption(MANTLE_CAIP2)?.explorerBaseUrl ?? null;

  const handleCreateToken = async () => {
    if (!target) return;
    if (!printrConfigured) {
      toast.error("Printr is not configured.");
      return;
    }
    if (!isPro) {
      toast.error("Pro required to launch tokens on Printr.");
      return;
    }
    if (!preferredWallet || preferredWallet.type !== "ethereum") {
      toast.error("Connect an Ethereum wallet to launch.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedSymbol || !trimmedDescription) {
      toast.error("Fill in name, symbol, and description first.");
      return;
    }

    const supplyPercentNum = Number(supplyPercent);
    if (!Number.isFinite(supplyPercentNum) || supplyPercentNum < 0 || supplyPercentNum > 69) {
      toast.error("Supply percent must be between 0 and 69.");
      return;
    }

    const base64Image = getBase64FromDataUrl(target.imageDataUrl);
    if (!base64Image) {
      toast.error("Missing token image.");
      return;
    }

    setBusy(true);
    const toastId = toast.loading("Creating token draft…");
    try {
      const response = await client.api.printr.print.$post({
        json: {
          creator_accounts: [`${MANTLE_CAIP2}:${preferredWallet.address.toLowerCase()}`],
          name: trimmedName,
          symbol: trimmedSymbol,
          description: trimmedDescription,
          image: base64Image,
          chains: [MANTLE_CAIP2],
          initial_buy: { supply_percent: supplyPercentNum },
          graduation_threshold_per_chain_usd: 69000,
        },
      });

      const body = await readApiResponse<PrintrPrintResponse>(response, "Failed to create Printr token");
      if (!body?.token_id || !body.payload) {
        throw new Error("Printr returned an unexpected response.");
      }

      setTokenResult(body);
      toast.success("Token draft created.", { id: toastId, duration: 2500 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create token", {
        id: toastId,
        duration: 4500,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSignDeployment = async () => {
    if (!tokenResult?.payload) {
      toast.error("Create a token draft first.");
      return;
    }

    if (!preferredWallet || preferredWallet.type !== "ethereum") {
      toast.error("Creator wallet is not connected.");
      return;
    }

    if (!isPrintrEvmPayload(tokenResult.payload)) {
      toast.error("Unsupported deployment payload.");
      return;
    }

    const chainId = getPayloadEip155ChainId(tokenResult.payload);
    if (!chainId) {
      toast.error("Invalid deployment payload chain.");
      return;
    }

    setBusy(true);
    const toastId = toast.loading("Waiting for wallet signature…");
    try {
      await preferredWallet.switchChain(chainId);
      const provider = await preferredWallet.getEthereumProvider();

      const walletClient = createWalletClient({
        account: preferredWallet.address as `0x${string}`,
        transport: custom(provider),
      });

      const tx = buildEvmTransactionFromPrintrPayload(tokenResult.payload);
      const hash = await walletClient.sendTransaction({ ...tx, chain: null });
      setTxHash(hash);
      toast.success("Transaction submitted.", { id: toastId, duration: 3000 });
    } catch (error) {
      if (isUserRejectedWalletAction(error)) {
        toast.message("User rejected the transaction.", { id: toastId, duration: 2500 });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to submit transaction", {
        id: toastId,
        duration: 4500,
      });
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(target?.imageDataUrl);

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Launch on Printr</DialogTitle>
          <DialogDescription>
            Turn this canvas into a tradable token. (Pro required)
          </DialogDescription>
        </DialogHeader>

        {!ready ? (
          <div className="text-sm text-muted-foreground">Select an image on the canvas to launch.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="md:col-span-2 space-y-3">
              <div className="rounded-xl border bg-muted/30 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={target?.imageDataUrl ?? ""} alt="" className="h-44 w-full object-cover" />
              </div>

              {!printrConfigured ? (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  Printr is not configured. Set `PRINTR_API_TOKEN` and redeploy.
                </div>
              ) : null}

              {printrConfigured && !isPro ? (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  Pro required to launch tokens. Hold 100,000 PIGCASSO on Mantle to unlock Pro.
                </div>
              ) : null}

              {ipfsConfigured ? null : (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  Tip: Configure IPFS to mint NFTs from this board too.
                </div>
              )}
            </div>

            <div className="md:col-span-3 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Symbol</div>
                  <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={busy} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Initial buy (% supply)</div>
                  <Input
                    value={supplyPercent}
                    onChange={(e) => setSupplyPercent(e.target.value)}
                    disabled={busy}
                    inputMode="numeric"
                    placeholder="0"
                  />
                  <div className="text-[11px] text-muted-foreground">0–69 (higher = more upfront liquidity)</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Description</div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={busy}
                  className="min-h-[96px]"
                />
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-sm font-medium">Chain</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {getPrintrEvmChainOption(MANTLE_CAIP2)?.label ?? "Mantle"} ({MANTLE_CAIP2})
                </div>
              </div>

              {tokenResult ? (
                <div className="rounded-xl border bg-background/60 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Token</div>
                    <a
                      href={buildPrintrTokenUrl(tokenResult.token_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                    >
                      View on Printr <ExternalLink className="ml-1 size-3" />
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {tokenResult.token_id}
                  </div>

                  {txHash ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Submitted: <span className="font-mono">{shortHash(txHash)}</span>
                      {homeExplorer ? (
                        <a
                          className="ml-2 inline-flex items-center text-primary hover:underline"
                          href={`${homeExplorer.replace(/\/$/, "")}/tx/${encodeURIComponent(txHash)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Explorer <ExternalLink className="ml-1 size-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {deployments.isFetching && deployments.data?.deployments?.length ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Checking deployments…
                    </div>
                  ) : null}

                  {homeDeployment ? (
                    <div
                      className={cn(
                        "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                        homeDeployment.status === "live" ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-background",
                      )}
                    >
                      {homeDeployment.status === "live" ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : homeDeployment.status === "failed" ? (
                        <AlertTriangle className="size-4 text-red-500" />
                      ) : (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                      <span className="font-medium">Mantle:</span>
                      <span className="text-muted-foreground">{homeDeployment.status}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          {!tokenResult ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={busy || !canLaunch || !ready}
              onClick={() => void handleCreateToken()}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create token draft
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-full"
              disabled={busy || !canLaunch || !ready || Boolean(txHash)}
              onClick={() => void handleSignDeployment()}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {txHash ? "Transaction submitted" : "Sign deployment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
