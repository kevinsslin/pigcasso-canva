import { getIpfsGatewayBaseUrl } from "@/lib/ipfs-gateway";
import { normalizeIpfsUrl } from "@/lib/ipfs";

const cidToGatewayUrl = (cid: string) =>
  normalizeIpfsUrl(`ipfs://${cid}`, { defaultGatewayBaseUrl: getIpfsGatewayBaseUrl() });

export const buildCanvasNftMetadata = (params: {
  name: string;
  description: string;
  canvasId: string;
  canvasName: string;
  imageCid: string;
  sourceCid: string;
  shapeId?: string | null;
  chainLabel?: string;
}) => {
  const chain = params.chainLabel ?? "Mantle";
  const imageIpfs = `ipfs://${params.imageCid}`;
  const imageUrl = cidToGatewayUrl(params.imageCid);
  const sourceUrl = cidToGatewayUrl(params.sourceCid);

  return {
    name: params.name,
    description: params.description,
    image: imageUrl,
    image_url: imageUrl,
    attributes: [
      { trait_type: "Canvas", value: params.canvasName },
      { trait_type: "Chain", value: chain },
    ],
    properties: {
      image_ipfs: imageIpfs,
      image_http: imageUrl,
      source: `ipfs://${params.sourceCid}`,
      source_url: sourceUrl,
      canvasId: params.canvasId,
      canvasName: params.canvasName,
      shapeId: params.shapeId ?? null,
    },
  };
};
