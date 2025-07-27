// Types
export type {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  DeleteTodoInput,
  UploadImageInput,
  OfflineTodo,
  TodoStatus,
  QueuedAction,
  QueuedActionType,
} from './types';

// Schemas
export {
  todoSchema,
  createTodoSchema,
  updateTodoSchema,
  deleteTodoSchema,
  uploadImageSchema,
  offlineTodoSchema,
  queuedActionSchema,
} from './types';

// Utils
export {
  validateFileSize,
  validateImageType,
  fileToBase64,
  generateLocalId,
  todoToOfflineTodo,
  createOfflineTodo,
  STORAGE_KEYS,
  SYNC_CONFIG,
} from './utils';

// Storage
export { TodoStorage } from './storage';

// API Client
export {
  TodosApi,
  createTodosApi,
  createBrowserTodosApi,
  type TodosApiConfig,
} from './api';

// React Query Hooks (optional - only if @tanstack/react-query is available)
export {
  createTodosHooks,
  TODOS_QUERY_KEYS,
  type UseTodosHooksConfig,
  type TodosHooks,
} from './hooks';

// ORPC Integration (optional - only if @orpc/client is available)
export {
  createTodosORPCClient,
  createTodoORPCOperations,
  type AppRouter,
  type CreateORPCClientConfig,
  type TodoORPCOperations,
} from './orpc';