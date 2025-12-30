import { Hono } from "hono";
import { handle } from "hono/vercel";
import type { StatusCode } from "hono/utils/http-status";

import { getErrorStatus } from "@/server/http-error";

import ai from "./ai";
import assistant from "./assistant";
import images from "./images";
import me from "./me";
import projects from "./projects";
import templates from "./templates";
import tokenGating from "./token-gating";

// Revert to "edge" if planning on running on the edge
export const runtime = "nodejs";

const app = new Hono()
  .basePath("/api")
  .onError((err, c) => {
    console.error(err);
    const status = (getErrorStatus(err) ?? 500) as StatusCode;
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Internal Server Error";
    return c.json({ error: message }, status);
  })
  .notFound((c) => {
    return c.json({ error: "Not found" }, 404);
  });

const routes = app
  .route("/ai", ai)
  .route("/assistant", assistant)
  .route("/images", images)
  .route("/me", me)
  .route("/projects", projects)
  .route("/templates", templates)
  .route("/token-gating", tokenGating);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
