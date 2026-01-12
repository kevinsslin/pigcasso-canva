import { getIpfsGatewayBaseUrl } from "@/lib/ipfs-gateway";
import { normalizeIpfsUrl } from "@/lib/ipfs";

const cidToGatewayUrl = (cid: string) =>
  normalizeIpfsUrl(`ipfs://${cid}`, { defaultGatewayBaseUrl: getIpfsGatewayBaseUrl() });

export const buildNftAssetMetadata = (params: {
  name: string;
  description: string;
  projectName: string;
  pageIndex: number;
  chainLabel?: string;
  imageCid: string;
  sourceCid: string;
  projectId: string;
  projectPageId: string;
}) => {
  const chain = params.chainLabel ?? "Mantle";
  const imageIpfs = `ipfs://${params.imageCid}`;
  const imageUrl = cidToGatewayUrl(params.imageCid);
  const sourceUrl = cidToGatewayUrl(params.sourceCid);

  return {
    name: params.name,
    description: params.description,
    image: imageIpfs,
    image_url: imageIpfs,
    attributes: [
      { trait_type: "Project", value: params.projectName },
      { trait_type: "Page", value: String(params.pageIndex + 1) },
      { trait_type: "Chain", value: chain },
    ],
    properties: {
      image_ipfs: imageIpfs,
      image_http: imageUrl,
      source: `ipfs://${params.sourceCid}`,
      source_url: sourceUrl,
      projectId: params.projectId,
      projectPageId: params.projectPageId,
    },
  };
};
