import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { canvasBookmarks, canvasDocuments, canvasLikes, users } from "@/db/schema";
import { normalizeDbError } from "@/server/db-errors";
import { HttpError } from "@/server/http-error";

export type CanvasGallerySort = "new" | "top";

export type CanvasGalleryItem = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  stats: {
    likes: number;
    bookmarks: number;
  };
  viewer?: {
    hasLiked: boolean;
    hasBookmarked: boolean;
  };
};

export type PublishedCanvasDetail = CanvasGalleryItem & {
  snapshot: string | null;
  chatJson: string | null;
};

const selectAuthor = {
  id: users.id,
  name: users.name,
  image: users.image,
};

const likeCountSql = sql<number>`(
  select count(*) from ${canvasLikes} where ${canvasLikes.canvasId} = ${canvasDocuments.id}
)`.mapWith(Number);

const bookmarkCountSql = sql<number>`(
  select count(*) from ${canvasBookmarks} where ${canvasBookmarks.canvasId} = ${canvasDocuments.id}
)`.mapWith(Number);

const toPgBool = (value: unknown) => value === true || value === "t" || value === 1 || value === "1";

const hasLikedSql = (viewerUserId: string) =>
  sql<boolean>`exists(
    select 1 from ${canvasLikes}
    where ${canvasLikes.canvasId} = ${canvasDocuments.id}
      and ${canvasLikes.userId} = ${viewerUserId}
  )`.mapWith(toPgBool);

const hasBookmarkedSql = (viewerUserId: string) =>
  sql<boolean>`exists(
    select 1 from ${canvasBookmarks}
    where ${canvasBookmarks.canvasId} = ${canvasDocuments.id}
      and ${canvasBookmarks.userId} = ${viewerUserId}
  )`.mapWith(toPgBool);

export const listPublishedCanvases = async (params: {
  page: number;
  limit: number;
  sort: CanvasGallerySort;
  viewerUserId?: string | null;
}): Promise<CanvasGalleryItem[]> => {
  const viewerUserId = params.viewerUserId?.trim() || null;

  const orderBy =
    params.sort === "top"
      ? [desc(likeCountSql), desc(canvasDocuments.publishedAt), desc(canvasDocuments.updatedAt)]
      : [desc(canvasDocuments.publishedAt), desc(canvasDocuments.updatedAt)];

  try {
    const rows = await db
      .select({
        id: canvasDocuments.id,
        name: canvasDocuments.name,
        coverImageUrl: canvasDocuments.publishedCoverImageUrl,
        publishedAt: canvasDocuments.publishedAt,
        updatedAt: canvasDocuments.updatedAt,
        author: selectAuthor,
        likeCount: likeCountSql,
        bookmarkCount: bookmarkCountSql,
        viewerHasLiked: viewerUserId ? hasLikedSql(viewerUserId) : sql<boolean>`false`.mapWith(toPgBool),
        viewerHasBookmarked: viewerUserId
          ? hasBookmarkedSql(viewerUserId)
          : sql<boolean>`false`.mapWith(toPgBool),
      })
      .from(canvasDocuments)
      .innerJoin(users, eq(canvasDocuments.userId, users.id))
      .where(eq(canvasDocuments.isPublished, true))
      .orderBy(...orderBy)
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      coverImageUrl: row.coverImageUrl,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      author: row.author,
      stats: {
        likes: row.likeCount ?? 0,
        bookmarks: row.bookmarkCount ?? 0,
      },
      viewer: viewerUserId
        ? {
            hasLiked: Boolean(row.viewerHasLiked),
            hasBookmarked: Boolean(row.viewerHasBookmarked),
          }
        : undefined,
    }));
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to load gallery." });
  }
};

export const getPublishedCanvas = async (params: {
  id: string;
  viewerUserId?: string | null;
}): Promise<PublishedCanvasDetail | null> => {
  const viewerUserId = params.viewerUserId?.trim() || null;

  try {
    const [row] = await db
      .select({
        id: canvasDocuments.id,
        name: canvasDocuments.name,
        coverImageUrl: canvasDocuments.publishedCoverImageUrl,
        publishedAt: canvasDocuments.publishedAt,
        updatedAt: canvasDocuments.updatedAt,
        author: selectAuthor,
        snapshot: canvasDocuments.publishedSnapshot,
        chatJson: canvasDocuments.publishedChatJson,
        likeCount: likeCountSql,
        bookmarkCount: bookmarkCountSql,
        viewerHasLiked: viewerUserId ? hasLikedSql(viewerUserId) : sql<boolean>`false`.mapWith(toPgBool),
        viewerHasBookmarked: viewerUserId
          ? hasBookmarkedSql(viewerUserId)
          : sql<boolean>`false`.mapWith(toPgBool),
      })
      .from(canvasDocuments)
      .innerJoin(users, eq(canvasDocuments.userId, users.id))
      .where(and(eq(canvasDocuments.id, params.id), eq(canvasDocuments.isPublished, true)));

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      coverImageUrl: row.coverImageUrl,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      author: row.author,
      stats: {
        likes: row.likeCount ?? 0,
        bookmarks: row.bookmarkCount ?? 0,
      },
      viewer: viewerUserId
        ? {
            hasLiked: Boolean(row.viewerHasLiked),
            hasBookmarked: Boolean(row.viewerHasBookmarked),
          }
        : undefined,
      snapshot: row.snapshot ?? null,
      chatJson: row.chatJson ?? null,
    };
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to load canvas." });
  }
};

export const toggleCanvasLike = async (params: { canvasId: string; userId: string }) => {
  try {
    return await db.transaction(async (tx) => {
      const [published] = await tx
        .select({ id: canvasDocuments.id })
        .from(canvasDocuments)
        .where(and(eq(canvasDocuments.id, params.canvasId), eq(canvasDocuments.isPublished, true)));
      if (!published) {
        throw new HttpError(404, "Not found");
      }

      const [existing] = await tx
        .select({ id: canvasLikes.id })
        .from(canvasLikes)
        .where(and(eq(canvasLikes.canvasId, params.canvasId), eq(canvasLikes.userId, params.userId)));

      const liked = !existing;

      if (existing?.id) {
        await tx.delete(canvasLikes).where(eq(canvasLikes.id, existing.id));
      } else {
        await tx.insert(canvasLikes).values({
          canvasId: params.canvasId,
          userId: params.userId,
        });
      }

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(canvasLikes)
        .where(eq(canvasLikes.canvasId, params.canvasId));

      return { liked, likeCount: countRow?.count ?? 0 };
    });
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to update like." });
  }
};

export const toggleCanvasBookmark = async (params: { canvasId: string; userId: string }) => {
  try {
    return await db.transaction(async (tx) => {
      const [published] = await tx
        .select({ id: canvasDocuments.id })
        .from(canvasDocuments)
        .where(and(eq(canvasDocuments.id, params.canvasId), eq(canvasDocuments.isPublished, true)));
      if (!published) {
        throw new HttpError(404, "Not found");
      }

      const [existing] = await tx
        .select({ id: canvasBookmarks.id })
        .from(canvasBookmarks)
        .where(
          and(eq(canvasBookmarks.canvasId, params.canvasId), eq(canvasBookmarks.userId, params.userId)),
        );

      const bookmarked = !existing;

      if (existing?.id) {
        await tx.delete(canvasBookmarks).where(eq(canvasBookmarks.id, existing.id));
      } else {
        await tx.insert(canvasBookmarks).values({
          canvasId: params.canvasId,
          userId: params.userId,
        });
      }

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(canvasBookmarks)
        .where(eq(canvasBookmarks.canvasId, params.canvasId));

      return { bookmarked, bookmarkCount: countRow?.count ?? 0 };
    });
  } catch (error) {
    throw normalizeDbError(error, { fallbackMessage: "Failed to update bookmark." });
  }
};
