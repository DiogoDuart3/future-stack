import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema/auth";
import { env } from "cloudflare:workers";
import { createDatabaseConnection } from "./db-factory";

// Create a function that returns the auth configuration with a fresh database connection
export function createAuth() {
  const db = createDatabaseConnection(env);
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/auth",
  });
}

// Export the auth instance for backward compatibility (but this should be avoided)
export const auth = createAuth();
