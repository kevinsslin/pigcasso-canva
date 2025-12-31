CREATE TABLE IF NOT EXISTS "template_token" (
	"id" text PRIMARY KEY NOT NULL,
	"templateProjectId" text NOT NULL,
	"creatorUserId" text NOT NULL,
	"printrTokenId" text NOT NULL,
	"creatorAccount" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text,
	"externalLinks" text,
	"chains" text NOT NULL,
	"initialBuy" text NOT NULL,
	"quote" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"txHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_usage_event" (
	"id" text PRIMARY KEY NOT NULL,
	"templateProjectId" text NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_token" ADD CONSTRAINT "template_token_templateProjectId_project_id_fk" FOREIGN KEY ("templateProjectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_token" ADD CONSTRAINT "template_token_creatorUserId_user_id_fk" FOREIGN KEY ("creatorUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_usage_event" ADD CONSTRAINT "template_usage_event_templateProjectId_project_id_fk" FOREIGN KEY ("templateProjectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_usage_event" ADD CONSTRAINT "template_usage_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "template_token_template_unique" ON "template_token" USING btree ("templateProjectId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "template_token_printr_token_unique" ON "template_token" USING btree ("printrTokenId");