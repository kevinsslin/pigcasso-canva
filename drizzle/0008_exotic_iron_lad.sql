CREATE TABLE IF NOT EXISTS "space_document" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"json" text NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_document" ADD CONSTRAINT "space_document_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "space_document_user_unique" ON "space_document" USING btree ("userId");