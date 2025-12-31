import { z } from "zod";

export const canvasSnapshotSchema = z.object({
  workspace: z.object({
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    background: z.string().trim().min(1).max(64).nullable().optional(),
  }),
  objects: z.array(
    z.object({
      id: z.string().trim().min(1).max(64),
      index: z.number().int().nonnegative(),
      type: z.string().trim().min(1).max(32),
      name: z.string().trim().min(1).max(64).nullable().optional(),
      text: z.string().trim().min(1).max(500).nullable().optional(),
      src: z.string().trim().min(1).max(500).nullable().optional(),
      left: z.number().finite().nullable().optional(),
      top: z.number().finite().nullable().optional(),
      width: z.number().finite().nullable().optional(),
      height: z.number().finite().nullable().optional(),
      scaleX: z.number().finite().nullable().optional(),
      scaleY: z.number().finite().nullable().optional(),
      angle: z.number().finite().nullable().optional(),
      fill: z.string().trim().min(1).max(64).nullable().optional(),
      fontSize: z.number().finite().nullable().optional(),
      fontWeight: z.number().finite().nullable().optional(),
      fontFamily: z.string().trim().min(1).max(64).nullable().optional(),
      textAlign: z.string().trim().min(1).max(16).nullable().optional(),
    }),
  ),
});

export type CanvasSnapshot = z.infer<typeof canvasSnapshotSchema>;

const textStyleSchema = z
  .object({
    fontSize: z.number().int().min(8).max(200).optional(),
    fontWeight: z.number().int().min(100).max(900).optional(),
    fill: z.string().trim().min(1).max(64).optional(),
    fontFamily: z.string().trim().min(1).max(64).optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one style field is required",
  });

export const canvasOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("setBackground"),
    color: z.string().trim().min(1).max(64),
  }),
  z.object({
    op: z.literal("setText"),
    targetId: z.string().trim().min(1).max(64),
    text: z.string().trim().min(1).max(500),
  }),
  z.object({
    op: z.literal("setStyle"),
    targetId: z.string().trim().min(1).max(64),
    style: textStyleSchema,
  }),
  z.object({
    op: z.literal("move"),
    targetId: z.string().trim().min(1).max(64),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    anchor: z.enum(["center", "topLeft"]).optional(),
  }),
  z.object({
    op: z.literal("addTextbox"),
    text: z.string().trim().min(1).max(500),
    x: z.number().finite(),
    y: z.number().finite(),
    widthPct: z.number().finite().optional(),
    role: z.enum(["title", "subtitle", "body", "cta"]).optional(),
    style: textStyleSchema.optional(),
  }),
  z.object({
    op: z.literal("delete"),
    targetId: z.string().trim().min(1).max(64),
  }),
]);

export type CanvasOp = z.infer<typeof canvasOpSchema>;
