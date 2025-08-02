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
    const sql = neon(env.DATABASE_URL || "");
    return drizzle(sql);
  }
} 