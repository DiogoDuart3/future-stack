import type { Todo, OfflineTodo } from './types';

/**
 * Validates file size (default 5MB limit)
 */
export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
  return file.size <= maxSize;
};

/**
 * Validates file type for images
 */
export const validateImageType = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
};

/**
 * Converts file to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Generates a unique local ID for offline todos
 */
export const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Converts a regular todo to an offline todo
 */
export const todoToOfflineTodo = (todo: Todo): OfflineTodo => {
  return {
    ...todo,
    status: 'synced',
    localId: generateLocalId(),
    serverId: todo.id,
    createdAt: Date.now(),
  };
};

/**
 * Creates a new offline todo from input data
 */
export const createOfflineTodo = (text: string, imageUrl?: string): OfflineTodo => {
  return {
    id: -1, // Temporary ID for offline todos
    text,
    completed: false,
    imageUrl: imageUrl || null,
    status: 'pending',
    localId: generateLocalId(),
    serverId: null,
    createdAt: Date.now(),
  };
};

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  OFFLINE_TODOS: 'ecomantem_offline_todos',
  SYNC_QUEUE: 'ecomantem_sync_queue',
  LAST_SYNC: 'ecomantem_last_sync',
} as const;

/**
 * Default retry configuration for sync operations
 */
export const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  SYNC_INTERVAL: 30000, // 30 seconds
} as const;