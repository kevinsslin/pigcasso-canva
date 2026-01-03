import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { spaceDocuments } from "@/db/schema";
import { spaceDocumentSchema, getDefaultSpaceDocument, type SpaceDocument } from "@/features/spaces/lib/space-document";
import { normalizeBlocksLayout } from "@/features/spaces/lib/space-layout";

const parseSpaceDocument = (json: string): SpaceDocument | null => {
  try {
    const parsed = JSON.parse(json) as unknown;
    const result = spaceDocumentSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
};

export const getSpaceDocumentForUserId = async (userId: string) => {
  const [row] = await db.select().from(spaceDocuments).where(eq(spaceDocuments.userId, userId));
  if (!row) return null;

  const document = parseSpaceDocument(row.json);
  if (!document) {
    const fallback = getDefaultSpaceDocument();
    await db
      .update(spaceDocuments)
      .set({ json: JSON.stringify(fallback), updatedAt: new Date() })
      .where(eq(spaceDocuments.id, row.id));
    return {
      ...row,
      json: JSON.stringify(fallback),
      publishedJson: row.publishedJson,
      document: fallback,
      publishedDocument: row.publishedJson ? parseSpaceDocument(row.publishedJson) : null,
    };
  }

  const normalizedDocument: SpaceDocument = {
    ...document,
    blocks: normalizeBlocksLayout(document.blocks),
  };

  const updates: Partial<typeof spaceDocuments.$inferInsert> = {};

  const normalizedDraftJson = JSON.stringify(normalizedDocument);
  if (normalizedDraftJson !== row.json) {
    updates.json = normalizedDraftJson;
  }

  let publishedDocument: SpaceDocument | null = null;
  if (row.isPublished) {
    const publishedParsed = row.publishedJson ? parseSpaceDocument(row.publishedJson) : null;
    const normalizedPublished: SpaceDocument = {
      ...(publishedParsed ?? normalizedDocument),
      blocks: normalizeBlocksLayout((publishedParsed ?? normalizedDocument).blocks),
    };

    publishedDocument = normalizedPublished;
    const normalizedPublishedJson = JSON.stringify(normalizedPublished);

    if (normalizedPublishedJson !== row.publishedJson) {
      updates.publishedJson = normalizedPublishedJson;
    }
  }

  const hasUpdates = Object.keys(updates).length > 0;
  if (hasUpdates) {
    await db
      .update(spaceDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(spaceDocuments.id, row.id));
  }

  return {
    ...row,
    ...updates,
    document: normalizedDocument,
    publishedDocument,
  };
};

export const getPublishedSpaceDocumentForUserId = async (userId: string) => {
  const row = await getSpaceDocumentForUserId(userId);
  if (!row || !row.isPublished) return null;
  return row.publishedDocument ?? row.document;
};

export const getOrCreateSpaceDocumentForUserId = async (
  userId: string,
  defaults?: { displayName?: string | null; subtitle?: string | null; bio?: string | null; avatarUrl?: string | null },
) => {
  const existing = await getSpaceDocumentForUserId(userId);
  if (existing) return existing;

  const document = getDefaultSpaceDocument(defaults);
  const json = JSON.stringify(document);
  const [row] = await db
    .insert(spaceDocuments)
    .values({ userId, json, publishedJson: null, isPublished: false })
    .returning();

  return { ...row, document, publishedDocument: null };
};

export const upsertSpaceDocumentForUserId = async (input: {
  userId: string;
  document: SpaceDocument;
  isPublished?: boolean;
}) => {
  const normalizedDocument: SpaceDocument = {
    ...input.document,
    blocks: normalizeBlocksLayout(input.document.blocks),
  };
  const json = JSON.stringify(normalizedDocument);
  const existing = await db
    .select({ id: spaceDocuments.id, isPublished: spaceDocuments.isPublished })
    .from(spaceDocuments)
    .where(eq(spaceDocuments.userId, input.userId));

  if (!existing.length) {
    const [row] = await db
      .insert(spaceDocuments)
      .values({
        userId: input.userId,
        json,
        publishedJson: input.isPublished ? json : null,
        isPublished: input.isPublished ?? false,
      })
      .returning();

    return {
      ...row,
      document: normalizedDocument,
      publishedDocument: input.isPublished ? normalizedDocument : null,
    };
  }

  const nextPublished = input.isPublished ?? existing[0]?.isPublished ?? false;
  const shouldUpdatePublished = input.isPublished !== undefined;

  const [row] = await db
    .update(spaceDocuments)
    .set({
      json,
      ...(shouldUpdatePublished
        ? nextPublished
          ? { publishedJson: json }
          : { publishedJson: null }
        : {}),
      isPublished: nextPublished,
      updatedAt: new Date(),
    })
    .where(eq(spaceDocuments.userId, input.userId))
    .returning();

  let publishedDocument: SpaceDocument | null = null;
  if (row.isPublished) {
    const parsedPublished = row.publishedJson ? parseSpaceDocument(row.publishedJson) : null;
    publishedDocument = parsedPublished
      ? { ...parsedPublished, blocks: normalizeBlocksLayout(parsedPublished.blocks) }
      : normalizedDocument;
  }

  return {
    ...row,
    document: normalizedDocument,
    publishedDocument,
  };
};
