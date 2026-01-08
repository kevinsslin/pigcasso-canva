CREATE TABLE IF NOT EXISTS "github_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"githubUserId" text NOT NULL,
	"githubUsername" text,
	"accessTokenEncrypted" text NOT NULL,
	"refreshTokenEncrypted" text,
	"scopes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_connection" ADD CONSTRAINT "github_connection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "github_connection_user_unique" ON "github_connection" USING btree ("userId");
