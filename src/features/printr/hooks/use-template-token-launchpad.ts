import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { useGetMyTemplates } from "@/features/projects/api/use-get-my-templates";
import { useCreateTemplateToken } from "@/features/printr/api/use-create-template-token";
import { useGetPrintrDeployments } from "@/features/printr/api/use-get-printr-deployments";
import { useGetTemplateToken } from "@/features/printr/api/use-get-template-token";
import { useUpdateTemplateToken } from "@/features/printr/api/use-update-template-token";
import { MANTLE_CAIP2 } from "@/features/printr/constants";
import { parseCaip10 } from "@/features/printr/lib/caip";
import {
  buildEvmTransactionFromPrintrPayload,
  getPayloadEip155ChainId,
  isPrintrEvmPayload,
} from "@/features/printr/lib/payload";
import { deriveTemplateTokenSymbol } from "@/features/printr/lib/format";
import { getPrintrEvmChainOption } from "@/features/printr/supported-chains";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";

type InitialBuyMode = "supply_percent" | "spend_usd" | "spend_native";

type QuoteState = null | {
  quote?: {
    total?: { cost_usd?: number; description?: string };
    costs?: Array<{ cost_usd?: number; description?: string; asset_id?: string }>;
  };
};

type WalletChoice = { address: string; label: string };

export const useTemplateTokenLaunchpad = (redirectPath = "/creator-hub/launchpad") => {
  const { ready, authenticated } = useRequireAuth(redirectPath);
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
  const [initialBuyMode, setInitialBuyMode] = useState<InitialBuyMode>("supply_percent");
  const [supplyPercent, setSupplyPercent] = useState(10);
  const [spendUsd, setSpendUsd] = useState(500);
  const [spendNative, setSpendNative] = useState("0");
  const [graduationThreshold, setGraduationThreshold] = useState<69000 | 250000>(69000);
  const [quote, setQuote] = useState<QuoteState>(null);
  const [quoting, setQuoting] = useState(false);
  const [creatorAddress, setCreatorAddress] = useState("");
  const [chains, setChains] = useState<string[]>([MANTLE_CAIP2]);
  const [customChain, setCustomChain] = useState("");

  useEffect(() => {
    if (!selectedTemplate) {
      setName("");
      setSymbol("");
      setDescription("");
      setWebsite("");
      setX("");
      setTelegram("");
      setQuote(null);
      setChains([MANTLE_CAIP2]);
      setCustomChain("");
      return;
    }

    setName(selectedTemplate.name);
    setSymbol(deriveTemplateTokenSymbol(selectedTemplate.name));
    setDescription(`Template token for “${selectedTemplate.name}”.`);
    setQuote(null);
    setChains([MANTLE_CAIP2]);
    setCustomChain("");
  }, [selectedTemplate]);

  const canLaunch =
    me.data?.data.integrations.printr.configured === true &&
    me.data?.data.pro.isPro === true;

  const tokenLocked = Boolean(templateToken.data);
  const effectiveChains = templateToken.data?.chains?.length ? templateToken.data.chains : chains;
  const homeChain = effectiveChains[0] ?? MANTLE_CAIP2;

  const toggleChain = (chainId: string) => {
    if (tokenLocked) return;
    setChains((current) => {
      const alreadySelected = current.includes(chainId);
      if (alreadySelected) {
        if (current.length <= 1) return current;
        const next = current.filter((value) => value !== chainId);
        return next.length ? next : current;
      }
      return [...current, chainId];
    });
  };

  const setHomeChain = (chainId: string) => {
    if (tokenLocked) return;
    setChains((current) => {
      if (!current.includes(chainId)) return current;
      return [chainId, ...current.filter((value) => value !== chainId)];
    });
  };

  const addCustomChain = () => {
    if (tokenLocked) return;
    const trimmed = customChain.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("eip155:")) {
      toast.error("Custom chain must be an EVM CAIP-2 id (eip155:…).");
      return;
    }
    if (!/^eip155:\\d+$/.test(trimmed)) {
      toast.error("Invalid CAIP-2 format. Example: eip155:8453");
      return;
    }

    setChains((current) => {
      if (current.includes(trimmed)) return current;
      return [...current, trimmed];
    });
    setCustomChain("");
  };

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
    if (!effectiveChains.length) {
      toast.error("Select at least one chain.");
      return;
    }

    setQuoting(true);
    toast.loading("Fetching quote…", { id: "printr:quote" });
    try {
      const response = await client.api.printr.print.quote.$post({
        json: {
          chains: effectiveChains,
          initial_buy: buildInitialBuy(),
          graduation_threshold_per_chain_usd: graduationThreshold,
        },
      });

      const body = await readApiResponse<{ quote: unknown }>(response, "Failed to fetch quote");
      setQuote(body as QuoteState);
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
    if (!effectiveChains.length) {
      toast.error("Select at least one chain.");
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
        chains: effectiveChains,
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
    if (!chainId) {
      toast.error("Invalid deployment payload chain.");
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
        transport: custom(provider),
      });

      const tx = buildEvmTransactionFromPrintrPayload(record.payload);
      const hash = await walletClient.sendTransaction({ ...tx, chain: null });

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
  const homeDeployment =
    deployments.data?.deployments?.find((deployment) => deployment.chain_id === homeChain) ?? null;
  const homeChainExplorerBaseUrl = getPrintrEvmChainOption(homeChain)?.explorerBaseUrl ?? null;
  const launchedTemplateId = templateToken.data?.templateProjectId ?? null;
  const launchStatus = templateToken.data?.status ?? null;
  const updateTemplateToken = updateToken.mutate;
  const updatingTemplateToken = updateToken.isPending;

  useEffect(() => {
    if (!launchedTemplateId) return;
    if (!homeDeployment?.status) return;

    const nextStatus =
      homeDeployment.status === "live"
        ? "live"
        : homeDeployment.status === "failed"
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
    homeDeployment?.status,
    launchStatus,
    launchedTemplateId,
    updatingTemplateToken,
    updateTemplateToken,
  ]);

  return {
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
    chains: effectiveChains,
    tokenLocked,
    customChain,
    setCustomChain,
    toggleChain,
    setHomeChain,
    addCustomChain,
    initialBuyMode,
    setInitialBuyMode,
    supplyPercent,
    setSupplyPercent,
    spendUsd,
    setSpendUsd,
    spendNative,
    setSpendNative,
    graduationThreshold,
    setGraduationThreshold,
    quote,
    quoting,
    onGetQuote,
    createToken,
    onCreateToken,
    updateToken,
    onSignDeployment,
    printrTokenId,
  };
};
