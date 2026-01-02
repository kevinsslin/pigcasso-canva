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
  twitterSubject: text("twitterSubject"),
  twitterUsername: text("twitterUsername"),
  discordSubject: text("discordSubject"),
  discordUsername: text("discordUsername"),
  telegramUserId: text("telegramUserId"),
  telegramUsername: text("telegramUsername"),
  embeddedWalletAddress: text("embeddedWalletAddress"),
  externalWalletAddress: text("externalWalletAddress"),
  isPro: boolean("isPro").notNull().default(false),
  proBalanceRaw: text("proBalanceRaw"),
  proWalletAddress: text("proWalletAddress"),
  proCheckedAt: timestamp("proCheckedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const spaceDocuments = pgTable(
  "space_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    json: text("json").notNull(),
    isPublished: boolean("isPublished").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex("space_document_user_unique").on(table.userId),
  }),
);

export const usersRelations = relations(users, ({ many, one }) => ({
  spaceDocument: one(spaceDocuments, {
    fields: [users.id],
    references: [spaceDocuments.userId],
  }),
  projects: many(projects),
  projectHubs: many(projectHubs),
  nftCollections: many(nftCollections),
  nftAssets: many(nftAssets),
}));

export const spaceDocumentsRelations = relations(spaceDocuments, ({ one }) => ({
  user: one(users, {
    fields: [spaceDocuments.userId],
    references: [users.id],
  }),
}));

export const projectHubs = pgTable(
  "project_hub",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("ownerId").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logoUrl"),
    bannerUrl: text("bannerUrl"),
    websiteUrl: text("websiteUrl"),
    xUrl: text("xUrl"),
    discordUrl: text("discordUrl"),
    telegramUrl: text("telegramUrl"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex("project_hub_slug_unique").on(table.slug),
  }),
);

export const projectHubsRelations = relations(projectHubs, ({ one, many }) => ({
  owner: one(users, {
    fields: [projectHubs.ownerId],
    references: [users.id],
  }),
  templates: many(projects),
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
  projectHubId: text("projectHubId").references(() => projectHubs.id, {
    onDelete: "set null",
  }),
  templateCategory: text("templateCategory"),
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
  hub: one(projectHubs, {
    fields: [projects.projectHubId],
    references: [projectHubs.id],
  }),
  pages: many(projectPages),
  nftAssets: many(nftAssets),
}));

export const projectsInsertSchema = createInsertSchema(projects);

export const projectPages = pgTable(
  "project_page",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    name: text("name"),
    json: text("json").notNull(),
    height: integer("height").notNull(),
    width: integer("width").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIndexUnique: uniqueIndex("project_page_project_index_unique").on(
      table.projectId,
      table.index,
    ),
  }),
);

export const projectPagesRelations = relations(projectPages, ({ one }) => ({
  project: one(projects, {
    fields: [projectPages.projectId],
    references: [projects.id],
  }),
}));

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
    projectPageId: text("projectPageId").references(() => projectPages.id, {
      onDelete: "set null",
    }),
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
  projectPage: one(projectPages, {
    fields: [nftAssets.projectPageId],
    references: [projectPages.id],
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

export const templateTokens = pgTable(
  "template_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    templateProjectId: text("templateProjectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    creatorUserId: text("creatorUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    printrTokenId: text("printrTokenId").notNull(),
    creatorAccount: text("creatorAccount").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    description: text("description").notNull(),
    imageUrl: text("imageUrl"),
    externalLinks: text("externalLinks"),
    chains: text("chains").notNull(),
    initialBuy: text("initialBuy").notNull(),
    quote: text("quote").notNull(),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("created"),
    txHash: text("txHash"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    templateUnique: uniqueIndex("template_token_template_unique").on(
      table.templateProjectId,
    ),
    printrTokenUnique: uniqueIndex("template_token_printr_token_unique").on(
      table.printrTokenId,
    ),
  }),
);

export const templateTokensRelations = relations(templateTokens, ({ one }) => ({
  template: one(projects, {
    fields: [templateTokens.templateProjectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [templateTokens.creatorUserId],
    references: [users.id],
  }),
}));

export const templateUsageEvents = pgTable("template_usage_event", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  templateProjectId: text("templateProjectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const templateUsageEventsRelations = relations(
  templateUsageEvents,
  ({ one }) => ({
    template: one(projects, {
      fields: [templateUsageEvents.templateProjectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [templateUsageEvents.userId],
      references: [users.id],
    }),
  }),
);
