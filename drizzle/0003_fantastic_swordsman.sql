CREATE TABLE IF NOT EXISTS "nft_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text NOT NULL,
	"chainId" integer DEFAULT 5000 NOT NULL,
	"collectionId" text,
	"collectionAddress" text,
	"tokenId" text,
	"txHash" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadataUri" text,
	"imageUri" text,
	"name" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nft_collection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"chainId" integer DEFAULT 5000 NOT NULL,
	"address" text,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"contractUri" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_asset" ADD CONSTRAINT "nft_asset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_asset" ADD CONSTRAINT "nft_asset_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_asset" ADD CONSTRAINT "nft_asset_collectionId_nft_collection_id_fk" FOREIGN KEY ("collectionId") REFERENCES "public"."nft_collection"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_collection" ADD CONSTRAINT "nft_collection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nft_asset_chain_collection_token_unique" ON "nft_asset" USING btree ("chainId","collectionAddress","tokenId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nft_collection_chain_address_unique" ON "nft_collection" USING btree ("chainId","address");