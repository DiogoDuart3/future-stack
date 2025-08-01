import { pgTable, text, boolean, serial, timestamp } from "drizzle-orm/pg-core";

export const todo = pgTable("todo", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
