import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { canvasDocuments } from "@/db/schema";
import { normalizeDbError } from "@/server/db-errors";
import { HttpError } from "@/server/http-error";
import { MAX_CANVAS_CHAT_CHARS, MAX_CANVAS_SNAPSHOT_CHARS } from "@/lib/canvas-limits";

const assertSnapshotSize = (snapshot: string | null | undefined) => {
  if (!snapshot) return;
  if (snapshot.length <= MAX_CANVAS_SNAPSHOT_CHARS) return;
  throw new HttpError(413, "Canvas snapshot is too large.", {
    code: "CANVAS_SNAPSHOT_TOO_LARGE",
    expose: true,
  });
};

const assertChatSize = (chatJson: string | null | undefined) => {
  if (!chatJson) return;
  if (chatJson.length <= MAX_CANVAS_CHAT_CHARS) return;
  throw new HttpError(413, "Canvas chat history is too large.", {
    code: "CANVAS_CHAT_TOO_LARGE",
    expose: true,
  });
};

export const listCanvasDocumentsForUserId = async (params: {
  userId: string;
  page: number;
  limit: number;
}) => {
  try {
    const data = await db
      .select({
        id: canvasDocuments.id,
        name: canvasDocuments.name,
        coverImageUrl: canvasDocuments.coverImageUrl,
        createdAt: canvasDocuments.createdAt,
        updatedAt: canvasDocuments.updatedAt,
      })
      .from(canvasDocuments)
      .where(eq(canvasDocuments.userId, params.userId))
      .orderBy(desc(canvasDocuments.updatedAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    return data;
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to fetch canvases." });
  }
};

export const getCanvasDocumentForUserId = async (params: { userId: string; id: string }) => {
  try {
    const [row] = await db
      .select()
      .from(canvasDocuments)
      .where(and(eq(canvasDocuments.id, params.id), eq(canvasDocuments.userId, params.userId)));
    return row ?? null;
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to fetch canvas." });
  }
};

export const getOrCreateCanvasDocumentForUserId = async (params: {
  userId: string;
  id: string;
  name?: string | null;
}) => {
  const existing = await getCanvasDocumentForUserId({ userId: params.userId, id: params.id });
  if (existing) return existing;

  const now = new Date();
  try {
    const [row] = await db
      .insert(canvasDocuments)
      .values({
        id: params.id,
        userId: params.userId,
        name: params.name?.trim() ? params.name.trim().slice(0, 80) : "Untitled",
        snapshot: null,
        chatJson: null,
        coverImageUrl: null,
        publishedSnapshot: null,
        publishedChatJson: null,
        publishedCoverImageUrl: null,
        isPublished: false,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      throw new HttpError(500, "Failed to create canvas.");
    }

    return row;
  } catch (error) {
    throw normalizeDbError(error, {
      uniqueViolationMessage: "Canvas already exists.",
      fallbackMessage: "Failed to create canvas.",
    });
  }
};

export const updateCanvasDocumentForUserId = async (params: {
  userId: string;
  id: string;
  values: {
    name?: string;
    snapshot?: string | null;
    chatJson?: string | null;
    coverImageUrl?: string | null;
  };
}) => {
  assertSnapshotSize(params.values.snapshot);
  assertChatSize(params.values.chatJson);

  try {
    const [row] = await db
      .update(canvasDocuments)
      .set({
        ...params.values,
        updatedAt: new Date(),
      })
      .where(and(eq(canvasDocuments.id, params.id), eq(canvasDocuments.userId, params.userId)))
      .returning();

    return row ?? null;
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to update canvas." });
  }
};

export const publishCanvasDocumentForUserId = async (params: { userId: string; id: string }) => {
  try {
    const doc = await getCanvasDocumentForUserId({ userId: params.userId, id: params.id });
    if (!doc) return null;

    const [row] = await db
      .update(canvasDocuments)
      .set({
        publishedSnapshot: doc.snapshot ?? null,
        publishedChatJson: doc.chatJson ?? null,
        publishedCoverImageUrl: doc.coverImageUrl ?? null,
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(canvasDocuments.id, params.id), eq(canvasDocuments.userId, params.userId)))
      .returning();

    return row ?? null;
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to publish canvas." });
  }
};

export const unpublishCanvasDocumentForUserId = async (params: { userId: string; id: string }) => {
  try {
    const [row] = await db
      .update(canvasDocuments)
      .set({
        isPublished: false,
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(canvasDocuments.id, params.id), eq(canvasDocuments.userId, params.userId)))
      .returning();

    return row ?? null;
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to unpublish canvas." });
  }
};
