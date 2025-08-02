import { defineConfig } from "drizzle-kit";

// Get database URL from environment
function getDatabaseUrl(): string {
  // Check if we're in a Cloudflare Workers-like environment
  if (typeof globalThis !== 'undefined' && 'env' in globalThis) {
    return (globalThis as any).env?.DATABASE_URL || "";
  }
  
  // Fallback to process.env for Node.js (drizzle-kit)
  return process.env.DATABASE_URL || "";
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
