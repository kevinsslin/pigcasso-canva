import type { Chain } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  blast,
  bsc,
  linea,
  mainnet,
  mantle,
  mode,
  optimism,
  polygon,
  polygonZkEvm,
  scroll,
  zora,
} from "viem/chains";

export type PrintrEvmChainOption = {
  caip2: `eip155:${number}`;
  chainId: number;
  label: string;
  chain: Chain;
  explorerBaseUrl?: string;
};

const buildOption = (chain: Chain, label: string): PrintrEvmChainOption => ({
  caip2: `eip155:${chain.id}`,
  chainId: chain.id,
  label,
  chain,
  explorerBaseUrl: chain.blockExplorers?.default.url ?? undefined,
});

export const PRINTR_EVM_CHAIN_OPTIONS: PrintrEvmChainOption[] = [
  buildOption(mantle, "Mantle"),
  buildOption(mainnet, "Ethereum"),
  buildOption(base, "Base"),
  buildOption(arbitrum, "Arbitrum One"),
  buildOption(optimism, "Optimism"),
  buildOption(polygon, "Polygon"),
  buildOption(avalanche, "Avalanche"),
  buildOption(bsc, "BNB Chain"),
  buildOption(linea, "Linea"),
  buildOption(blast, "Blast"),
  buildOption(scroll, "Scroll"),
  buildOption(zora, "Zora"),
  buildOption(mode, "Mode"),
  buildOption(polygonZkEvm, "Polygon zkEVM"),
].sort((a, b) => a.label.localeCompare(b.label));

export const getPrintrEvmChainOption = (caip2: string): PrintrEvmChainOption | null =>
  PRINTR_EVM_CHAIN_OPTIONS.find((opt) => opt.caip2 === caip2) ?? null;

export const getViemChainByCaip2 = (caip2: string): Chain | null =>
  getPrintrEvmChainOption(caip2)?.chain ?? null;

