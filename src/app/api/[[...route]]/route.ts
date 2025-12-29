import { Hono } from "hono";
import { handle } from "hono/vercel";

import ai from "./ai";
import images from "./images";
import me from "./me";
import projects from "./projects";
import tokenGating from "./token-gating";

// Revert to "edge" if planning on running on the edge
export const runtime = "nodejs";

const app = new Hono().basePath("/api");

const routes = app
  .route("/ai", ai)
  .route("/images", images)
  .route("/me", me)
  .route("/projects", projects)
  .route("/token-gating", tokenGating);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
