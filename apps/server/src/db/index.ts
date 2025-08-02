
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from "cloudflare:workers";

// Check if we're in development mode
const isDevelopment = (env.NODE_ENV as string) === 'development';

let db;

if (isDevelopment) {
  // Use local PostgreSQL for development
  const sql = postgres(env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/ecomantem");
  db = drizzlePostgres(sql);
} else {
  // Use Neon for production
  const sql = neon(env.DATABASE_URL || "");
  db = drizzle(sql);
}

export { db };
