import { describe, expect, test } from "bun:test";

import { buildCanvasNftMetadata } from "@/server/canvas-nft-metadata";

describe("buildCanvasNftMetadata", () => {
  test("emits https image with ipfs fallback", () => {
    const prevGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
    process.env.NEXT_PUBLIC_IPFS_GATEWAY = "plum-high-rook-436.mypinata.cloud";

    const metadata = buildCanvasNftMetadata({
      name: "Test Asset",
      description: "Created with Pigcasso Canvas.",
      canvasId: "canvas",
      canvasName: "Untitled",
      imageCid: "bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi",
      sourceCid: "bafkreiesc5x46rhgxl5locju6l5nvzfburg5f3xg2d37rcpeh7amksiuca",
      shapeId: "shape:image",
    });

    expect(metadata.image).toStartWith("https://plum-high-rook-436.mypinata.cloud/ipfs/");
    expect(metadata.image_url).toStartWith("https://plum-high-rook-436.mypinata.cloud/ipfs/");
    expect(metadata.properties.image_ipfs).toBe("ipfs://bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi");
    expect(metadata.properties.image_http).toBe(metadata.image_url);
    expect(metadata.properties.source_url).toStartWith("https://plum-high-rook-436.mypinata.cloud/ipfs/");

    process.env.NEXT_PUBLIC_IPFS_GATEWAY = prevGateway;
  });
});
