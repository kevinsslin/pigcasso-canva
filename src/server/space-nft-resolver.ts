import {
  createPublicClient,
  erc1155Abi,
  erc721Abi,
  getAddress,
  http,
  isAddress,
  type Address,
} from "viem";
import { arbitrum, avalanche, base, bsc, mainnet, mantle, monad } from "viem/chains";

import { ipfsToHttpUrl } from "@/features/nfts/ipfs";
import { HttpError } from "@/server/http-error";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

type SupportedChain = typeof mainnet | typeof base | typeof arbitrum | typeof avalanche | typeof bsc | typeof mantle | typeof monad;

const SUPPORTED_CHAINS: Record<number, SupportedChain> = {
  [mainnet.id]: mainnet,
  [arbitrum.id]: arbitrum,
  [avalanche.id]: avalanche,
  [base.id]: base,
  [bsc.id]: bsc,
  [mantle.id]: mantle,
  [monad.id]: monad,
};

export type SpaceNftTokenStandard = "erc721" | "erc1155" | "unknown";

export type SpaceResolvedNft = {
  chainId: number;
  contractAddress: Address;
  tokenId: string;
  tokenUri: string | null;
  tokenStandard: SpaceNftTokenStandard;
  name: string | null;
  imageUrl: string | null;
  ownedBy: Address | null;
};

const getChainById = (chainId: number) => SUPPORTED_CHAINS[chainId] ?? null;

const uniqueAddresses = (addresses: Array<string | null | undefined>) => {
  const out: Address[] = [];
  const seen = new Set<string>();

  for (const addr of addresses) {
    if (!addr) continue;
    const trimmed = addr.trim();
    if (!trimmed) continue;
    if (!isAddress(trimmed)) continue;
    const normalized = getAddress(trimmed);
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
};

const buildPublicClient = (chainId: number) => {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new HttpError(400, `Unsupported chainId: ${chainId}`);
  }

  const mantleRpcUrl = process.env.MANTLE_RPC_URL?.trim();
  if (chain.id === mantle.id && mantleRpcUrl) {
    return createPublicClient({
      chain,
      transport: http(mantleRpcUrl),
    });
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
};

const parseTokenId = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new HttpError(400, "Missing tokenId");
  }

  try {
    const bigintValue = BigInt(trimmed);
    if (bigintValue < BigInt(0)) {
      throw new HttpError(400, "tokenId must be non-negative");
    }
    return bigintValue;
  } catch {
    throw new HttpError(400, "Invalid tokenId");
  }
};

const toErc1155HexTokenId = (tokenId: bigint) => tokenId.toString(16).padStart(64, "0").toLowerCase();

export const applyErc1155UriTemplate = (template: string, tokenId: bigint) => {
  if (!template.includes("{id}") && !template.toLowerCase().includes("{id}")) {
    return template;
  }

  const hex = toErc1155HexTokenId(tokenId);
  return template.replaceAll("{id}", hex).replaceAll("{ID}", hex).replaceAll("{Id}", hex).replaceAll("{iD}", hex);
};

const normalizeTokenUri = (value: string | null) => {
  const uri = value?.trim();
  if (!uri) return null;

  if (uri.startsWith("ipfs://")) {
    return ipfsToHttpUrl(uri);
  }

  if (uri.startsWith("ar://")) {
    const rest = uri.slice("ar://".length);
    if (!rest) return null;
    return `https://arweave.net/${rest}`;
  }

  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    return uri;
  }

  return null;
};

const parseJsonDataUri = (value: string) => {
  const match = value.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) return null;

  const [, base64Flag, payload] = match;
  try {
    const decoded = base64Flag
      ? Buffer.from(payload, "base64").toString("utf8")
      : decodeURIComponent(payload);
    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
};

const fetchJsonFromUri = async (uri: string) => {
  const safe = assertSafeRemoteUrl(uri, "Invalid token URI");

  const res = await fetch(safe.toString(), {
    headers: {
      accept: "application/json",
    },
    redirect: "follow",
  });

  assertSafeRemoteUrl(res.url, "Invalid token URI");

  if (!res.ok) {
    throw new HttpError(502, `Failed to fetch token metadata (${res.status})`);
  }

  try {
    return (await res.json()) as unknown;
  } catch {
    throw new HttpError(502, "Token metadata is not valid JSON");
  }
};

const extractString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractImageUrl = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  const candidate =
    extractString(record.image) ??
    extractString(record.image_url) ??
    extractString(record.imageUrl) ??
    extractString(record.imageURI) ??
    extractString(record.imageUri);

  if (!candidate) return null;
  return normalizeTokenUri(candidate) ?? candidate;
};

const extractName = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null;
  return extractString((metadata as Record<string, unknown>).name);
};

const resolveTokenUri = async (params: {
  publicClient: ReturnType<typeof buildPublicClient>;
  contractAddress: Address;
  tokenId: bigint;
}): Promise<{ tokenUri: string | null; tokenStandard: SpaceNftTokenStandard }> => {
  try {
    const uri = await params.publicClient.readContract({
      address: params.contractAddress,
      abi: erc721Abi,
      functionName: "tokenURI",
      args: [params.tokenId],
    });

    const normalized = uri ? uri.trim() : "";
    return {
      tokenUri: normalized.length > 0 ? normalized : null,
      tokenStandard: "erc721",
    };
  } catch {
    // fallthrough
  }

  try {
    const uri = await params.publicClient.readContract({
      address: params.contractAddress,
      abi: erc1155Abi,
      functionName: "uri",
      args: [params.tokenId],
    });

    const normalized = uri ? applyErc1155UriTemplate(uri.trim(), params.tokenId) : "";
    return {
      tokenUri: normalized.length > 0 ? normalized : null,
      tokenStandard: "erc1155",
    };
  } catch {
    return { tokenUri: null, tokenStandard: "unknown" };
  }
};

const verifyOwnership = async (params: {
  publicClient: ReturnType<typeof buildPublicClient>;
  tokenStandard: SpaceNftTokenStandard;
  contractAddress: Address;
  tokenId: bigint;
  ownerAddresses: Address[];
}): Promise<Address | null> => {
  if (params.ownerAddresses.length === 0) return null;

  if (params.tokenStandard === "erc1155") {
    const balances = await Promise.all(
      params.ownerAddresses.map(async (owner) => {
        const balance = await params.publicClient.readContract({
          address: params.contractAddress,
          abi: erc1155Abi,
          functionName: "balanceOf",
          args: [owner, params.tokenId],
        });
        return { owner, balance };
      }),
    );

    const match = balances.find((entry) => entry.balance > BigInt(0));
    return match?.owner ?? null;
  }

  try {
    const owner = await params.publicClient.readContract({
      address: params.contractAddress,
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [params.tokenId],
    });

    const normalizedOwner = getAddress(owner);
    const allowed = params.ownerAddresses.some((addr) => addr.toLowerCase() === normalizedOwner.toLowerCase());
    return allowed ? normalizedOwner : null;
  } catch {
    return null;
  }
};

export const resolveSpaceNft = async (params: {
  chainId: number;
  contractAddress: string;
  tokenId: string;
  ownerAddresses: Array<string | null | undefined>;
}): Promise<SpaceResolvedNft> => {
  const chain = getChainById(params.chainId);
  if (!chain) {
    throw new HttpError(400, `Unsupported chainId: ${params.chainId}`);
  }

  const contractRaw = params.contractAddress.trim();
  if (!isAddress(contractRaw)) {
    throw new HttpError(400, "Invalid contract address");
  }
  const contractAddress = getAddress(contractRaw);

  const tokenIdBig = parseTokenId(params.tokenId);
  const publicClient = buildPublicClient(params.chainId);

  const { tokenUri, tokenStandard } = await resolveTokenUri({
    publicClient,
    contractAddress,
    tokenId: tokenIdBig,
  });

  const ownerAddresses = uniqueAddresses(params.ownerAddresses);

  const ownedBy = await verifyOwnership({
    publicClient,
    tokenStandard,
    contractAddress,
    tokenId: tokenIdBig,
    ownerAddresses,
  });

  if (!ownedBy) {
    return {
      chainId: chain.id,
      contractAddress,
      tokenId: tokenIdBig.toString(),
      tokenUri,
      tokenStandard,
      name: null,
      imageUrl: null,
      ownedBy: null,
    };
  }

  let metadata: unknown = null;
  if (tokenUri) {
    const inline = tokenUri.startsWith("data:") ? parseJsonDataUri(tokenUri) : null;
    if (inline) {
      metadata = inline;
    } else {
      const metadataUrl = normalizeTokenUri(tokenUri);
      if (!metadataUrl) {
        throw new HttpError(400, "Unsupported token URI format");
      }
      metadata = await fetchJsonFromUri(metadataUrl);
    }
  }

  const imageUrl = extractImageUrl(metadata);
  const name = extractName(metadata);

  return {
    chainId: chain.id,
    contractAddress,
    tokenId: tokenIdBig.toString(),
    tokenUri,
    tokenStandard,
    name,
    imageUrl,
    ownedBy,
  };
};
