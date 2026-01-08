import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import { editImage, generateHtml, generateImage, removeBackground } from "@/server/ai-providers";
import { checkAiUsage, incrementAiUsage } from "@/server/ai-usage";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono()
  .post(
    "/remove-bg",
    requireAuth,
    zValidator(
      "json",
      z.object({
        image: z.string(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
        externalWalletAddresses: authUser.externalWalletAddresses,
        externalWalletAddress: authUser.externalWalletAddress,
      });

      const decision = await checkAiUsage({
        userId: authUser.id,
        isPro: proStatus.isPro,
        action: "remove-bg",
      });

      if (!decision.allowed || !decision.usageRow) {
        return c.json(
          {
            error: "Daily limit reached",
            limit: decision.limit,
            used: decision.used,
            remaining: decision.remaining,
            date: decision.date,
          },
          429,
        );
      }

      const result = await removeBackground({ image });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "remove-bg" });

      return c.json({ data: result.imageUrl, meta: { provider: result.provider } });
    },
  )
  .post(
    "/edit-image",
    requireAuth,
    zValidator(
      "json",
      z.object({
        image: z.string().min(1),
        instruction: z.string().trim().min(1).max(2000),
        profile: z.enum(["nano-banana", "nano-banana-pro"]).optional(),
        referenceImages: z.array(z.string().min(1)).max(4).optional(),
        canvas: z
          .object({
            width: z.number().positive(),
            height: z.number().positive(),
          })
          .optional(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image, instruction, referenceImages, canvas, profile } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
        externalWalletAddresses: authUser.externalWalletAddresses,
        externalWalletAddress: authUser.externalWalletAddress,
      });

      const decision = await checkAiUsage({
        userId: authUser.id,
        isPro: proStatus.isPro,
        action: "generate",
      });

      if (!decision.allowed || !decision.usageRow) {
        return c.json(
          {
            error: "Daily limit reached",
            limit: decision.limit,
            used: decision.used,
            remaining: decision.remaining,
            date: decision.date,
          },
          429,
        );
      }

      const effectiveProfile =
        profile === "nano-banana-pro" && !proStatus.isPro ? "nano-banana" : profile ?? "nano-banana";

      const result = await editImage({
        image,
        instruction,
        referenceImages,
        canvas,
        profile: effectiveProfile,
      });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "generate" });

      return c.json({ data: result.imageUrl, meta: { provider: result.provider } });
    },
  )
  .post(
    "/generate-html",
    requireAuth,
    zValidator(
      "json",
      z.object({
        prompt: z.string().trim().min(1).max(4000),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { prompt } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
        externalWalletAddresses: authUser.externalWalletAddresses,
        externalWalletAddress: authUser.externalWalletAddress,
      });

      const decision = await checkAiUsage({
        userId: authUser.id,
        isPro: proStatus.isPro,
        action: "generate",
      });

      if (!decision.allowed || !decision.usageRow) {
        return c.json(
          {
            error: "Daily limit reached",
            limit: decision.limit,
            used: decision.used,
            remaining: decision.remaining,
            date: decision.date,
          },
          429,
        );
      }

      const result = await generateHtml({ prompt });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "generate" });

      return c.json({ data: { html: result.html }, meta: { provider: result.provider } });
    },
  )
  .post(
    "/generate-image",
    requireAuth,
    zValidator(
      "json",
      z.object({
        prompt: z.string(),
        profile: z.enum(["nano-banana", "nano-banana-pro"]).optional(),
        canvas: z
          .object({
            width: z.number().positive(),
            height: z.number().positive(),
          })
          .optional(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { prompt, canvas, profile } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
        externalWalletAddresses: authUser.externalWalletAddresses,
        externalWalletAddress: authUser.externalWalletAddress,
      });

      const decision = await checkAiUsage({
        userId: authUser.id,
        isPro: proStatus.isPro,
        action: "generate",
      });

      if (!decision.allowed || !decision.usageRow) {
        return c.json(
          {
            error: "Daily limit reached",
            limit: decision.limit,
            used: decision.used,
            remaining: decision.remaining,
            date: decision.date,
          },
          429,
        );
      }

      const effectiveProfile =
        profile === "nano-banana-pro" && !proStatus.isPro ? "nano-banana" : profile ?? "nano-banana";

      const result = await generateImage({ prompt, canvas, profile: effectiveProfile });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "generate" });

      return c.json({ data: result.imageUrl, meta: { provider: result.provider } });
    },
  );

export default app;
