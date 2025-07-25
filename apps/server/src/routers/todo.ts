import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { todo } from "../db/schema/todo";
import { publicProcedure } from "../lib/orpc";
import { createR2Client, uploadImage, generateImageKey, getImageUrl } from "../lib/r2";

export const todoRouter = {
  getAll: publicProcedure.handler(async () => {
    return await db.select().from(todo);
  }),

  create: publicProcedure
    .input(z.object({ 
      text: z.string().min(1),
      imageUrl: z.string().optional()
    }))
    .handler(async ({ input }) => {
      const result = await db
        .insert(todo)
        .values({
          text: input.text,
          imageUrl: input.imageUrl,
        })
        .returning();
      
      return result[0]; // Return the created todo with its ID
    }),

  uploadImage: publicProcedure
    .input(z.object({
      todoId: z.number(),
      filename: z.string(),
      contentType: z.string(),
      fileData: z.string() // Base64 encoded file data
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings;
      const r2 = createR2Client(env);
      
      // Decode base64 file data
      const fileBuffer = Uint8Array.from(atob(input.fileData), c => c.charCodeAt(0));
      
      const key = generateImageKey(input.todoId, input.filename);
      await uploadImage(r2, "ecomantem-todo-images", key, fileBuffer, input.contentType);
      
      const imageUrl = await getImageUrl(r2, "ecomantem-todo-images", key);
      
      // Update the todo with the image URL
      await db
        .update(todo)
        .set({ imageUrl })
        .where(eq(todo.id, input.todoId));
      
      return { imageUrl, key };
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(async ({ input }) => {
      return await db
        .update(todo)
        .set({ completed: input.completed })
        .where(eq(todo.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      return await db.delete(todo).where(eq(todo.id, input.id));
    }),
};

