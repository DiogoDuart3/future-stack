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
      console.log('Upload image request:', { 
        todoId: input.todoId, 
        filename: input.filename, 
        contentType: input.contentType,
        dataLength: input.fileData.length 
      });
      
      const env = context.env as CloudflareBindings;
      const r2 = createR2Client(env);
      
      try {
        // Decode base64 file data
        const fileBuffer = Uint8Array.from(atob(input.fileData), c => c.charCodeAt(0));
        console.log('Base64 decoded, buffer length:', fileBuffer.length);
        
        const key = generateImageKey(input.todoId, input.filename);
        console.log('Generated key:', key);
        
        await uploadImage(r2, "ecomantem-todo-images", key, fileBuffer, input.contentType);
        console.log('Image uploaded to R2 successfully');
        
        const imageUrl = await getImageUrl(r2, "ecomantem-todo-images", key);
        console.log('Generated image URL:', imageUrl);
        
        // Update the todo with the image URL
        const updateResult = await db
          .update(todo)
          .set({ imageUrl })
          .where(eq(todo.id, input.todoId));
        
        console.log('Todo updated with image URL:', updateResult);
        
        return { imageUrl, key };
      } catch (error) {
        console.error('Error in uploadImage handler:', error);
        throw error;
      }
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

  // Debug endpoint to test R2 connection
  testR2: publicProcedure.handler(async ({ context }) => {
    try {
      const env = context.env as CloudflareBindings;
      console.log('R2 credentials check:', {
        accountId: !!env.CLOUDFLARE_ACCOUNT_ID,
        accessKey: !!env.R2_ACCESS_KEY_ID,
        secretKey: !!env.R2_SECRET_ACCESS_KEY
      });
      
      const r2 = createR2Client(env);
      console.log('R2 client created successfully');
      
      return { 
        success: true, 
        message: 'R2 client created successfully',
        hasCredentials: {
          accountId: !!env.CLOUDFLARE_ACCOUNT_ID,
          accessKey: !!env.R2_ACCESS_KEY_ID,
          secretKey: !!env.R2_SECRET_ACCESS_KEY
        }
      };
    } catch (error) {
      console.error('R2 test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'R2 client creation failed'
      };
    }
  }),
};

