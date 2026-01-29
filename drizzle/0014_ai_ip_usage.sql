CREATE TABLE IF NOT EXISTS "ai_ip_daily_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"date" text NOT NULL,
	"imageCount" integer DEFAULT 0 NOT NULL,
	"separateLayersCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_ip_daily_usage_ip_date_unique" ON "ai_ip_daily_usage" USING btree ("ip","date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_ip_workflow_usage" (
	"workflowId" text PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"date" text NOT NULL,
	"action" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_ip_workflow_usage_ip_date_idx" ON "ai_ip_workflow_usage" USING btree ("ip","date");
