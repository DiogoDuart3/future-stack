import { eq, desc } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { publicChatMessages } from "../db/schema/public_chat_messages";
import { publicProcedure } from "../lib/orpc";

export const publicChatRouter = {
  connect: publicProcedure
    .input(z.object({ 
      userId: z.string(),
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings & { PUBLIC_CHAT: DurableObjectNamespace };
      
      // Verify user exists and is authorized
      const userRecord = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);
      if (!userRecord[0]) {
        throw new Error('Unauthorized: User not found');
      }

      // Get Durable Object instance
      const id = env.PUBLIC_CHAT.idFromName("public-chat-room");
      const durableObject = env.PUBLIC_CHAT.get(id);

      // Create WebSocket connection
      const response = await durableObject.fetch(new Request(`${env.BETTER_AUTH_URL}/ws/public-chat`, {
        headers: {
          "Upgrade": "websocket",
        },
      }));

      return response;
    }),

  getRecentMessages: publicProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(50)
    }))
    .handler(async ({ input }) => {
      const messages = await db
        .select({
          id: publicChatMessages.id,
          message: publicChatMessages.message,
          userId: publicChatMessages.userId,
          userName: publicChatMessages.userName,
          userEmail: publicChatMessages.userEmail,
          userProfilePicture: publicChatMessages.userProfilePicture,
          createdAt: publicChatMessages.createdAt,
        })
        .from(publicChatMessages)
        .orderBy(desc(publicChatMessages.createdAt))
        .limit(input.limit);

      return messages.reverse(); // Return in chronological order
    }),

  getUserInfo: publicProcedure
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input }) => {
      const userRecord = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
        })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      return userRecord[0] || null;
    }),
}; 