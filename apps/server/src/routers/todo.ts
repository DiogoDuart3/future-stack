import { desc, eq } from "drizzle-orm";
import z from "zod";
import { todo } from "../db/schema/todo";
import { publicProcedure } from "../lib/orpc";
import { createR2Client, uploadImage, generateImageKey, generateFreshImageUrl } from "../lib/r2";
import { broadcastSystemNotification } from "../lib/broadcast";
import { createDatabaseConnection } from "../lib/db-factory";
import type { Env } from "../types/global";

export const todoRouter = {
  getAll: publicProcedure.handler(async ({ context }) => {
    const db = createDatabaseConnection(context.env);
    return await db.select().from(todo);
  }),

  getAllWithImages: publicProcedure.handler(async ({ context }) => {
    try {
      console.log('getAllWithImages called');
      const db = createDatabaseConnection(context.env);
      const todos = await db.select().from(todo).orderBy(desc(todo.createdAt));
      console.log('Todos fetched:', todos.length);
      
      // Check if we have R2 credentials before trying to create client
      const env = context.env as Env;
      const hasR2Credentials = env.CLOUDFLARE_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;
      
      console.log('Environment check:', {
        hasAccountId: !!env.CLOUDFLARE_ACCOUNT_ID,
        hasAccessKey: !!env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!env.R2_SECRET_ACCESS_KEY,
        hasR2Credentials
      });
      
      if (!hasR2Credentials) {
        console.log('No R2 credentials available, returning todos without image processing');
        return todos;
      }
      
      let r2;
      try {
        r2 = createR2Client(env);
        console.log('R2 client created successfully');
      } catch (error) {
        console.error('Failed to create R2 client:', error);
        return todos; // Return todos without image processing
      }
      
      // Generate fresh signed URLs for todos with images
      const todosWithImages = await Promise.all(
        todos.map(async (todo) => {
          if (todo.imageUrl && todo.imageUrl.startsWith('todos/')) {
            try {
              console.log(`Generating URL for todo ${todo.id} with key: ${todo.imageUrl}`);
              // Generate fresh signed URL from the stored R2 key
              const imageUrl = await generateFreshImageUrl(r2, "ecomantem-todo-images", todo.imageUrl);
              console.log(`Generated URL for todo ${todo.id}: ${imageUrl.substring(0, 50)}...`);
              return { ...todo, imageUrl };
            } catch (error) {
              console.error(`Failed to generate URL for todo ${todo.id}:`, error);
              return { ...todo, imageUrl: null };
            }
          }
          return todo; // Return as-is if no image or not an R2 key
        })
      );
      
      console.log('Returning todos with images:', todosWithImages.length);
      return todosWithImages;
    } catch (error) {
      console.error('Error in getAllWithImages:', error);
      // Fallback to regular getAll if there's an error
      console.log('Falling back to regular getAll');
      const db = createDatabaseConnection(context.env);
      return await db.select().from(todo);
    }
  }),

  create: publicProcedure
    .input(z.object({ 
      text: z.string().min(1),
      imageUrl: z.string().optional()
    }))
    .handler(async ({ input, context }) => {
      const db = createDatabaseConnection(context.env);
      const result = await db
        .insert(todo)
        .values({
          text: input.text,
          imageUrl: input.imageUrl,
        })
        .returning();
      
      // Example: Broadcast a notification when a new todo is created
      try {
        const env = context.env as Env;
        await broadcastSystemNotification(env, `New todo created: "${input.text}"`);
      } catch (error) {
        console.error("Failed to broadcast todo creation:", error);
        // Don't fail the todo creation if broadcast fails
      }
      
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
      
      const env = context.env as Env;
      const r2 = createR2Client(env);
      const db = createDatabaseConnection(context.env);
      
      try {
        // Decode base64 file data
        const fileBuffer = Uint8Array.from(atob(input.fileData), c => c.charCodeAt(0));
        console.log('Base64 decoded, buffer length:', fileBuffer.length);
        
        const key = generateImageKey(input.todoId, input.filename);
        console.log('Generated key:', key);
        
        await uploadImage(r2, "ecomantem-todo-images", key, fileBuffer, input.contentType);
        console.log('Image uploaded to R2 successfully');
        
        // Update the todo with the image key (stored as imageUrl)
        const updateResult = await db
          .update(todo)
          .set({ imageUrl: key })
          .where(eq(todo.id, input.todoId));
        
        console.log('Todo updated with image key:', updateResult);
        
        return { imageUrl: key };
      } catch (error) {
        console.error('Error in uploadImage handler:', error);
        throw error;
      }
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(async ({ input, context }) => {
      const db = createDatabaseConnection(context.env);
      return await db
        .update(todo)
        .set({ completed: input.completed })
        .where(eq(todo.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const db = createDatabaseConnection(context.env);
      const result = await db.delete(todo).where(eq(todo.id, input.id));
      
      // Example: Broadcast a notification when a todo is deleted
      try {
        const env = context.env as Env;
        await broadcastSystemNotification(env, `Todo deleted with ID: ${input.id}`);
      } catch (error) {
        console.error("Failed to broadcast todo deletion:", error);
        // Don't fail the todo deletion if broadcast fails
      }
      
      return result;
    }),

  // Debug endpoint to test R2 connection
  testR2: publicProcedure.handler(async ({ context }) => {
    try {
      const env = context.env as Env;
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

  // Test getAllWithImages specifically
  testGetAllWithImages: publicProcedure.handler(async ({ context }) => {
    try {
      console.log('Testing getAllWithImages...');
      const db = createDatabaseConnection(context.env);
      const todos = await db.select().from(todo);
      console.log('Found todos:', todos.length);
      
      const env = context.env as Env;
      const hasR2Credentials = env.CLOUDFLARE_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;
      
      return {
        success: true,
        todosCount: todos.length,
        hasR2Credentials,
        todosWithImages: todos.filter(t => t.imageUrl && t.imageUrl.startsWith('todos/')).length
      };
    } catch (error) {
      console.error('testGetAllWithImages failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }),
};

