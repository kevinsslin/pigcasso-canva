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
DO $$ BEGIN
 ALTER TABLE "project_page" ADD CONSTRAINT "project_page_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_page_project_index_unique" ON "project_page" USING btree ("projectId","index");
--> statement-breakpoint
INSERT INTO "project_page" (
	"id",
	"projectId",
	"index",
	"name",
	"json",
	"height",
	"width",
	"thumbnailUrl",
	"createdAt",
	"updatedAt"
)
SELECT
	"id",
	"id",
	0,
	'Page 1',
	"json",
	"height",
	"width",
	"thumbnailUrl",
	"createdAt",
	"updatedAt"
FROM "project"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "nft_asset" ADD COLUMN IF NOT EXISTS "projectPageId" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_asset" ADD CONSTRAINT "nft_asset_projectPageId_project_page_id_fk" FOREIGN KEY ("projectPageId") REFERENCES "public"."project_page"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "presentation_slide";
--> statement-breakpoint
DROP TABLE IF EXISTS "presentation_deck";
--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN IF EXISTS "json";
