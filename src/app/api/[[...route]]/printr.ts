import { Hono } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projects, templateTokens } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { requirePro } from "@/server/hono-auth";
import { HttpError } from "@/server/http-error";
import { printrFetchJson, hasPrintrConfigured, toCaip10Account } from "@/server/printr";

const caip2ChainSchema = z.string().regex(/^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/);
const caip10AccountSchema = z.string().regex(/^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/);
const bigintStringSchema = z.string().regex(/^[0-9]+$/);

const initialBuySchema = z.union([
  z
    .object({
      supply_percent: z.coerce.number().min(0.01).max(69),
    })
    .strict(),
  z
    .object({
      spend_usd: z.coerce.number().positive(),
    })
    .strict(),
  z
    .object({
      spend_native: bigintStringSchema,
    })
    .strict(),
]);

const graduationThresholdSchema = z.union([z.literal(69000), z.literal(250000)]);

const quoteSchema = z
  .object({
    chains: z.array(caip2ChainSchema).min(1).max(10),
    initial_buy: initialBuySchema,
    graduation_threshold_per_chain_usd: graduationThresholdSchema.optional(),
  })
  .strict();

const printSchema = z
  .object({
    creator_accounts: z.array(caip10AccountSchema).min(1),
    name: z.string().min(1),
    symbol: z.string().min(1),
    description: z.string().min(1),
    image: z.string().min(1),
    external_links: z
      .object({
        website: z.string().optional(),
        x: z.string().optional(),
        telegram: z.string().optional(),
      })
      .optional(),
    chains: z.array(caip2ChainSchema).min(1).max(10),
    initial_buy: initialBuySchema,
    graduation_threshold_per_chain_usd: graduationThresholdSchema.optional(),
  })
  .strict();

const printrPrintResponseSchema = z
  .object({
    token_id: z.string().min(1),
    payload: z.unknown(),
    quote: z.unknown(),
  })
  .passthrough();

const createTemplateTokenSchema = z
  .object({
    templateId: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    symbol: z.string().trim().min(1).max(16),
    description: z.string().trim().min(1).max(560),
    imageUrl: z.string().trim().url().optional(),
    external_links: z
      .object({
        website: z.string().optional(),
        x: z.string().optional(),
        telegram: z.string().optional(),
      })
      .optional(),
    chains: z.array(caip2ChainSchema).min(1).max(10),
    initial_buy: initialBuySchema,
    graduation_threshold_per_chain_usd: graduationThresholdSchema.optional(),
    creatorAddress: z.string().trim().optional(),
  })
  .strict();

const updateTemplateTokenSchema = z
  .object({
    txHash: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{64}$/)
      .optional(),
    status: z.enum(["created", "signed", "live", "failed"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No changes provided",
  });

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const MAX_IMAGE_BYTES = 2_500_000;

const isAllowedImageHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return (
    host === "ufs.sh" ||
    host.endsWith(".ufs.sh") ||
    host === "images.unsplash.com" ||
    host === "lh3.googleusercontent.com"
  );
};

const toBase64Image = async (input: string): Promise<string> => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new HttpError(400, "Missing image input");
  }

  if (trimmed.startsWith("data:")) {
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) {
      throw new HttpError(400, "Invalid data URL");
    }
    return trimmed.slice(commaIndex + 1);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new HttpError(400, "Invalid image URL");
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, "Image URL must use https");
  }

  if (!isAllowedImageHost(url.hostname)) {
    throw new HttpError(400, "Unsupported image host");
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new HttpError(502, "Failed to fetch image");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "Image too large");
  }

  return Buffer.from(buffer).toString("base64");
};

const app = new Hono()
  .get("/status", requireAuth, async (c) => {
    return c.json({
      configured: hasPrintrConfigured(),
    });
  })
  .get(
    "/template-tokens/:templateId",
    requireAuth,
    zValidator("param", z.object({ templateId: z.string().min(1) })),
    async (c) => {
      const auth = c.get("authUser");
      const { templateId } = c.req.valid("param");

      const [template] = await db
        .select({
          id: projects.id,
          userId: projects.userId,
          isPublicTemplate: projects.isPublicTemplate,
        })
        .from(projects)
        .where(and(eq(projects.id, templateId), eq(projects.isTemplate, true)));

      if (!template) {
        return c.json({ error: "Not found" }, 404);
      }

      if (!template.isPublicTemplate && template.userId !== auth.id) {
        return c.json({ error: "Not found" }, 404);
      }

      const [record] = await db
        .select()
        .from(templateTokens)
        .where(eq(templateTokens.templateProjectId, templateId));

      if (!record) {
        return c.json({ error: "Not found" }, 404);
      }

      const isOwner = record.creatorUserId === auth.id;

      return c.json({
        data: {
          ...record,
          chains: safeJsonParse<string[]>(record.chains) ?? [],
          initialBuy: safeJsonParse(record.initialBuy),
          externalLinks: safeJsonParse(record.externalLinks),
          quote: isOwner ? safeJsonParse(record.quote) : null,
          payload: isOwner ? safeJsonParse(record.payload) : null,
        },
      });
    },
  )
  .post(
    "/template-tokens",
    requirePro,
    zValidator("json", createTemplateTokenSchema),
    async (c) => {
      const auth = c.get("authUser");
      const body = c.req.valid("json");

      const [template] = await db
        .select({
          id: projects.id,
          userId: projects.userId,
          name: projects.name,
          thumbnailUrl: projects.thumbnailUrl,
        })
        .from(projects)
        .where(
          and(
            eq(projects.id, body.templateId),
            eq(projects.userId, auth.id),
            eq(projects.isTemplate, true),
          ),
        );

      if (!template) {
        return c.json({ error: "Template not found" }, 404);
      }

      const [existing] = await db
        .select()
        .from(templateTokens)
        .where(eq(templateTokens.templateProjectId, body.templateId));

      if (existing) {
        return c.json({ error: "Token already launched for this template" }, 409);
      }

      const creatorAddressRaw = body.creatorAddress?.trim();
      const candidateAddresses = [
        auth.embeddedWalletAddress,
        ...auth.externalWalletAddresses,
      ].filter((address): address is string => typeof address === "string" && address.trim().length > 0);

      const normalizedCandidateAddresses = new Set(
        candidateAddresses.map((address) => address.toLowerCase()),
      );

      const normalizedCreatorAddress = creatorAddressRaw
        ? creatorAddressRaw.toLowerCase()
        : null;

      const creatorAddress =
        (normalizedCreatorAddress &&
        normalizedCandidateAddresses.has(normalizedCreatorAddress)
          ? normalizedCreatorAddress
          : null) ??
        auth.externalWalletAddress ??
        auth.embeddedWalletAddress;

      if (!creatorAddress) {
        throw new HttpError(400, "No creator wallet connected");
      }

      const homeChain = body.chains[0];
      const creatorAccount = toCaip10Account({
        chain: homeChain,
        address: creatorAddress,
      });

      const imageUrl = body.imageUrl ?? template.thumbnailUrl;
      if (!imageUrl) {
        throw new HttpError(400, "Template does not have an image yet");
      }

      const imageBase64 = await toBase64Image(imageUrl);

      const printrResponse = await printrFetchJson({
        path: "/print",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creator_accounts: [creatorAccount],
            name: body.name,
            symbol: body.symbol,
            description: body.description,
            image: imageBase64,
            external_links: body.external_links,
            chains: body.chains,
            initial_buy: body.initial_buy,
            graduation_threshold_per_chain_usd: body.graduation_threshold_per_chain_usd,
          }),
        },
        fallbackMessage: "Failed to create Printr token",
      });

      const parsedPrintrResponse = printrPrintResponseSchema.parse(printrResponse);

      const [created] = await db
        .insert(templateTokens)
        .values({
          templateProjectId: body.templateId,
          creatorUserId: auth.id,
          printrTokenId: parsedPrintrResponse.token_id,
          creatorAccount,
          name: body.name,
          symbol: body.symbol,
          description: body.description,
          imageUrl,
          externalLinks: body.external_links
            ? JSON.stringify(body.external_links)
            : null,
          chains: JSON.stringify(body.chains),
          initialBuy: JSON.stringify(body.initial_buy),
          quote: JSON.stringify(parsedPrintrResponse.quote),
          payload: JSON.stringify(parsedPrintrResponse.payload),
          status: "created",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        throw new HttpError(500, "Failed to save launch record");
      }

      return c.json(
        {
          data: created,
          printr: printrResponse,
        },
        201,
      );
    },
  )
  .patch(
    "/template-tokens/:templateId",
    requireAuth,
    zValidator("param", z.object({ templateId: z.string().min(1) })),
    zValidator("json", updateTemplateTokenSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { templateId } = c.req.valid("param");
      const body = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(templateTokens)
        .where(eq(templateTokens.templateProjectId, templateId));

      if (!existing || existing.creatorUserId !== auth.id) {
        return c.json({ error: "Not found" }, 404);
      }

      const [updated] = await db
        .update(templateTokens)
        .set({
          ...(body.txHash !== undefined ? { txHash: body.txHash } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(templateTokens.id, existing.id))
        .returning();

      if (!updated) {
        throw new HttpError(500, "Failed to update launch record");
      }

      return c.json({ data: updated });
    },
  )
  .post("/print/quote", requireAuth, zValidator("json", quoteSchema), async (c) => {
    const body = c.req.valid("json");
    const data = await printrFetchJson({
      path: "/print/quote",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      fallbackMessage: "Failed to fetch Printr quote",
    });
    return c.json(data);
  })
  .post("/print", requireAuth, zValidator("json", printSchema), async (c) => {
    const body = c.req.valid("json");
    const data = await printrFetchJson({
      path: "/print",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      fallbackMessage: "Failed to create Printr token",
    });
    return c.json(data);
  })
  .get(
    "/tokens/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await printrFetchJson({
        path: `/tokens/${encodeURIComponent(id)}`,
        init: {
          method: "GET",
        },
        fallbackMessage: "Failed to fetch Printr token",
      });
      return c.json(data);
    },
  )
  .get(
    "/tokens/:id/deployments",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await printrFetchJson({
        path: `/tokens/${encodeURIComponent(id)}/deployments`,
        init: {
          method: "GET",
        },
        fallbackMessage: "Failed to fetch Printr deployments",
      });
      return c.json(data);
    },
  );

export default app;
