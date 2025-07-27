// src/types.ts
import { z } from "zod";
var todoSchema = z.object({
  id: z.number(),
  text: z.string(),
  completed: z.boolean(),
  imageUrl: z.string().nullable()
});
var createTodoSchema = z.object({
  text: z.string().min(1),
  imageUrl: z.string().optional()
});
var updateTodoSchema = z.object({
  id: z.number(),
  completed: z.boolean()
});
var deleteTodoSchema = z.object({
  id: z.number()
});
var uploadImageSchema = z.object({
  todoId: z.number(),
  filename: z.string(),
  contentType: z.string(),
  fileData: z.string()
  // Base64 encoded file data
});
var offlineTodoSchema = todoSchema.extend({
  status: z.enum(["synced", "pending", "syncing", "error"]),
  localId: z.string(),
  serverId: z.number().nullable(),
  createdAt: z.number(),
  error: z.string().optional()
});
var queuedActionSchema = z.object({
  id: z.string(),
  type: z.enum(["create", "update", "delete"]),
  todo: offlineTodoSchema,
  timestamp: z.number(),
  retryCount: z.number().default(0)
});

// src/utils.ts
var validateFileSize = (file, maxSizeMB = 5) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  return file.size <= maxSize;
};
var validateImageType = (file) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  return allowedTypes.includes(file.type);
};
var fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};
var generateLocalId = () => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
var todoToOfflineTodo = (todo) => {
  return {
    ...todo,
    status: "synced",
    localId: generateLocalId(),
    serverId: todo.id,
    createdAt: Date.now()
  };
};
var createOfflineTodo = (text, imageUrl) => {
  return {
    id: -1,
    // Temporary ID for offline todos
    text,
    completed: false,
    imageUrl: imageUrl || null,
    status: "pending",
    localId: generateLocalId(),
    serverId: null,
    createdAt: Date.now()
  };
};
var STORAGE_KEYS = {
  OFFLINE_TODOS: "ecomantem_offline_todos",
  SYNC_QUEUE: "ecomantem_sync_queue",
  LAST_SYNC: "ecomantem_last_sync"
};
var SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1e3,
  // 1 second
  SYNC_INTERVAL: 3e4
  // 30 seconds
};

// src/storage.ts
var TodoStorage = class {
  /**
   * Get offline todos from localStorage
   */
  static getOfflineTodos() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_TODOS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get offline todos:", error);
      return [];
    }
  }
  /**
   * Save offline todos to localStorage
   */
  static setOfflineTodos(todos) {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_TODOS, JSON.stringify(todos));
    } catch (error) {
      console.error("Failed to save offline todos:", error);
    }
  }
  /**
   * Get sync queue from localStorage
   */
  static getSyncQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get sync queue:", error);
      return [];
    }
  }
  /**
   * Save sync queue to localStorage
   */
  static setSyncQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }
  /**
   * Get last sync timestamp
   */
  static getLastSync() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error("Failed to get last sync time:", error);
      return 0;
    }
  }
  /**
   * Set last sync timestamp
   */
  static setLastSync(timestamp) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error("Failed to save last sync time:", error);
    }
  }
  /**
   * Clear all todo-related data from localStorage
   */
  static clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_TODOS);
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }
  /**
   * Add a todo to offline storage
   */
  static addTodo(todo) {
    const todos = this.getOfflineTodos();
    todos.push(todo);
    this.setOfflineTodos(todos);
  }
  /**
   * Update a todo in offline storage
   */
  static updateTodo(localId, updates) {
    const todos = this.getOfflineTodos();
    const index = todos.findIndex((t) => t.localId === localId);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...updates };
      this.setOfflineTodos(todos);
    }
  }
  /**
   * Remove a todo from offline storage
   */
  static removeTodo(localId) {
    const todos = this.getOfflineTodos();
    const filtered = todos.filter((t) => t.localId !== localId);
    this.setOfflineTodos(filtered);
  }
  /**
   * Add an action to the sync queue
   */
  static addToSyncQueue(action) {
    const queue = this.getSyncQueue();
    queue.push(action);
    this.setSyncQueue(queue);
  }
  /**
   * Remove an action from the sync queue
   */
  static removeFromSyncQueue(actionId) {
    const queue = this.getSyncQueue();
    const filtered = queue.filter((action) => action.id !== actionId);
    this.setSyncQueue(filtered);
  }
  /**
   * Update an action in the sync queue
   */
  static updateSyncQueueAction(actionId, updates) {
    const queue = this.getSyncQueue();
    const index = queue.findIndex((action) => action.id === actionId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      this.setSyncQueue(queue);
    }
  }
};

// src/api.ts
var TodosApi = class {
  constructor(config) {
    this.config = {
      fetch,
      ...config
    };
  }
  async fetchWithAuth(url, options = {}) {
    const fetchFn = this.config.fetch || fetch;
    return fetchFn(url, {
      ...options,
      credentials: "include",
      // Include cookies for auth
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
  /**
   * Get all todos (without images)
   */
  async getAll() {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "getAll"],
        input: null
      })
    });
    const result = await this.handleResponse(response);
    return result.result;
  }
  /**
   * Get all todos with fresh image URLs
   */
  async getAllWithImages() {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "getAllWithImages"],
        input: null
      })
    });
    const result = await this.handleResponse(response);
    return result.result;
  }
  /**
   * Create a new todo
   */
  async create(input) {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "create"],
        input
      })
    });
    const result = await this.handleResponse(response);
    return result.result;
  }
  /**
   * Create a todo with image using multipart form
   */
  async createWithImage(text, imageFile) {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("image", imageFile);
    const fetchFn = this.config.fetch || fetch;
    const response = await fetchFn(`${this.config.baseUrl}/todos/create-with-image`, {
      method: "POST",
      body: formData,
      credentials: "include"
      // Include cookies for auth
      // Don't set Content-Type for FormData - browser will set it with boundary
    });
    return this.handleResponse(response);
  }
  /**
   * Upload image for existing todo
   */
  async uploadImage(input) {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "uploadImage"],
        input
      })
    });
    const result = await this.handleResponse(response);
    return result.result;
  }
  /**
   * Toggle todo completion status
   */
  async toggle(input) {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "toggle"],
        input
      })
    });
    await this.handleResponse(response);
  }
  /**
   * Delete a todo
   */
  async delete(input) {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "delete"],
        input
      })
    });
    await this.handleResponse(response);
  }
  /**
   * Test R2 connection (debug endpoint)
   */
  async testR2() {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: "POST",
      body: JSON.stringify({
        path: ["todo", "testR2"],
        input: null
      })
    });
    const result = await this.handleResponse(response);
    return result.result;
  }
};
function createTodosApi(config) {
  return new TodosApi(config);
}
function createBrowserTodosApi(baseUrl) {
  return new TodosApi({
    baseUrl,
    fetch
  });
}

// src/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
var TODOS_QUERY_KEYS = {
  all: ["todos"],
  lists: () => [...TODOS_QUERY_KEYS.all, "list"],
  list: (filters) => [...TODOS_QUERY_KEYS.lists(), { filters }],
  details: () => [...TODOS_QUERY_KEYS.all, "detail"],
  detail: (id) => [...TODOS_QUERY_KEYS.details(), id]
};
function createTodosHooks(config) {
  const { api } = config;
  function useTodos(options) {
    return useQuery({
      queryKey: TODOS_QUERY_KEYS.lists(),
      queryFn: () => api.getAll(),
      ...options
    });
  }
  function useTodosWithImages(options) {
    return useQuery({
      queryKey: TODOS_QUERY_KEYS.list({ withImages: true }),
      queryFn: () => api.getAllWithImages(),
      ...options
    });
  }
  function useCreateTodo(options) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input) => api.create(input),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options
    });
  }
  function useCreateTodoWithImage(options) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ text, image }) => api.createWithImage(text, image),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options
    });
  }
  function useUploadTodoImage(options) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input) => api.uploadImage(input),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options
    });
  }
  function useToggleTodo(options) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input) => api.toggle(input),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options
    });
  }
  function useDeleteTodo(options) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input) => api.delete(input),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options
    });
  }
  function useTestR2(options) {
    return useQuery({
      queryKey: ["todos", "testR2"],
      queryFn: () => api.testR2(),
      enabled: false,
      // Don't run automatically
      ...options
    });
  }
  return {
    useTodos,
    useTodosWithImages,
    useCreateTodo,
    useCreateTodoWithImage,
    useUploadTodoImage,
    useToggleTodo,
    useDeleteTodo,
    useTestR2,
    queryKeys: TODOS_QUERY_KEYS
  };
}
export {
  STORAGE_KEYS,
  SYNC_CONFIG,
  TODOS_QUERY_KEYS,
  TodoStorage,
  TodosApi,
  createBrowserTodosApi,
  createOfflineTodo,
  createTodoSchema,
  createTodosApi,
  createTodosHooks,
  deleteTodoSchema,
  fileToBase64,
  generateLocalId,
  offlineTodoSchema,
  queuedActionSchema,
  todoSchema,
  todoToOfflineTodo,
  updateTodoSchema,
  uploadImageSchema,
  validateFileSize,
  validateImageType
};
//# sourceMappingURL=index.mjs.map