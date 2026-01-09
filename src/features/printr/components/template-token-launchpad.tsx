"use client";

import Link from "next/link";
import { ArrowLeftRight, Coins, ExternalLink, Loader, Sparkles } from "lucide-react";

import { buildPrintrTokenUrl } from "@/features/printr/constants";
import { shortHash } from "@/features/printr/lib/format";
import { useTemplateTokenLaunchpad } from "@/features/printr/hooks/use-template-token-launchpad";
import { PRINTR_EVM_CHAIN_OPTIONS, getPrintrEvmChainOption } from "@/features/printr/supported-chains";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const TemplateTokenLaunchpad = () => {
  const {
    ready,
    authenticated,
    me,
    canLaunch,
    myTemplates,
    selectedTemplate,
    selectedTemplateId,
    setSelectedTemplateId,
    templateToken,
    deployments,
    homeChain,
    homeDeployment,
    homeChainExplorerBaseUrl,
    walletChoices,
    creatorAddress,
    setCreatorAddress,
    name,
    setName,
    symbol,
    setSymbol,
    description,
    setDescription,
    website,
    setWebsite,
    x,
    setX,
    telegram,
    setTelegram,
    initialBuyMode,
    setInitialBuyMode,
    supplyPercent,
    setSupplyPercent,
    spendUsd,
    setSpendUsd,
    spendNative,
    setSpendNative,
    chains,
    tokenLocked,
    toggleChain,
    setHomeChain,
    graduationThreshold,
    setGraduationThreshold,
    quote,
    quoting,
    onGetQuote,
    createToken,
    onCreateToken,
    deleteToken,
    onResetDraft,
    updateToken,
    onSignDeployment,
    printrTokenId,
  } = useTemplateTokenLaunchpad();

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
          <Link href="/app">Back</Link>
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
              Launch a Template Token
            </CardTitle>
            <CardDescription>
              Create an ERC20 template token via Printr. Select one or more chains (first chain is the home chain you sign on).
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
                    {template.name} {template.token?.printrTokenId ? "(launched)" : ""}
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
              {tokenLocked ? (
                <>
                  <Input
                    value={chains
                      .map((chain) => getPrintrEvmChainOption(chain)?.label ?? chain)
                      .join(", ")}
                    readOnly
                  />
                  <div className="text-xs text-muted-foreground">
                    Chains are locked after token creation.
                  </div>
                </>
              ) : (
                <div className="rounded-md border p-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PRINTR_EVM_CHAIN_OPTIONS.map((option) => {
                      const checked = chains.includes(option.caip2);
                      return (
                        <label
                          key={option.caip2}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                            !canLaunch && "opacity-60",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChain(option.caip2)}
                            disabled={!canLaunch}
                          />
                          <span className="flex-1 font-medium">{option.label}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {option.caip2}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {chains.length > 1 ? (
                    <div className="grid gap-2">
                      <Label>Home chain</Label>
                      <select
                        className={cn(
                          "w-full h-10 rounded-md border bg-background px-3 text-sm",
                          !canLaunch && "opacity-60",
                        )}
                        value={homeChain}
                        onChange={(e) => setHomeChain(e.target.value)}
                        disabled={!canLaunch}
                      >
                        {chains.map((chain) => (
                          <option key={chain} value={chain}>
                            {(getPrintrEvmChainOption(chain)?.label ?? chain) + ` (${chain})`}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-muted-foreground">
                        The deployment transaction is signed on the home chain.
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      The selected chain is used as the home chain for signing.
                    </div>
                  )}
                </div>
              )}
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
                {initialBuyMode === "supply_percent" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[Number.isFinite(supplyPercent) ? supplyPercent : 0]}
                        min={0}
                        max={69}
                        step={0.1}
                        onValueChange={(value) => setSupplyPercent(value[0] ?? 0)}
                        disabled={!canLaunch}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={69}
                        step={0.1}
                        className="w-24"
                        value={String(supplyPercent)}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value);
                          setSupplyPercent(Number.isFinite(value) ? value : 0);
                        }}
                        disabled={!canLaunch}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      0%–69% (0% = no initial buy)
                    </div>
                  </div>
                ) : initialBuyMode === "spend_usd" ? (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={String(spendUsd)}
                    onChange={(e) => {
                      const value = Number.parseFloat(e.target.value);
                      setSpendUsd(Number.isFinite(value) ? value : 0);
                    }}
                    disabled={!canLaunch}
                  />
                ) : (
                  <Input
                    value={spendNative}
                    onChange={(e) => setSpendNative(e.target.value)}
                    disabled={!canLaunch}
                  />
                )}
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
              variant="ghost"
              onClick={onResetDraft}
              disabled={
                !canLaunch ||
                !templateToken.data ||
                deleteToken.isPending ||
                templateToken.data.status !== "created" ||
                Boolean(templateToken.data.txHash)
              }
            >
              {deleteToken.isPending ? (
                <Loader className="size-4 mr-2 animate-spin" />
              ) : null}
              Reset draft
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
                    href={buildPrintrTokenUrl(printrTokenId)}
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

              {homeDeployment?.contract_address ? (
                <div className="text-xs">
                  Contract:{" "}
                  {homeChainExplorerBaseUrl ? (
                    <a
                      className="underline font-mono"
                      href={`${homeChainExplorerBaseUrl}/address/${homeDeployment.contract_address}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortHash(homeDeployment.contract_address)}
                    </a>
                  ) : (
                    <span className="font-mono">{shortHash(homeDeployment.contract_address)}</span>
                  )}
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
};
