CREATE TABLE IF NOT EXISTS "ai_daily_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"generateCount" integer DEFAULT 0 NOT NULL,
	"removeBgCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "account";--> statement-breakpoint
DROP TABLE IF EXISTS "authenticator";--> statement-breakpoint
DROP TABLE IF EXISTS "session";--> statement-breakpoint
DROP TABLE IF EXISTS "subscription";--> statement-breakpoint
DROP TABLE IF EXISTS "verificationToken";--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "isTemplate" SET DEFAULT false;--> statement-breakpoint
UPDATE "project" SET "isTemplate" = false WHERE "isTemplate" IS NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "isTemplate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "isPro" SET DEFAULT false;--> statement-breakpoint
UPDATE "project" SET "isPro" = false WHERE "isPro" IS NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "isPro" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "isPublicTemplate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "creatorWallet" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "parentProjectId" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "publishedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "privyUserId" text;--> statement-breakpoint
UPDATE "user" SET "privyUserId" = "id" WHERE "privyUserId" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "privyUserId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "embeddedWalletAddress" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "externalWalletAddress" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isPro" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "proBalanceRaw" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "proWalletAddress" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "proCheckedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_daily_usage" ADD CONSTRAINT "ai_daily_usage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_daily_usage_user_date_unique" ON "ai_daily_usage" USING btree ("userId","date");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "emailVerified";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "password";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_privyUserId_unique" UNIQUE("privyUserId");
