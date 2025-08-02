import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { publicProcedure } from "../lib/orpc";
import { createR2Client, uploadImage, getImageUrl } from "../lib/r2";

export const profileRouter = {
  uploadProfilePicture: publicProcedure
    .input(z.object({
      userId: z.string(),
      filename: z.string(),
      contentType: z.string(),
      fileData: z.string() // Base64 encoded file data
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings;
      const r2 = createR2Client(env);
      
      // Validate file type
      if (!input.contentType.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      try {
        // Decode base64 file data
        const fileBuffer = Uint8Array.from(atob(input.fileData), c => c.charCodeAt(0));
        
        // Validate file size (max 5MB)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          throw new Error('File size must be less than 5MB');
        }
        
        // Generate unique key for the profile picture
        const timestamp = Date.now();
        const extension = input.filename.split('.').pop() || 'jpg';
        const key = `profile-pictures/${input.userId}/${timestamp}.${extension}`;
        
        // Upload to R2 using the existing TODO_IMAGES bucket
        await uploadImage(r2, "ecomantem-todo-images", key, fileBuffer, input.contentType);
        
        // Update user record with the new profile picture key
        await db
          .update(user)
          .set({ 
            profilePicture: key,
            updatedAt: new Date()
          })
          .where(eq(user.id, input.userId));
        
        // Generate signed URL for immediate access
        const imageUrl = await getImageUrl(r2, "ecomantem-todo-images", key);
        
        return { 
          success: true, 
          profilePictureKey: key,
          imageUrl 
        };
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        throw new Error('Failed to upload profile picture');
      }
    }),

  getProfilePictureUrl: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings;
      const r2 = createR2Client(env);
      
      // Get user's profile picture key
      const userRecord = await db
        .select({ profilePicture: user.profilePicture })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);
      
      if (!userRecord[0]?.profilePicture) {
        return { imageUrl: null };
      }
      
      try {
        const imageUrl = await getImageUrl(r2, "ecomantem-todo-images", userRecord[0].profilePicture);
        return { imageUrl };
      } catch (error) {
        console.error('Error generating profile picture URL:', error);
        return { imageUrl: null };
      }
    }),

  getUserProfile: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .handler(async ({ input, context }) => {
      const env = context.env as CloudflareBindings;
      const r2 = createR2Client(env);
      
      const userRecord = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);
      
      if (!userRecord[0]) {
        throw new Error('User not found');
      }
      
      let profilePictureUrl = null;
      if (userRecord[0].profilePicture) {
        try {
          profilePictureUrl = await getImageUrl(r2, "ecomantem-todo-images", userRecord[0].profilePicture);
        } catch (error) {
          console.error('Error generating profile picture URL:', error);
        }
      }
      
      return {
        ...userRecord[0],
        profilePictureUrl,
      };
    }),
}; 