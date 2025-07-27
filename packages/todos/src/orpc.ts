import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";

// This type will be augmented by apps that use this package
export interface AppRouter {
  todo: {
    getAll: any;
    getAllWithImages: any;
    create: any;
    uploadImage: any;
    toggle: any;
    delete: any;
    testR2?: any;
    testGetAllWithImages?: any;
  };
  [key: string]: any;
}

export interface CreateORPCClientConfig {
  serverUrl: string;
  onError?: (error: Error) => void;
  fetch?: typeof fetch;
}

/**
 * Creates an ORPC client with proper configuration
 */
export function createTodosORPCClient<TRouter extends AppRouter = AppRouter>(
  config: CreateORPCClientConfig
) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: config.onError || ((error) => {
        console.error('Query error:', error.message);
      }),
    }),
  });

  const link = new RPCLink({
    url: `${config.serverUrl}/rpc`,
    fetch: config.fetch || ((url, options) => {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    }),
  });

  const client = createORPCClient<TRouter>(link);
  const orpc = createTanstackQueryUtils(client);

  return {
    queryClient,
    client,
    orpc,
    link,
  };
}

/**
 * Type-safe ORPC todo operations
 */
export interface TodoORPCOperations<TRouter extends AppRouter = AppRouter> {
  getAll: () => ReturnType<TRouter['todo']['getAll']['handler']>;
  getAllWithImages: () => ReturnType<TRouter['todo']['getAllWithImages']['handler']>;
  create: (input: { text: string; imageUrl?: string }) => ReturnType<TRouter['todo']['create']['handler']>;
  toggle: (input: { id: number; completed: boolean }) => ReturnType<TRouter['todo']['toggle']['handler']>;
  delete: (input: { id: number }) => ReturnType<TRouter['todo']['delete']['handler']>;
  uploadImage: (input: { todoId: number; filename: string; contentType: string; fileData: string }) => ReturnType<TRouter['todo']['uploadImage']['handler']>;
}

/**
 * Creates typed todo operations from ORPC client
 */
export function createTodoORPCOperations<TRouter extends AppRouter = AppRouter>(
  orpc: ReturnType<typeof createTanstackQueryUtils<TRouter>>
): TodoORPCOperations<TRouter> {
  return {
    getAll: () => orpc.todo.getAll.queryOptions(),
    getAllWithImages: () => orpc.todo.getAllWithImages.queryOptions(),
    create: (input) => orpc.todo.create.mutationOptions(),
    toggle: (input) => orpc.todo.toggle.mutationOptions(),
    delete: (input) => orpc.todo.delete.mutationOptions(),
    uploadImage: (input) => orpc.todo.uploadImage.mutationOptions(),
  };
}