import { base64ToHex } from "@/features/printr/lib/base64";
import { parseCaip10, parseCaip2, getEip155ChainId } from "@/features/printr/lib/caip";

export type PrintrEvmPayload = {
  to: string;
  calldata: string;
  value: string;
  gas_limit: number;
  hash?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

export const isPrintrEvmPayload = (value: unknown): value is PrintrEvmPayload => {
  if (!isRecord(value)) return false;

  return (
    typeof value.to === "string" &&
    typeof value.calldata === "string" &&
    typeof value.value === "string" &&
    typeof value.gas_limit === "number"
  );
};

export const buildEvmTransactionFromPrintrPayload = (payload: PrintrEvmPayload) => {
  const toParsed = parseCaip10(payload.to);
  if (!toParsed) {
    throw new Error("Invalid payload recipient");
  }

  const calldataHex = base64ToHex(payload.calldata);
  const value = BigInt(payload.value);
  const gas = BigInt(payload.gas_limit);

  return {
    to: toParsed.address as `0x${string}`,
    data: calldataHex,
    value,
    gas,
  };
};

export const getPayloadEip155ChainId = (payload: PrintrEvmPayload): number | null => {
  const toParsed = parseCaip10(payload.to);
  if (!toParsed) return null;
  const chain = parseCaip2(toParsed.chain);
  if (!chain) return null;
  return getEip155ChainId(chain.value);
};

