CREATE TABLE IF NOT EXISTS "presentation_deck" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"spec" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "presentation_slide" (
	"id" text PRIMARY KEY NOT NULL,
	"deckId" text NOT NULL,
	"projectId" text NOT NULL,
	"index" integer NOT NULL,
	"title" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "presentation_deck" ADD CONSTRAINT "presentation_deck_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "presentation_slide" ADD CONSTRAINT "presentation_slide_deckId_presentation_deck_id_fk" FOREIGN KEY ("deckId") REFERENCES "public"."presentation_deck"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "presentation_slide" ADD CONSTRAINT "presentation_slide_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "presentation_slide_deck_index_unique" ON "presentation_slide" USING btree ("deckId","index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "presentation_slide_deck_project_unique" ON "presentation_slide" USING btree ("deckId","projectId");