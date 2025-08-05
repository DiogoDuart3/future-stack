import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from "cloudflare:workers";

export function createDatabaseConnection() {
  const isDevelopment = (env.NODE_ENV as string) === 'development';
  
  if (isDevelopment) {
    // Use local PostgreSQL for development with optimized settings
    const sql = postgres(env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/ecomantem", {
      max: 1, // Limit connections to prevent CPU time limit
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout of 10 seconds
    });
    return drizzlePostgres(sql);
  } else {
    // Use Neon for production with optimized settings
    if (!env.DATABASE_URL || env.DATABASE_URL === "") {
      throw new Error("DATABASE_URL environment variable is required for production. Please set it in your Cloudflare Workers environment variables.");
    }
    const sql = neon(env.DATABASE_URL);
    return drizzle(sql);
  }
} 