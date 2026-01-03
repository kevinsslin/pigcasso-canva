import { z } from "zod";

export const spaceLayoutSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

export type SpaceLayout = z.infer<typeof spaceLayoutSchema>;

export const spaceLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url(),
});

export type SpaceLink = z.infer<typeof spaceLinkSchema>;

export const spaceNftItemSchema = z.object({
  chainId: z.number().int().positive(),
  contractAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
  tokenId: z.string().trim().min(1).max(78),
  name: z.string().trim().max(160).optional().nullable(),
  imageUrl: z.string().trim().url().optional().nullable(),
  tokenUri: z.string().trim().optional().nullable(),
  tokenStandard: z.enum(["erc721", "erc1155", "unknown"]).default("unknown"),
  ownedBy: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address")
    .optional()
    .nullable(),
  resolvedAt: z.string().trim().optional().nullable(),
});

export type SpaceNftItem = z.infer<typeof spaceNftItemSchema>;

export const spaceBlockBaseSchema = z.object({
  id: z.string().min(1),
  layout: spaceLayoutSchema,
  isVisible: z.boolean().default(true),
});

export const spaceBioBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("bio"),
  data: z.object({
    displayName: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(160).optional().nullable(),
    bio: z.string().trim().max(560).optional().nullable(),
    avatarUrl: z.string().trim().url().optional().nullable(),
    statusLabel: z.string().trim().max(60).optional().nullable(),
  }),
});

export type SpaceBioBlock = z.infer<typeof spaceBioBlockSchema>;

export const spaceLinkStackBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("links"),
  data: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(240).optional().nullable(),
    links: z.array(spaceLinkSchema).max(24),
  }),
});

export type SpaceLinkStackBlock = z.infer<typeof spaceLinkStackBlockSchema>;

export const spaceImageBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("image"),
  data: z.object({
    title: z.string().trim().max(120).optional().nullable(),
    imageUrl: z.string().trim().url().optional().nullable(),
  }),
});

export type SpaceImageBlock = z.infer<typeof spaceImageBlockSchema>;

export const spaceTextBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("text"),
  data: z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(1200),
  }),
});

export type SpaceTextBlock = z.infer<typeof spaceTextBlockSchema>;

export const spaceStatBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("stat"),
  data: z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(80),
    tone: z.enum(["primary", "secondary", "accent"]).default("secondary"),
  }),
});

export type SpaceStatBlock = z.infer<typeof spaceStatBlockSchema>;

export const spaceNftShowcaseBlockSchema = spaceBlockBaseSchema.extend({
  type: z.literal("nftShowcase"),
  data: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(240).optional().nullable(),
    items: z.array(spaceNftItemSchema).max(36),
  }),
});

export type SpaceNftShowcaseBlock = z.infer<typeof spaceNftShowcaseBlockSchema>;

export const spaceBlockSchema = z.discriminatedUnion("type", [
  spaceBioBlockSchema,
  spaceLinkStackBlockSchema,
  spaceImageBlockSchema,
  spaceTextBlockSchema,
  spaceStatBlockSchema,
  spaceNftShowcaseBlockSchema,
]);

export type SpaceBlock = z.infer<typeof spaceBlockSchema>;

export const spaceDocumentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(spaceBlockSchema).max(60),
});

export type SpaceDocument = z.infer<typeof spaceDocumentSchema>;

export const getDefaultSpaceDocument = (options?: {
  displayName?: string | null;
  subtitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}): SpaceDocument => {
  const displayName = options?.displayName?.trim() || "Pigcasso Creator";
  const subtitle = options?.subtitle?.trim() || "Web3 Builder";
  const bio = options?.bio?.trim() || "Crafting community assets with Pigcasso.";
  const avatarUrl = options?.avatarUrl?.trim() || null;

  return {
    version: 1,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "bio",
        isVisible: true,
        layout: { x: 0, y: 0, w: 2, h: 2 },
        data: {
          displayName,
          subtitle,
          bio,
          avatarUrl,
          statusLabel: "Available",
        },
      },
      {
        id: crypto.randomUUID(),
        type: "links",
        isVisible: true,
        layout: { x: 2, y: 0, w: 2, h: 1 },
        data: {
          title: "Links",
          description: "Add your favorite links.",
          links: [],
        },
      },
      {
        id: crypto.randomUUID(),
        type: "stat",
        isVisible: true,
        layout: { x: 2, y: 1, w: 1, h: 1 },
        data: {
          label: "Projects",
          value: "0",
          tone: "secondary",
        },
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        isVisible: true,
        layout: { x: 3, y: 1, w: 1, h: 1 },
        data: {
          title: "Intro",
          body: "Drag blocks to rearrange. Click a block to edit.",
        },
      },
    ],
  };
};
