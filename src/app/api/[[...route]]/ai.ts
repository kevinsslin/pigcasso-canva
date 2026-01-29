import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import {
  analyzeCanvasPrompt,
  chatAssistant,
  editImage,
  extractTextBlocks,
  generateHtml,
  generateImage,
  getEffectiveNanoBananaProfile,
  removeBackground,
} from "@/server/ai";
import { requireAiAccess, requireAiIpUsage } from "@/server/ai/usage-guards";
import { incrementAiUsage } from "@/server/ai-usage";
import { incrementAiIpUsage } from "@/server/ai-ip-usage";
import { getRequestIp } from "@/server/request-ip";

const workflowSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["separate-layers"]),
  })
  .optional();

const app = new Hono()
  .post(
    "/analyze",
    requireAuth,
    zValidator(
      "json",
      z.object({
        prompt: z.string().trim().min(1).max(8000),
        context: z.string().trim().max(4000).optional(),
        selection: z
          .object({
            type: z.string().trim().min(1).max(64),
            label: z.string().trim().max(200).optional(),
          })
          .nullable()
          .optional(),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { prompt, context, selection } = c.req.valid("json");

      const access = await requireAiAccess({ authUser, action: "generate" });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const result = await analyzeCanvasPrompt({
        prompt,
        context: context ?? null,
        selection: selection ?? null,
      });

      return c.json({ data: result.data, meta: { provider: result.provider } });
    },
  )
  .post(
    "/chat",
    requireAuth,
    zValidator(
      "json",
      z.object({
        prompt: z.string().trim().min(1).max(8000),
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { prompt } = c.req.valid("json");

      const access = await requireAiAccess({ authUser, action: "generate" });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const result = await chatAssistant({ prompt });
      await incrementAiUsage({ usageRow: access.usageRow, action: "generate" });

      return c.json({ data: { text: result.text }, meta: { provider: result.provider } });
    },
  )
  .post(
    "/remove-bg",
    requireAuth,
    zValidator(
      "json",
      z.object({
        image: z.string(),
        workflow: workflowSchema,
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image, workflow } = c.req.valid("json");
      const ip = getRequestIp(c);
      const ipAction = workflow?.type === "separate-layers" ? "separate-layers" : "image";
      const ipDecisionResult = await requireAiIpUsage({
        ip,
        action: ipAction,
        workflowId: workflow?.id,
      });
      if (!ipDecisionResult.ok) {
        return c.json(ipDecisionResult.error, 429);
      }

      const access = await requireAiAccess({
        authUser,
        action: "remove-bg",
      });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const result = await removeBackground({ image });
      await incrementAiUsage({ usageRow: access.usageRow, action: "remove-bg" });
      await incrementAiIpUsage({
        decision: ipDecisionResult.decision,
        action: ipAction,
        ip,
        workflowId: workflow?.id,
      });

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
        workflow: workflowSchema,
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image, instruction, referenceImages, canvas, profile, workflow } = c.req.valid("json");
      const ip = getRequestIp(c);
      const ipAction = workflow?.type === "separate-layers" ? "separate-layers" : "image";
      const ipDecisionResult = await requireAiIpUsage({
        ip,
        action: ipAction,
        workflowId: workflow?.id,
      });
      if (!ipDecisionResult.ok) {
        return c.json(ipDecisionResult.error, 429);
      }

      const access = await requireAiAccess({
        authUser,
        action: "generate",
      });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const effectiveProfile = getEffectiveNanoBananaProfile(profile, access.proStatus.isPro);

      const result = await editImage({
        image,
        instruction,
        referenceImages,
        canvas,
        profile: effectiveProfile,
      });
      await incrementAiUsage({ usageRow: access.usageRow, action: "generate" });
      await incrementAiIpUsage({
        decision: ipDecisionResult.decision,
        action: ipAction,
        ip,
        workflowId: workflow?.id,
      });

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

      const access = await requireAiAccess({ authUser, action: "generate" });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const result = await generateHtml({ prompt });
      await incrementAiUsage({ usageRow: access.usageRow, action: "generate" });

      return c.json({ data: { html: result.html }, meta: { provider: result.provider } });
    },
  )
  .post(
    "/extract-text",
    requireAuth,
    zValidator(
      "json",
      z.object({
        image: z.string().min(1),
        workflow: workflowSchema,
      }),
    ),
    async (c) => {
      const authUser = c.get("authUser");
      const { image, workflow } = c.req.valid("json");
      const ip = getRequestIp(c);
      const ipDecisionResult =
        workflow?.type === "separate-layers"
          ? await requireAiIpUsage({
              ip,
              action: "separate-layers",
              workflowId: workflow?.id,
            })
          : null;

      if (ipDecisionResult && !ipDecisionResult.ok) {
        return c.json(ipDecisionResult.error, 429);
      }

      const access = await requireAiAccess({ authUser, action: "generate" });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const result = await extractTextBlocks({ image });
      await incrementAiUsage({ usageRow: access.usageRow, action: "generate" });
      if (ipDecisionResult && ipDecisionResult.ok) {
        await incrementAiIpUsage({
          decision: ipDecisionResult.decision,
          action: "separate-layers",
          ip,
          workflowId: workflow?.id,
        });
      }

      return c.json({ data: { blocks: result.blocks }, meta: { provider: result.provider } });
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
      const ip = getRequestIp(c);
      const ipDecisionResult = await requireAiIpUsage({ ip, action: "image" });
      if (!ipDecisionResult.ok) {
        return c.json(ipDecisionResult.error, 429);
      }

      const access = await requireAiAccess({ authUser, action: "generate" });
      if (!access.ok) {
        return c.json(access.error, 429);
      }

      const effectiveProfile = getEffectiveNanoBananaProfile(profile, access.proStatus.isPro);

      const result = await generateImage({ prompt, canvas, profile: effectiveProfile });
      await incrementAiUsage({ usageRow: access.usageRow, action: "generate" });
      await incrementAiIpUsage({ decision: ipDecisionResult.decision, action: "image", ip });

      return c.json({ data: result.imageUrl, meta: { provider: result.provider } });
    },
  );

export default app;
