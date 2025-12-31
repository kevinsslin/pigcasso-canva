"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Coins, ExternalLink, Loader, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { mantle } from "viem/chains";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { useGetMyTemplates } from "@/features/projects/api/use-get-my-templates";
import { useGetTemplateToken } from "@/features/printr/api/use-get-template-token";
import { useCreateTemplateToken } from "@/features/printr/api/use-create-template-token";
import { useUpdateTemplateToken } from "@/features/printr/api/use-update-template-token";
import { useGetPrintrDeployments } from "@/features/printr/api/use-get-printr-deployments";
import { parseCaip10 } from "@/features/printr/lib/caip";
import { buildEvmTransactionFromPrintrPayload, isPrintrEvmPayload, getPayloadEip155ChainId } from "@/features/printr/lib/payload";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MANTLE_CAIP2 = "eip155:5000";

const deriveSymbol = (name: string) => {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return cleaned || "PIGTEMPLATE";
};

const shortHash = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

export default function CreatorHubLaunchpadPage() {
  const { ready, authenticated } = useRequireAuth("/creator-hub/launchpad");
  const me = useMe({ enabled: ready && authenticated });
  const { wallets } = useWallets();
  const meUser = me.data?.data.user ?? null;

  const myTemplates = useGetMyTemplates({ publicOnly: "true" });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const selectedTemplate = useMemo(() => {
    return (
      myTemplates.data?.find((template) => template.id === selectedTemplateId) ??
      null
    );
  }, [myTemplates.data, selectedTemplateId]);

  const templateToken = useGetTemplateToken(selectedTemplateId || null, {
    enabled: Boolean(selectedTemplateId),
  });

  const createToken = useCreateTemplateToken();
  const updateToken = useUpdateTemplateToken();

  const deployments = useGetPrintrDeployments(
    templateToken.data?.printrTokenId ?? null,
    {
      enabled: Boolean(templateToken.data?.txHash),
      refetchIntervalMs: 5_000,
    },
  );

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [initialBuyMode, setInitialBuyMode] = useState<"supply_percent" | "spend_usd" | "spend_native">("supply_percent");
  const [supplyPercent, setSupplyPercent] = useState(10);
  const [spendUsd, setSpendUsd] = useState(500);
  const [spendNative, setSpendNative] = useState("0");
  const [graduationThreshold, setGraduationThreshold] = useState<69000 | 250000>(69000);
  const [quote, setQuote] = useState<null | {
    quote?: {
      total?: { cost_usd?: number; description?: string };
      costs?: Array<{ cost_usd?: number; description?: string; asset_id?: string }>;
    };
  }>(null);
  const [quoting, setQuoting] = useState(false);
  const [creatorAddress, setCreatorAddress] = useState("");

  useEffect(() => {
    if (!selectedTemplate) {
      setName("");
      setSymbol("");
      setDescription("");
      setWebsite("");
      setX("");
      setTelegram("");
      setQuote(null);
      return;
    }

    setName(selectedTemplate.name);
    setSymbol(deriveSymbol(selectedTemplate.name));
    setDescription(`Template token for “${selectedTemplate.name}”.`);
    setQuote(null);
  }, [selectedTemplate]);

  const chains = [MANTLE_CAIP2];
  const canLaunch =
    me.data?.data.integrations.printr.configured === true &&
    me.data?.data.pro.isPro === true;

  const walletChoices = useMemo(() => {
    const addresses = new Map<string, { address: string; label: string }>();

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
    setCreatorAddress((current) => (current ? current : defaultAddress));
  }, [meUser?.wallets.embedded, meUser?.wallets.external]);

  const buildInitialBuy = () => {
    if (initialBuyMode === "supply_percent") {
      return { supply_percent: supplyPercent };
    }
    if (initialBuyMode === "spend_usd") {
      return { spend_usd: spendUsd };
    }
    return { spend_native: spendNative.trim() };
  };

  const onGetQuote = async () => {
    if (!canLaunch) return;
    if (!selectedTemplate) {
      toast.error("Select a template first.");
      return;
    }

    setQuoting(true);
    toast.loading("Fetching quote…", { id: "printr:quote" });
    try {
      const response = await client.api.printr.print.quote.$post({
        json: {
          chains,
          initial_buy: buildInitialBuy(),
          graduation_threshold_per_chain_usd: graduationThreshold,
        },
      });

      const body = await readApiResponse<{ quote: unknown }>(response, "Failed to fetch quote");
      setQuote(body as typeof quote);
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

  const onCreateToken = async () => {
    if (!canLaunch) return;
    if (!selectedTemplate) {
      toast.error("Select a template first.");
      return;
    }

    if (!name.trim() || !symbol.trim() || !description.trim()) {
      toast.error("Name, symbol, and description are required.");
      return;
    }

    const toastId = toast.loading("Creating token…");
    try {
      await createToken.mutateAsync({
        templateId: selectedTemplate.id,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        chains,
        initial_buy: buildInitialBuy(),
        graduation_threshold_per_chain_usd: graduationThreshold,
        ...(creatorAddress.trim() ? { creatorAddress: creatorAddress.trim() } : {}),
        external_links: {
          ...(website.trim() ? { website: website.trim() } : {}),
          ...(x.trim() ? { x: x.trim() } : {}),
          ...(telegram.trim() ? { telegram: telegram.trim() } : {}),
        },
      });
      toast.success("Token created. Next: sign the deployment tx.", { id: toastId, duration: 3000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create token", {
        id: toastId,
        duration: 4000,
      });
    }
  };

  const onSignDeployment = async () => {
    const record = templateToken.data;
    if (!record) {
      toast.error("Create a token first.");
      return;
    }

    if (record.txHash) {
      toast.message("Deployment transaction already submitted.");
      return;
    }

    if (!record.payload) {
      toast.error("Missing deployment payload.");
      return;
    }

    if (!isPrintrEvmPayload(record.payload)) {
      toast.error("Unsupported deployment payload.");
      return;
    }

    const chainId = getPayloadEip155ChainId(record.payload);
    if (chainId !== mantle.id) {
      toast.error("Only Mantle is supported right now.");
      return;
    }

    const creator = parseCaip10(record.creatorAccount);
    if (!creator) {
      toast.error("Invalid creator account.");
      return;
    }

    const wallet = wallets.find(
      (candidate) =>
        candidate.type === "ethereum" &&
        candidate.address.toLowerCase() === creator.address.toLowerCase(),
    );

    if (!wallet || wallet.type !== "ethereum") {
      toast.error("Creator wallet is not connected.");
      return;
    }

    const toastId = toast.loading("Waiting for wallet signature…");
    try {
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

      toast.success("Transaction submitted.", { id: toastId, duration: 3000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit transaction", {
        id: toastId,
        duration: 5000,
      });
    }
  };

  const printrTokenId = templateToken.data?.printrTokenId ?? null;
  const explorerBase = "https://explorer.mantle.xyz";
  const mantleDeployment = deployments.data?.deployments?.find((d) => d.chain_id === MANTLE_CAIP2) ?? null;
  const launchedTemplateId = templateToken.data?.templateProjectId ?? null;
  const launchStatus = templateToken.data?.status ?? null;
  const updateTemplateToken = updateToken.mutate;
  const updatingTemplateToken = updateToken.isPending;

  useEffect(() => {
    if (!launchedTemplateId) return;
    if (!mantleDeployment?.status) return;

    const nextStatus =
      mantleDeployment.status === "live"
        ? "live"
        : mantleDeployment.status === "failed"
          ? "failed"
          : null;
    if (!nextStatus) return;
    if (launchStatus === nextStatus) return;
    if (updatingTemplateToken) return;

    updateTemplateToken({
      templateId: launchedTemplateId,
      status: nextStatus,
    });
  }, [
    mantleDeployment?.status,
    launchStatus,
    launchedTemplateId,
    updatingTemplateToken,
    updateTemplateToken,
  ]);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Template Token Launchpad</h1>
          <p className="text-sm text-muted-foreground">
            Launch a token for your template on Printr.
          </p>
        </div>
        <Button asChild variant="secondary" className="rounded-full">
          <Link href="/creator-hub">Back to Creator Hub</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              Template Tokens
            </CardTitle>
            <CardDescription>
              Turn templates into tradable assets (beyond Canva templates).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>One token per template/creator (design asset)</li>
              <li>Price discovery driven by meme + usage cashflow narrative</li>
              <li>Markets powered by Printr (internal/external markets)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              Stake-to-Use
            </CardTitle>
            <CardDescription>
              Unlock templates by staking tokens or paying (roadmap).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Stake to unlock template usage (discounts/credits)</li>
              <li>Optional pay-to-use as a fallback (roadmap)</li>
              <li>Usage events feed creator analytics + token narrative</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            Launch a Template Token (Mantle)
          </CardTitle>
          <CardDescription>
            Create an ERC20 template token via Printr. Users will be able to stake-to-use or pay-to-use (roadmap).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!me.data?.data.integrations.printr.configured ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Launchpad is temporarily unavailable.
            </div>
          ) : null}
          {me.data?.data.integrations.printr.configured && !me.data?.data.pro.isPro ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Pro required to launch template tokens. Hold 100,000 PIGCASSO on Mantle to unlock Pro.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <select
                className={cn(
                  "w-full h-10 rounded-md border bg-background px-3 text-sm",
                  !canLaunch && "opacity-60",
                )}
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={!canLaunch || myTemplates.isLoading}
              >
                <option value="">Select a template…</option>
                {myTemplates.data?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.token.printrTokenId ? "(launched)" : ""}
                  </option>
                ))}
              </select>
              {myTemplates.isLoading ? (
                <div className="text-xs text-muted-foreground">Loading templates…</div>
              ) : null}
              {myTemplates.isError ? (
                <div className="text-xs text-muted-foreground">
                  {myTemplates.error?.message || "Failed to load templates"}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Chains</Label>
              <Input value="Mantle Mainnet (eip155:5000)" readOnly />
              <div className="text-xs text-muted-foreground">
                Multi-chain deployments are supported later (roadmap).
              </div>
            </div>
          </div>

          {walletChoices.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Creator wallet</Label>
                <select
                  className={cn(
                    "w-full h-10 rounded-md border bg-background px-3 text-sm",
                    !canLaunch && "opacity-60",
                  )}
                  value={creatorAddress}
                  onChange={(e) => setCreatorAddress(e.target.value)}
                  disabled={!canLaunch}
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
            </div>
          ) : null}

          {selectedTemplate ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token name</Label>
                <Input
                  id="token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canLaunch}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-symbol">Token symbol</Label>
                <Input
                  id="token-symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  disabled={!canLaunch}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="token-description">Description</Label>
                <Textarea
                  id="token-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canLaunch}
                />
              </div>
            </div>
          ) : null}

          {selectedTemplate ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="link-website">Website (optional)</Label>
                <Input
                  id="link-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!canLaunch}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-x">X (optional)</Label>
                <Input
                  id="link-x"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  disabled={!canLaunch}
                  placeholder="https://x.com/…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-telegram">Telegram (optional)</Label>
                <Input
                  id="link-telegram"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  disabled={!canLaunch}
                  placeholder="https://t.me/…"
                />
              </div>
            </div>
          ) : null}

          {selectedTemplate ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Initial buy</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={initialBuyMode}
                  onChange={(e) =>
                    setInitialBuyMode(e.target.value as typeof initialBuyMode)
                  }
                  disabled={!canLaunch}
                >
                  <option value="supply_percent">Supply (%)</option>
                  <option value="spend_usd">Spend (USD)</option>
                  <option value="spend_native">Spend (native)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  {initialBuyMode === "supply_percent"
                    ? "Supply percent"
                    : initialBuyMode === "spend_usd"
                      ? "Spend USD"
                      : "Spend native (atomic)"}
                </Label>
                <Input
                  value={
                    initialBuyMode === "supply_percent"
                      ? String(supplyPercent)
                      : initialBuyMode === "spend_usd"
                        ? String(spendUsd)
                        : spendNative
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (initialBuyMode === "supply_percent") {
                      setSupplyPercent(Number(value));
                    } else if (initialBuyMode === "spend_usd") {
                      setSpendUsd(Number(value));
                    } else {
                      setSpendNative(value);
                    }
                  }}
                  disabled={!canLaunch}
                />
              </div>
              <div className="space-y-2">
                <Label>Graduation threshold</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={graduationThreshold}
                  onChange={(e) =>
                    setGraduationThreshold(Number(e.target.value) as typeof graduationThreshold)
                  }
                  disabled={!canLaunch}
                >
                  <option value={69000}>$69,000</option>
                  <option value={250000}>$250,000</option>
                </select>
              </div>
            </div>
          ) : null}

          {quote?.quote?.total ? (
            <div className="rounded-lg border">
              <div className="p-4 text-sm font-medium">
                Total estimated cost:{" "}
                {typeof quote.quote.total.cost_usd === "number"
                  ? `$${quote.quote.total.cost_usd.toFixed(2)}`
                  : "—"}
              </div>
              {quote.quote.costs?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>USD</TableHead>
                      <TableHead>Asset</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.quote.costs.map((cost, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {cost.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {typeof cost.cost_usd === "number"
                            ? `$${cost.cost_usd.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {cost.asset_id ? shortHash(cost.asset_id) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onGetQuote}
              disabled={!canLaunch || !selectedTemplate || quoting}
            >
              {quoting ? <Loader className="size-4 mr-2 animate-spin" /> : null}
              Get quote
            </Button>
            <Button
              type="button"
              onClick={onCreateToken}
              disabled={
                !canLaunch ||
                !selectedTemplate ||
                createToken.isPending ||
                Boolean(templateToken.data?.printrTokenId)
              }
            >
              {createToken.isPending ? (
                <Loader className="size-4 mr-2 animate-spin" />
              ) : null}
              Create token
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSignDeployment}
              disabled={!canLaunch || !templateToken.data || updateToken.isPending}
            >
              {updateToken.isPending ? (
                <Loader className="size-4 mr-2 animate-spin" />
              ) : null}
              Sign deployment
            </Button>
          </div>

          {printrTokenId ? (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-medium">
                  Token: <span className="font-mono">{shortHash(printrTokenId)}</span>
                </div>
                <Button asChild variant="secondary" className="rounded-full" size="sm">
                  <a
                    href={`https://printr.money/token/${encodeURIComponent(printrTokenId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Printr <ExternalLink className="size-4 ml-2" />
                  </a>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Status: {templateToken.data?.status ?? "—"}
                {templateToken.data?.txHash ? (
                  <>
                    {" "}
                    · Tx: <span className="font-mono">{shortHash(templateToken.data.txHash)}</span>
                  </>
                ) : null}
              </div>

              {mantleDeployment?.contract_address ? (
                <div className="text-xs">
                  Contract:{" "}
                  <a
                    className="underline font-mono"
                    href={`${explorerBase}/address/${mantleDeployment.contract_address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(mantleDeployment.contract_address)}
                  </a>
                </div>
              ) : null}

              {deployments.isFetching ? (
                <div className="text-xs text-muted-foreground">Refreshing deployment status…</div>
              ) : null}
              {deployments.data?.deployments?.length ? (
                <div className="text-xs text-muted-foreground">
                  Deployments:{" "}
                  {deployments.data.deployments
                    .map((d) => `${d.chain_id}=${d.status}`)
                    .join(" · ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
