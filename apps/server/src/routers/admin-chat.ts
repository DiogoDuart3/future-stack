import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { publicProcedure } from "../lib/orpc";

export const adminChatRouter = {
  connect: publicProcedure
    .input(z.object({ 
      userId: z.string(),
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings & { ADMIN_CHAT: DurableObjectNamespace };
      
      // Verify user is admin
      const userRecord = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);
      if (!userRecord[0]?.isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get Durable Object instance
      const id = env.ADMIN_CHAT.idFromName("admin-chat-room");
      const durableObject = env.ADMIN_CHAT.get(id);

      // Create WebSocket connection
      const response = await durableObject.fetch(new Request(`${env.BETTER_AUTH_URL}/ws/admin-chat`, {
        headers: {
          "Upgrade": "websocket",
        },
      }));

      return response;
    }),

  checkAdminStatus: publicProcedure
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input }) => {
      const userRecord = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);
      return { isAdmin: userRecord[0]?.isAdmin || false };
    }),
};