import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema/auth";
import { env } from "cloudflare:workers";

// Parse CORS_ORIGIN for trusted origins
const trustedOrigins = env.CORS_ORIGIN 
  ? env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/auth",
});
