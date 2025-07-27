import { z } from 'zod';

// Base todo schema matching the database schema
export const todoSchema = z.object({
  id: z.number(),
  text: z.string(),
  completed: z.boolean(),
  imageUrl: z.string().nullable(),
});

export type Todo = z.infer<typeof todoSchema>;

// Input schemas for API operations
export const createTodoSchema = z.object({
  text: z.string().min(1),
  imageUrl: z.string().optional(),
});

export const updateTodoSchema = z.object({
  id: z.number(),
  completed: z.boolean(),
});

export const deleteTodoSchema = z.object({
  id: z.number(),
});

export const uploadImageSchema = z.object({
  todoId: z.number(),
  filename: z.string(),
  contentType: z.string(),
  fileData: z.string(), // Base64 encoded file data
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type DeleteTodoInput = z.infer<typeof deleteTodoSchema>;
export type UploadImageInput = z.infer<typeof uploadImageSchema>;

// Offline-specific types
export type TodoStatus = 'synced' | 'pending' | 'syncing' | 'error';

export const offlineTodoSchema = todoSchema.extend({
  status: z.enum(['synced', 'pending', 'syncing', 'error']),
  localId: z.string(),
  serverId: z.number().nullable(),
  createdAt: z.number(),
  error: z.string().optional(),
});

export type OfflineTodo = z.infer<typeof offlineTodoSchema>;

export type QueuedActionType = 'create' | 'update' | 'delete';

export const queuedActionSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete']),
  todo: offlineTodoSchema,
  timestamp: z.number(),
  retryCount: z.number().default(0),
});

export type QueuedAction = z.infer<typeof queuedActionSchema>;