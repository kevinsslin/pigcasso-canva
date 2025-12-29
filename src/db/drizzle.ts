import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

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

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb() as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as DrizzleDb;
