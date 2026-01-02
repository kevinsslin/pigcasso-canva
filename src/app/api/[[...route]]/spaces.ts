import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { getPublicSpaceData } from "@/server/space";

const app = new Hono().get(
  "/:handle",
  zValidator(
    "param",
    z.object({
      handle: z.string().trim().min(1),
    }),
  ),
  async (c) => {
    const { handle } = c.req.valid("param");
    const data = await getPublicSpaceData(handle);

    if (!data) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ data });
  },
);

export default app;

