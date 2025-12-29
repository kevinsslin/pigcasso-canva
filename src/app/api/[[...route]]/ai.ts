import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import { generateImage, removeBackground } from "@/server/ai-providers";
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
        provider: z.enum(["replicate", "gemini"]).optional(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image, provider } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
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

      const result = await removeBackground({ image, provider });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "remove-bg" });

      return c.json({ data: result.imageUrl });
    },
  )
  .post(
    "/generate-image",
    requireAuth,
    zValidator(
      "json",
      z.object({
        prompt: z.string(),
        provider: z.enum(["replicate", "gemini"]).optional(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { prompt, provider } = c.req.valid("json");

      const proStatus = await getProStatusForUser({
        userId: authUser.id,
        embeddedWalletAddress: authUser.embeddedWalletAddress,
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

      const result = await generateImage({ prompt, provider });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "generate" });

      return c.json({ data: result.imageUrl });
    },
  );

export default app;
