import { defineConfig } from "drizzle-kit";
import { env } from "cloudflare:workers";

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL || "",
  },
});
