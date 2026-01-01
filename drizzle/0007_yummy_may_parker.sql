CREATE TABLE IF NOT EXISTS "project_hub" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logoUrl" text,
	"bannerUrl" text,
	"websiteUrl" text,
	"xUrl" text,
	"discordUrl" text,
	"telegramUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_page" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"index" integer NOT NULL,
	"name" text,
	"json" text NOT NULL,
	"height" integer NOT NULL,
	"width" integer NOT NULL,
	"thumbnailUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "presentation_deck";--> statement-breakpoint
DROP TABLE IF EXISTS "presentation_slide";--> statement-breakpoint
ALTER TABLE "nft_asset" ADD COLUMN IF NOT EXISTS "projectPageId" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "projectHubId" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "templateCategory" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "twitterSubject" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "twitterUsername" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "discordSubject" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "discordUsername" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegramUserId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegramUsername" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_hub" ADD CONSTRAINT "project_hub_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_page" ADD CONSTRAINT "project_page_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_hub_slug_unique" ON "project_hub" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_page_project_index_unique" ON "project_page" USING btree ("projectId","index");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_asset" ADD CONSTRAINT "nft_asset_projectPageId_project_page_id_fk" FOREIGN KEY ("projectPageId") REFERENCES "public"."project_page"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project" ADD CONSTRAINT "project_projectHubId_project_hub_id_fk" FOREIGN KEY ("projectHubId") REFERENCES "public"."project_hub"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN IF EXISTS "json";
