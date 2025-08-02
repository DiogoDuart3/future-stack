import { pgTable, text, boolean, serial, timestamp } from "drizzle-orm/pg-core";

export const publicChatMessages = pgTable("public_chat_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  userProfilePicture: text("user_profile_picture"), // R2 key for user's profile picture
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}); 