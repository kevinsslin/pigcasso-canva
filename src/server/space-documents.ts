import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { spaceDocuments } from "@/db/schema";
import { spaceDocumentSchema, getDefaultSpaceDocument, type SpaceDocument } from "@/features/spaces/lib/space-document";

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
    return { ...row, json: JSON.stringify(fallback), document: fallback };
  }

  return { ...row, document };
};

export const getPublishedSpaceDocumentForUserId = async (userId: string) => {
  const row = await getSpaceDocumentForUserId(userId);
  if (!row || !row.isPublished) return null;
  return row.document;
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
    .values({ userId, json, isPublished: false })
    .returning();

  return { ...row, document };
};

export const upsertSpaceDocumentForUserId = async (input: {
  userId: string;
  document: SpaceDocument;
  isPublished?: boolean;
}) => {
  const json = JSON.stringify(input.document);
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
        isPublished: input.isPublished ?? false,
      })
      .returning();
    return { ...row, document: input.document };
  }

  const nextPublished = input.isPublished ?? existing[0]?.isPublished ?? false;
  const [row] = await db
    .update(spaceDocuments)
    .set({ json, isPublished: nextPublished, updatedAt: new Date() })
    .where(eq(spaceDocuments.userId, input.userId))
    .returning();

  return { ...row, document: input.document };
};
