import { env } from "cloudflare:workers";
import { RPCHandler } from "@orpc/server/fetch";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { auth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AdminChat } from "./durable-objects/admin-chat";
import { db } from "./db";
import { user } from "./db/schema/auth";
import { eq } from "drizzle-orm";

const app = new Hono();

app.use(logger());
app.use("/*", cors({
  origin: env.CORS_ORIGIN || "",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

const handler = new RPCHandler(appRouter);
app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});




// WebSocket route for admin chat
app.get("/ws/admin-chat", async (c) => {
  const upgradeHeader = c.req.header("upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected websocket", 400);
  }

  // Validate session from Authorization header or cookie
  const authHeader = c.req.header("Authorization") || c.req.header("Cookie");
  if (!authHeader) {
    return c.text("Authentication required", 401);
  }

  try {
    // Validate session using better-auth
    const session = await auth.validateSession(c.req.raw);
    if (!session || !session.user) {
      return c.text("Invalid session", 401);
    }

    // Verify user is admin
    const userRecord = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!userRecord[0]?.isAdmin) {
      return c.text("Admin access required", 403);
    }

    // Get Durable Object instance and pass validated user info
    const id = c.env.ADMIN_CHAT.idFromName("admin-chat-room");
    const durableObject = c.env.ADMIN_CHAT.get(id);

    // Create new request with user info in headers
    const wsRequest = new Request(c.req.raw.url, {
      method: c.req.raw.method,
      headers: {
        ...Object.fromEntries(c.req.raw.headers.entries()),
        'x-user-id': session.user.id,
        'x-user-name': session.user.name || 'Admin User',
        'x-user-email': session.user.email || '',
      },
    });

    return durableObject.fetch(wsRequest);
  } catch (error) {
    console.error('WebSocket auth error:', error);
    return c.text("Authentication failed", 401);
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
export { AdminChat };
