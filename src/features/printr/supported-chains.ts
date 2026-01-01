import type { Chain } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  mantle,
  monad,
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
  buildOption(arbitrum, "Arbitrum"),
  buildOption(avalanche, "Avalanche"),
  buildOption(base, "Base"),
  buildOption(bsc, "BNB"),
  buildOption(mainnet, "Ethereum"),
  buildOption(mantle, "Mantle"),
  buildOption(monad, "Monad"),
];

export const getPrintrEvmChainOption = (caip2: string): PrintrEvmChainOption | null =>
  PRINTR_EVM_CHAIN_OPTIONS.find((opt) => opt.caip2 === caip2) ?? null;

export const getViemChainByCaip2 = (caip2: string): Chain | null =>
  getPrintrEvmChainOption(caip2)?.chain ?? null;
