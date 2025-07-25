import { env } from "cloudflare:workers";
import { RPCHandler } from "@orpc/server/fetch";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { auth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AdminChat as AdminChatClass } from "./durable-objects/admin-chat";
import { db } from "./db";
import { user } from "./db/schema/auth";
import { todo } from "./db/schema/todo";
import { eq } from "drizzle-orm";
import { createR2Client, uploadImage, generateImageKey, getImageUrl } from "./lib/r2";

const app = new Hono();

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

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Direct HTTP endpoint for creating todos with images
app.post("/api/todos/create-with-image", async (c) => {
  try {
    console.log('Creating todo with image via direct endpoint...');
    
    const contentType = c.req.header('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      console.log('Invalid content type:', contentType);
      return c.json({ error: 'Expected multipart/form-data' }, 400);
    }

    const formData = await c.req.formData();
    const text = formData.get('text') as string;
    const imageFile = formData.get('image') as File | null;

    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Todo text is required' }, 400);
    }

    console.log('Form data parsed:', { text, hasImage: !!imageFile, fileName: imageFile?.name, fileSize: imageFile?.size });

    // Create the todo first
    const result = await db
      .insert(todo)
      .values({
        text: text.trim(),
        imageUrl: null,
      })
      .returning();

    const createdTodo = result[0];
    console.log('Todo created:', createdTodo);

    // If there's an image, upload it to R2
    if (imageFile && imageFile.size > 0) {
      try {
        console.log('Uploading image to R2...');
        const r2 = createR2Client(c.env);

        // Generate unique key for the image
        const key = generateImageKey(createdTodo.id, imageFile.name);
        
        // Upload image to R2
        await uploadImage(r2, "ecomantem-todo-images", key, imageFile, imageFile.type);
        console.log('Image uploaded successfully');

        // Generate signed URL
        const imageUrl = await getImageUrl(r2, "ecomantem-todo-images", key);
        console.log('Generated image URL:', imageUrl);

        // Update todo with image URL
        const updatedResult = await db
          .update(todo)
          .set({ imageUrl })
          .where(eq(todo.id, createdTodo.id))
          .returning();

        console.log('Todo updated with image URL');
        return c.json(updatedResult[0]);
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Return the todo without image rather than failing completely
        return c.json(createdTodo);
      }
    }

    return c.json(createdTodo);
  } catch (error) {
    console.error('Error creating todo with image:', error);
    return c.json({ error: 'Failed to create todo' }, 500);
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
    const session = await auth.api.getSession(c.req.raw);
    if (!session || !session.user) {
      return c.text("Invalid session", 401);
    }

    // Verify user is admin
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
      },
    });

    return durableObject.fetch(wsRequest);
  } catch (error) {
    console.error("WebSocket auth error:", error);
    return c.text("Authentication failed", 401);
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

// Export the Durable Object class
export const AdminChat = AdminChatClass;
