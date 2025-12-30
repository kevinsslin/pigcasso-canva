import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { MANTLE_CHAIN_ID } from "@/lib/web3-constants";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  privyUserId: text("privyUserId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
  bio: text("bio"),
  embeddedWalletAddress: text("embeddedWalletAddress"),
  externalWalletAddress: text("externalWalletAddress"),
  isPro: boolean("isPro").notNull().default(false),
  proBalanceRaw: text("proBalanceRaw"),
  proWalletAddress: text("proWalletAddress"),
  proCheckedAt: timestamp("proCheckedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  nftCollections: many(nftCollections),
  nftAssets: many(nftAssets),
}));

export const projects = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  json: text("json").notNull(),
  height: integer("height").notNull(),
  width: integer("width").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  isTemplate: boolean("isTemplate").notNull().default(false),
  isPublicTemplate: boolean("isPublicTemplate").notNull().default(false),
  isPro: boolean("isPro").notNull().default(false),
  creatorWallet: text("creatorWallet"),
  parentProjectId: text("parentProjectId"),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  nftAssets: many(nftAssets),
}));

export const projectsInsertSchema = createInsertSchema(projects);

export const nftCollections = pgTable(
  "nft_collection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chainId: integer("chainId").notNull().default(MANTLE_CHAIN_ID),
    address: text("address"),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    contractUri: text("contractUri"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    chainAddressUnique: uniqueIndex("nft_collection_chain_address_unique").on(
      table.chainId,
      table.address,
    ),
  }),
);

export const nftCollectionsRelations = relations(nftCollections, ({ one, many }) => ({
  user: one(users, {
    fields: [nftCollections.userId],
    references: [users.id],
  }),
  assets: many(nftAssets),
}));

export const nftAssets = pgTable(
  "nft_asset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    chainId: integer("chainId").notNull().default(MANTLE_CHAIN_ID),
    collectionId: text("collectionId").references(() => nftCollections.id, {
      onDelete: "set null",
    }),
    collectionAddress: text("collectionAddress"),
    tokenId: text("tokenId"),
    txHash: text("txHash"),
    status: text("status").notNull().default("draft"),
    metadataUri: text("metadataUri"),
    imageUri: text("imageUri"),
    name: text("name"),
    description: text("description"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    chainCollectionTokenUnique: uniqueIndex("nft_asset_chain_collection_token_unique").on(
      table.chainId,
      table.collectionAddress,
      table.tokenId,
    ),
  }),
);

export const nftAssetsRelations = relations(nftAssets, ({ one }) => ({
  user: one(users, {
    fields: [nftAssets.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [nftAssets.projectId],
    references: [projects.id],
  }),
  collection: one(nftCollections, {
    fields: [nftAssets.collectionId],
    references: [nftCollections.id],
  }),
}));

export const aiDailyUsage = pgTable(
  "ai_daily_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    generateCount: integer("generateCount").notNull().default(0),
    removeBgCount: integer("removeBgCount").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: uniqueIndex("ai_daily_usage_user_date_unique").on(
      table.userId,
      table.date,
    ),
  }),
);
