import { describe, expect, test } from "bun:test";

import { SPACE_MODULES } from "@/features/spaces/lib/space-modules";
import { getDefaultSpaceDocument, spaceDocumentSchema } from "@/features/spaces/lib/space-document";

describe("Space defaults", () => {
  test("getDefaultSpaceDocument returns a valid document with empty links", () => {
    const doc = getDefaultSpaceDocument({
      displayName: "Pig",
      subtitle: "Builder",
      bio: "Hello world.",
      avatarUrl: "https://example.com/avatar.png",
    });

    const parsed = spaceDocumentSchema.parse(doc);
    const linksBlock = parsed.blocks.find((block) => block.type === "links");

    expect(linksBlock).not.toBeUndefined();
    expect(linksBlock?.data.links).toEqual([]);
  });

  test("Link stack module starts with no default links", () => {
    const moduleDefinition = SPACE_MODULES.find((item) => item.type === "links");
    expect(moduleDefinition).not.toBeUndefined();

    const data = moduleDefinition?.createData();
    expect(data).toBeDefined();
    expect((data as { links?: unknown[] }).links ?? []).toEqual([]);
  });
});
