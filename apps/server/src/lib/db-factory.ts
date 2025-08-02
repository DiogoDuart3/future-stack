import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDatabaseConnection(env: { DATABASE_URL?: string; NODE_ENV?: string }) {
  const isDevelopment = (env.NODE_ENV as string) === 'development';
  
  if (isDevelopment) {
    // Use local PostgreSQL for development
    const sql = postgres(env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/ecomantem");
    return drizzlePostgres(sql);
  } else {
    // Use Neon for production
    if (!env.DATABASE_URL || env.DATABASE_URL === "") {
      throw new Error("DATABASE_URL environment variable is required for production. Please set it in your Cloudflare Workers environment variables.");
    }
    const sql = neon(env.DATABASE_URL);
    return drizzle(sql);
  }
} 