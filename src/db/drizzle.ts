import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { createLazyProxy } from "@/lib/lazy-proxy";

type DrizzleDb = ReturnType<typeof drizzle>;

let cachedDb: DrizzleDb | null = null;

const getDb = (): DrizzleDb => {
  if (cachedDb) {
    return cachedDb;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it in `.env.local` (see `.env.example`).",
    );
  }

  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql);
  return cachedDb;
};

export const db: DrizzleDb = createLazyProxy(getDb);
