import { env } from "cloudflare:workers";
import { RPCHandler } from "@orpc/server/fetch";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { createAuth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AdminChat } from "./durable-objects/admin-chat";
import { PublicChat } from "./durable-objects/public-chat";
import { user } from "./db/schema/auth";
import { todo } from "./db/schema/todo";
import { eq, sql } from "drizzle-orm";
import {
  createR2Client,
  uploadImage,
  generateImageKey,
  getImageUrl,
} from "./lib/r2";
import { broadcastToAdminChat } from "./lib/broadcast";
import { createDatabaseConnection } from "./lib/db-factory";
import type {
  Env,
  BroadcastMessageRequest,
  BroadcastMessageResponse,
  ErrorResponse,
} from "./types/global";

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/auth/**", (c) => createAuth().handler(c.req.raw));

// Direct HTTP endpoint for creating todos with images
app.post("/todos/create-with-image", async (c) => {
  try {
    console.log("Creating todo with image via direct endpoint...");

    const contentType = c.req.header("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      console.log("Invalid content type:", contentType);
      return c.json({ error: "Expected multipart/form-data" }, 400);
    }

    const formData = await c.req.formData();
    const text = formData.get("text") as string;
    const imageFile = formData.get("image") as File | null;

    if (!text || text.trim().length === 0) {
      return c.json({ error: "Todo text is required" }, 400);
    }

    console.log("Form data parsed:", {
      text,
      hasImage: !!imageFile,
      fileName: imageFile?.name,
      fileSize: imageFile?.size,
    });

    // Create the todo first
    const db = createDatabaseConnection();
    const result = await db
      .insert(todo)
      .values({
        text: text.trim(),
        imageUrl: null,
      })
      .returning();

    const createdTodo = result[0];
    console.log("Todo created:", createdTodo);

    // If there's an image, upload it to R2
    if (imageFile && imageFile.size > 0) {
      try {
        console.log("Uploading image to R2...");
        const r2 = createR2Client(c.env);

        // Generate unique key for the image
        const key = generateImageKey(createdTodo.id, imageFile.name);

        // Upload image to R2
        await uploadImage(
          r2,
          "ecomantem-todo-images",
          key,
          imageFile,
          imageFile.type
        );
        console.log("Image uploaded successfully");

        // Store the R2 key in the imageUrl field (not a signed URL)
        console.log("Generated image key:", key);

        // Update todo with image key (stored as imageUrl)
        const updatedResult = await db
          .update(todo)
          .set({ imageUrl: key })
          .where(eq(todo.id, createdTodo.id))
          .returning();

        console.log("Todo updated with image URL");

        return c.json(updatedResult[0]);
      } catch (error) {
        console.error("Failed to upload image:", error);
        // Return the todo without image rather than failing completely
        return c.json(createdTodo);
      }
    }

    try {
      const env = c.env as Env;
      await broadcastToAdminChat(env, `New todo created: "${text}"`);
    } catch (error) {
      console.error("Failed to broadcast todo creation:", error);
    }

    return c.json(createdTodo);
  } catch (error) {
    console.error("Error creating todo with image:", error);
    return c.json({ error: "Failed to create todo" }, 500);
  }
});

// POST endpoint to broadcast messages to admin chat WebSocket
app.post("/admin-chat/broadcast", async (c) => {
  try {
    // Validate session
    /* const session = await auth.api.getSession(c.req.raw);
    if (!session || !session.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Verify user is admin
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (!userRecord[0]?.isAdmin) {
      return c.json({ error: "Admin access required" }, 403);
    } */

    // Parse the request body
    const body = (await c.req.json()) as BroadcastMessageRequest;
    const { message } = body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return c.json(
        {
          error: "Message is required and must be a non-empty string",
        } as ErrorResponse,
        400
      );
    }

    // Use the broadcast utility function
    await broadcastToAdminChat(c.env, message);

    return c.json({
      success: true,
      message: "Message broadcasted successfully",
    } as BroadcastMessageResponse);
  } catch (error) {
    console.error("Error broadcasting message:", error);
    return c.json({ error: "Internal server error" } as ErrorResponse, 500);
  }
});

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
    const session = await createAuth().api.getSession(c.req.raw);
    if (!session || !session.user) {
      return c.text("Invalid session", 401);
    }

    // Verify user is admin
    const db = createDatabaseConnection();
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
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
        "x-user-id": session.user.id,
        "x-user-name": session.user.name || "Admin User",
        "x-user-email": session.user.email || "",
        "x-database-url": c.env.DATABASE_URL || "",
        "x-node-env": c.env.NODE_ENV || "",
      },
    });

    return durableObject.fetch(wsRequest);
  } catch (error) {
    console.error("WebSocket auth error:", error);
    return c.text("Authentication failed", 401);
  }
});

// WebSocket route for public chat
app.get("/ws/public-chat", async (c) => {
  const upgradeHeader = c.req.header("upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected websocket", 400);
  }

  // Check for authentication
  const authHeader = c.req.header("Authorization") || c.req.header("Cookie");
  let isGuest = false;
  let userInfo = {
    userId: "",
    userName: "",
    userEmail: "",
    userProfilePicture: "",
  };

  if (authHeader) {
    try {
      // Validate session using better-auth
      const session = await createAuth().api.getSession(c.req.raw);
      if (session && session.user) {
        // Get user record to check if they exist and get profile picture
        const db = createDatabaseConnection();
        const userRecord = await db
          .select()
          .from(user)
          .where(eq(user.id, session.user.id))
          .limit(1);
        if (userRecord[0]) {
          userInfo = {
            userId: session.user.id,
            userName: session.user.name || "User",
            userEmail: session.user.email || "",
            userProfilePicture: userRecord[0].profilePicture || "",
          };
        }
      }
    } catch (error) {
      console.error("WebSocket auth error:", error);
      // Continue as guest if auth fails
    }
  }

  // If no valid session, treat as guest
  if (!userInfo.userId) {
    isGuest = true;
    userInfo = {
      userId: `guest_${crypto.randomUUID()}`,
      userName: "Guest",
      userEmail: "",
      userProfilePicture: "",
    };
  }

  // Get Durable Object instance and pass user info in headers
  const id = c.env.PUBLIC_CHAT.idFromName("public-chat-room");
  const durableObject = c.env.PUBLIC_CHAT.get(id);

  // Create new request with user info in headers
  const wsRequest = new Request(c.req.raw.url, {
    method: c.req.raw.method,
    headers: {
      ...Object.fromEntries(c.req.raw.headers.entries()),
      "x-user-id": userInfo.userId,
      "x-user-name": userInfo.userName,
      "x-user-email": userInfo.userEmail,
      "x-user-profile-picture": userInfo.userProfilePicture,
      "x-is-guest": isGuest.toString(),
      "x-database-url": c.env.DATABASE_URL || "",
      "x-node-env": c.env.NODE_ENV || "",
    },
  });

  return durableObject.fetch(wsRequest);
});

// Health check endpoint
app.get("/health", async (c) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    const db = createDatabaseConnection();
    const dbCheck = await db.execute(sql`SELECT 1 as health_check`);
    
    // Check R2 connection (test bucket access)
    let r2Check: { status: string; error?: string } = { status: "unknown" };
    try {
      const r2 = createR2Client(c.env);
      // Test R2 access by trying to list objects in the bucket
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const command = new ListObjectsV2Command({
        Bucket: "ecomantem-todo-images",
        MaxKeys: 1
      });
      await r2.send(command);
      r2Check = { status: "healthy" };
    } catch (error) {
      r2Check = { 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
    
    // Check Durable Objects (AdminChat and PublicChat)
    let durableObjectCheck: { status: string; error?: string } = { status: "unknown" };
    try {
      const adminChatId = c.env.ADMIN_CHAT.idFromName("health-check");
      const publicChatId = c.env.PUBLIC_CHAT.idFromName("health-check");
      const adminChatObject = c.env.ADMIN_CHAT.get(adminChatId);
      const publicChatObject = c.env.PUBLIC_CHAT.get(publicChatId);
      durableObjectCheck = { status: "healthy" };
    } catch (error) {
      durableObjectCheck = { 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: c.env.NODE_ENV || "production",
      uptime: process.uptime ? Math.floor(process.uptime()) : "unknown",
      responseTime: `${responseTime}ms`,
      checks: {
        database: {
          status: dbCheck ? "healthy" : "unhealthy",
          responseTime: `${responseTime}ms`
        },
        storage: r2Check,
        durableObjects: durableObjectCheck
      }
    };
    
    // Determine overall health status
    const allChecksHealthy = healthStatus.checks.database.status === "healthy" && 
                           healthStatus.checks.storage.status === "healthy" &&
                           healthStatus.checks.durableObjects.status === "healthy";
    
    if (!allChecksHealthy) {
      healthStatus.status = "degraded";
      return c.json(healthStatus, 503);
    }
    
    return c.json(healthStatus);
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      checks: {
        database: { status: "unhealthy", error: error instanceof Error ? error.message : "Unknown error" },
        storage: { status: "unknown" },
        durableObjects: { status: "unknown" }
      }
    }, 500);
  }
});

// Simple health check for load balancers
app.get("/", (c) => {
  return c.text("OK");
});

export default app;
// Export the Durable Object classes
export { AdminChat, PublicChat };

