import { Hono } from "hono";
import { handle } from "hono/vercel";

import { HttpError, getErrorStatus } from "@/server/http-error";
import { toContentfulStatus } from "@/server/contentful-status";

import ai from "./ai";
import assistant from "./assistant";
import assets from "./assets";
import collections from "./collections";
import github from "./github";
import images from "./images";
import leaderboards from "./leaderboards";
import me from "./me";
import printr from "./printr";
import projectHubs from "./project-hubs";
import projects from "./projects";
import spaces from "./spaces";
import templates from "./templates";
import tokenGating from "./token-gating";

// Revert to "edge" if planning on running on the edge
export const runtime = "nodejs";

const app = new Hono()
  .basePath("/api")
  .onError((err, c) => {
    console.error(err);
    const status = toContentfulStatus(getErrorStatus(err) ?? 500);
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Internal Server Error";

    const isProd = process.env.NODE_ENV === "production";
    const safeMessage =
      isProd && status >= 500 && !(err instanceof HttpError)
        ? "Internal Server Error"
        : message;

    return c.json({ error: safeMessage }, status);
  })
  .notFound((c) => {
    return c.json({ error: "Not found" }, 404);
  });

const routes = app
  .route("/ai", ai)
  .route("/assistant", assistant)
  .route("/assets", assets)
  .route("/collections", collections)
  .route("/github", github)
  .route("/images", images)
  .route("/leaderboards", leaderboards)
  .route("/me", me)
  .route("/printr", printr)
  .route("/project-hubs", projectHubs)
  .route("/projects", projects)
  .route("/spaces", spaces)
  .route("/templates", templates)
  .route("/token-gating", tokenGating);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
