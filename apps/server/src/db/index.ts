
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from "cloudflare:workers";

const sql = neon(env.DATABASE_URL || "");
export const db = drizzle(sql);
