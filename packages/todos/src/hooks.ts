import { useMutation, useQuery, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import type { TodosApi } from './api';
import type { Todo, CreateTodoInput, UpdateTodoInput, DeleteTodoInput, UploadImageInput } from './types';

export const TODOS_QUERY_KEYS = {
  all: ['todos'] as const,
  lists: () => [...TODOS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...TODOS_QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...TODOS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...TODOS_QUERY_KEYS.details(), id] as const,
} as const;

export interface UseTodosHooksConfig {
  api: TodosApi;
}

export function createTodosHooks(config: UseTodosHooksConfig) {
  const { api } = config;

  /**
   * Hook to fetch all todos
   */
  function useTodos(options?: Omit<UseQueryOptions<Todo[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
      queryKey: TODOS_QUERY_KEYS.lists(),
      queryFn: () => api.getAll(),
      ...options,
    });
  }

  /**
   * Hook to fetch all todos with images
   */
  function useTodosWithImages(options?: Omit<UseQueryOptions<Todo[], Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
      queryKey: TODOS_QUERY_KEYS.list({ withImages: true }),
      queryFn: () => api.getAllWithImages(),
      ...options,
    });
  }

  /**
   * Hook to create a new todo
   */
  function useCreateTodo(options?: UseMutationOptions<Todo, Error, CreateTodoInput>) {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: (input: CreateTodoInput) => api.create(input),
      onSuccess: (data, variables, context) => {
        // Invalidate and refetch todos
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to create a todo with image
   */
  function useCreateTodoWithImage(options?: UseMutationOptions<Todo, Error, { text: string; image: File }>) {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: ({ text, image }: { text: string; image: File }) => api.createWithImage(text, image),
      onSuccess: (data, variables, context) => {
        // Invalidate and refetch todos
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to upload image for existing todo
   */
  function useUploadTodoImage(options?: UseMutationOptions<{ imageUrl: string }, Error, UploadImageInput>) {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: (input: UploadImageInput) => api.uploadImage(input),
      onSuccess: (data, variables, context) => {
        // Invalidate and refetch todos
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to toggle todo completion status
   */
  function useToggleTodo(options?: UseMutationOptions<void, Error, UpdateTodoInput>) {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: (input: UpdateTodoInput) => api.toggle(input),
      onSuccess: (data, variables, context) => {
        // Invalidate and refetch todos
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to delete a todo
   */
  function useDeleteTodo(options?: UseMutationOptions<void, Error, DeleteTodoInput>) {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: (input: DeleteTodoInput) => api.delete(input),
      onSuccess: (data, variables, context) => {
        // Invalidate and refetch todos
        queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEYS.all });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to test R2 connection
   */
  function useTestR2(options?: Omit<UseQueryOptions<{ success: boolean; message: string; hasCredentials: any }, Error>, 'queryKey' | 'queryFn'>) {
    return useQuery({
      queryKey: ['todos', 'testR2'],
      queryFn: () => api.testR2(),
      enabled: false, // Don't run automatically
      ...options,
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
    queryKeys: TODOS_QUERY_KEYS,
  };
}

export type TodosHooks = ReturnType<typeof createTodosHooks>;