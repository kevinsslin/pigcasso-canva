ALTER TABLE "canvas_document" ADD COLUMN "publishedSnapshot" text;
--> statement-breakpoint
ALTER TABLE "canvas_document" ADD COLUMN "publishedChatJson" text;
--> statement-breakpoint
ALTER TABLE "canvas_document" ADD COLUMN "publishedCoverImageUrl" text;
--> statement-breakpoint
ALTER TABLE "canvas_document" ADD COLUMN "isPublished" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "canvas_document" ADD COLUMN "publishedAt" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canvas_document_published_idx" ON "canvas_document" USING btree ("isPublished","publishedAt");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "canvas_like" (
	"id" text PRIMARY KEY NOT NULL,
	"canvasId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canvas_like" ADD CONSTRAINT "canvas_like_canvasId_canvas_document_id_fk" FOREIGN KEY ("canvasId") REFERENCES "public"."canvas_document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canvas_like" ADD CONSTRAINT "canvas_like_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "canvas_like_canvas_user_unique" ON "canvas_like" USING btree ("canvasId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canvas_like_canvas_idx" ON "canvas_like" USING btree ("canvasId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "canvas_bookmark" (
	"id" text PRIMARY KEY NOT NULL,
	"canvasId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canvas_bookmark" ADD CONSTRAINT "canvas_bookmark_canvasId_canvas_document_id_fk" FOREIGN KEY ("canvasId") REFERENCES "public"."canvas_document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canvas_bookmark" ADD CONSTRAINT "canvas_bookmark_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "canvas_bookmark_canvas_user_unique" ON "canvas_bookmark" USING btree ("canvasId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canvas_bookmark_canvas_idx" ON "canvas_bookmark" USING btree ("canvasId");
