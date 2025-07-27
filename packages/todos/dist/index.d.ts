import { z } from 'zod';
import * as _tanstack_react_query from '@tanstack/react-query';
import { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

declare const todoSchema: z.ZodObject<{
    id: z.ZodNumber;
    text: z.ZodString;
    completed: z.ZodBoolean;
    imageUrl: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    text: string;
    completed: boolean;
    imageUrl: string | null;
}, {
    id: number;
    text: string;
    completed: boolean;
    imageUrl: string | null;
}>;
type Todo = z.infer<typeof todoSchema>;
declare const createTodoSchema: z.ZodObject<{
    text: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    imageUrl?: string | undefined;
}, {
    text: string;
    imageUrl?: string | undefined;
}>;
declare const updateTodoSchema: z.ZodObject<{
    id: z.ZodNumber;
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: number;
    completed: boolean;
}, {
    id: number;
    completed: boolean;
}>;
declare const deleteTodoSchema: z.ZodObject<{
    id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
declare const uploadImageSchema: z.ZodObject<{
    todoId: z.ZodNumber;
    filename: z.ZodString;
    contentType: z.ZodString;
    fileData: z.ZodString;
}, "strip", z.ZodTypeAny, {
    todoId: number;
    filename: string;
    contentType: string;
    fileData: string;
}, {
    todoId: number;
    filename: string;
    contentType: string;
    fileData: string;
}>;
type CreateTodoInput = z.infer<typeof createTodoSchema>;
type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
type DeleteTodoInput = z.infer<typeof deleteTodoSchema>;
type UploadImageInput = z.infer<typeof uploadImageSchema>;
type TodoStatus = 'synced' | 'pending' | 'syncing' | 'error';
declare const offlineTodoSchema: z.ZodObject<{
    id: z.ZodNumber;
    text: z.ZodString;
    completed: z.ZodBoolean;
    imageUrl: z.ZodNullable<z.ZodString>;
} & {
    status: z.ZodEnum<["synced", "pending", "syncing", "error"]>;
    localId: z.ZodString;
    serverId: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodNumber;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    text: string;
    completed: boolean;
    imageUrl: string | null;
    status: "synced" | "pending" | "syncing" | "error";
    localId: string;
    serverId: number | null;
    createdAt: number;
    error?: string | undefined;
}, {
    id: number;
    text: string;
    completed: boolean;
    imageUrl: string | null;
    status: "synced" | "pending" | "syncing" | "error";
    localId: string;
    serverId: number | null;
    createdAt: number;
    error?: string | undefined;
}>;
type OfflineTodo = z.infer<typeof offlineTodoSchema>;
type QueuedActionType = 'create' | 'update' | 'delete';
declare const queuedActionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["create", "update", "delete"]>;
    todo: z.ZodObject<{
        id: z.ZodNumber;
        text: z.ZodString;
        completed: z.ZodBoolean;
        imageUrl: z.ZodNullable<z.ZodString>;
    } & {
        status: z.ZodEnum<["synced", "pending", "syncing", "error"]>;
        localId: z.ZodString;
        serverId: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodNumber;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
        status: "synced" | "pending" | "syncing" | "error";
        localId: string;
        serverId: number | null;
        createdAt: number;
        error?: string | undefined;
    }, {
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
        status: "synced" | "pending" | "syncing" | "error";
        localId: string;
        serverId: number | null;
        createdAt: number;
        error?: string | undefined;
    }>;
    timestamp: z.ZodNumber;
    retryCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "create" | "update" | "delete";
    todo: {
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
        status: "synced" | "pending" | "syncing" | "error";
        localId: string;
        serverId: number | null;
        createdAt: number;
        error?: string | undefined;
    };
    timestamp: number;
    retryCount: number;
}, {
    id: string;
    type: "create" | "update" | "delete";
    todo: {
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
        status: "synced" | "pending" | "syncing" | "error";
        localId: string;
        serverId: number | null;
        createdAt: number;
        error?: string | undefined;
    };
    timestamp: number;
    retryCount?: number | undefined;
}>;
type QueuedAction = z.infer<typeof queuedActionSchema>;

/**
 * Validates file size (default 5MB limit)
 */
declare const validateFileSize: (file: File, maxSizeMB?: number) => boolean;
/**
 * Validates file type for images
 */
declare const validateImageType: (file: File) => boolean;
/**
 * Converts file to base64 string
 */
declare const fileToBase64: (file: File) => Promise<string>;
/**
 * Generates a unique local ID for offline todos
 */
declare const generateLocalId: () => string;
/**
 * Converts a regular todo to an offline todo
 */
declare const todoToOfflineTodo: (todo: Todo) => OfflineTodo;
/**
 * Creates a new offline todo from input data
 */
declare const createOfflineTodo: (text: string, imageUrl?: string) => OfflineTodo;
/**
 * Storage keys for localStorage
 */
declare const STORAGE_KEYS: {
    readonly OFFLINE_TODOS: "ecomantem_offline_todos";
    readonly SYNC_QUEUE: "ecomantem_sync_queue";
    readonly LAST_SYNC: "ecomantem_last_sync";
};
/**
 * Default retry configuration for sync operations
 */
declare const SYNC_CONFIG: {
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY: 1000;
    readonly SYNC_INTERVAL: 30000;
};

/**
 * Local storage utilities for offline todos
 */
declare class TodoStorage {
    /**
     * Get offline todos from localStorage
     */
    static getOfflineTodos(): OfflineTodo[];
    /**
     * Save offline todos to localStorage
     */
    static setOfflineTodos(todos: OfflineTodo[]): void;
    /**
     * Get sync queue from localStorage
     */
    static getSyncQueue(): QueuedAction[];
    /**
     * Save sync queue to localStorage
     */
    static setSyncQueue(queue: QueuedAction[]): void;
    /**
     * Get last sync timestamp
     */
    static getLastSync(): number;
    /**
     * Set last sync timestamp
     */
    static setLastSync(timestamp: number): void;
    /**
     * Clear all todo-related data from localStorage
     */
    static clearAll(): void;
    /**
     * Add a todo to offline storage
     */
    static addTodo(todo: OfflineTodo): void;
    /**
     * Update a todo in offline storage
     */
    static updateTodo(localId: string, updates: Partial<OfflineTodo>): void;
    /**
     * Remove a todo from offline storage
     */
    static removeTodo(localId: string): void;
    /**
     * Add an action to the sync queue
     */
    static addToSyncQueue(action: QueuedAction): void;
    /**
     * Remove an action from the sync queue
     */
    static removeFromSyncQueue(actionId: string): void;
    /**
     * Update an action in the sync queue
     */
    static updateSyncQueueAction(actionId: string, updates: Partial<QueuedAction>): void;
}

interface TodosApiConfig {
    baseUrl: string;
    fetch?: typeof fetch;
}
declare class TodosApi {
    private config;
    constructor(config: TodosApiConfig);
    private fetchWithAuth;
    private handleResponse;
    /**
     * Get all todos (without images)
     */
    getAll(): Promise<Todo[]>;
    /**
     * Get all todos with fresh image URLs
     */
    getAllWithImages(): Promise<Todo[]>;
    /**
     * Create a new todo
     */
    create(input: CreateTodoInput): Promise<Todo>;
    /**
     * Create a todo with image using multipart form
     */
    createWithImage(text: string, imageFile: File): Promise<Todo>;
    /**
     * Upload image for existing todo
     */
    uploadImage(input: UploadImageInput): Promise<{
        imageUrl: string;
    }>;
    /**
     * Toggle todo completion status
     */
    toggle(input: UpdateTodoInput): Promise<void>;
    /**
     * Delete a todo
     */
    delete(input: DeleteTodoInput): Promise<void>;
    /**
     * Test R2 connection (debug endpoint)
     */
    testR2(): Promise<{
        success: boolean;
        message: string;
        hasCredentials: any;
    }>;
}
/**
 * Factory function to create a TodosApi instance
 */
declare function createTodosApi(config: TodosApiConfig): TodosApi;
/**
 * Default configuration for browser environments
 */
declare function createBrowserTodosApi(baseUrl: string): TodosApi;

declare const TODOS_QUERY_KEYS: {
    readonly all: readonly ["todos"];
    readonly lists: () => readonly ["todos", "list"];
    readonly list: (filters: Record<string, any>) => readonly ["todos", "list", {
        readonly filters: Record<string, any>;
    }];
    readonly details: () => readonly ["todos", "detail"];
    readonly detail: (id: number) => readonly ["todos", "detail", number];
};
interface UseTodosHooksConfig {
    api: TodosApi;
}
declare function createTodosHooks(config: UseTodosHooksConfig): {
    useTodos: (options?: Omit<UseQueryOptions<Todo[], Error>, "queryKey" | "queryFn">) => _tanstack_react_query.UseQueryResult<{
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
    }[], Error>;
    useTodosWithImages: (options?: Omit<UseQueryOptions<Todo[], Error>, "queryKey" | "queryFn">) => _tanstack_react_query.UseQueryResult<{
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
    }[], Error>;
    useCreateTodo: (options?: UseMutationOptions<Todo, Error, CreateTodoInput>) => _tanstack_react_query.UseMutationResult<{
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
    }, Error, {
        text: string;
        imageUrl?: string | undefined;
    }, unknown>;
    useCreateTodoWithImage: (options?: UseMutationOptions<Todo, Error, {
        text: string;
        image: File;
    }>) => _tanstack_react_query.UseMutationResult<{
        id: number;
        text: string;
        completed: boolean;
        imageUrl: string | null;
    }, Error, {
        text: string;
        image: File;
    }, unknown>;
    useUploadTodoImage: (options?: UseMutationOptions<{
        imageUrl: string;
    }, Error, UploadImageInput>) => _tanstack_react_query.UseMutationResult<{
        imageUrl: string;
    }, Error, {
        todoId: number;
        filename: string;
        contentType: string;
        fileData: string;
    }, unknown>;
    useToggleTodo: (options?: UseMutationOptions<void, Error, UpdateTodoInput>) => _tanstack_react_query.UseMutationResult<void, Error, {
        id: number;
        completed: boolean;
    }, unknown>;
    useDeleteTodo: (options?: UseMutationOptions<void, Error, DeleteTodoInput>) => _tanstack_react_query.UseMutationResult<void, Error, {
        id: number;
    }, unknown>;
    useTestR2: (options?: Omit<UseQueryOptions<{
        success: boolean;
        message: string;
        hasCredentials: any;
    }, Error>, "queryKey" | "queryFn">) => _tanstack_react_query.UseQueryResult<{
        success: boolean;
        message: string;
        hasCredentials: any;
    }, Error>;
    queryKeys: {
        readonly all: readonly ["todos"];
        readonly lists: () => readonly ["todos", "list"];
        readonly list: (filters: Record<string, any>) => readonly ["todos", "list", {
            readonly filters: Record<string, any>;
        }];
        readonly details: () => readonly ["todos", "detail"];
        readonly detail: (id: number) => readonly ["todos", "detail", number];
    };
};
type TodosHooks = ReturnType<typeof createTodosHooks>;

export { type CreateTodoInput, type DeleteTodoInput, type OfflineTodo, type QueuedAction, type QueuedActionType, STORAGE_KEYS, SYNC_CONFIG, TODOS_QUERY_KEYS, type Todo, type TodoStatus, TodoStorage, TodosApi, type TodosApiConfig, type TodosHooks, type UpdateTodoInput, type UploadImageInput, type UseTodosHooksConfig, createBrowserTodosApi, createOfflineTodo, createTodoSchema, createTodosApi, createTodosHooks, deleteTodoSchema, fileToBase64, generateLocalId, offlineTodoSchema, queuedActionSchema, todoSchema, todoToOfflineTodo, updateTodoSchema, uploadImageSchema, validateFileSize, validateImageType };
