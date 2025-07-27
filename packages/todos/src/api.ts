import type { Todo, CreateTodoInput, UpdateTodoInput, DeleteTodoInput, UploadImageInput } from './types';

export interface TodosApiConfig {
  baseUrl: string;
  // Optional custom fetch function (useful for auth, etc.)
  fetch?: typeof fetch;
}

export class TodosApi {
  private config: TodosApiConfig;

  constructor(config: TodosApiConfig) {
    this.config = {
      fetch: fetch,
      ...config,
    };
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const fetchFn = this.config.fetch || fetch;
    return fetchFn(url, {
      ...options,
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get all todos (without images)
   */
  async getAll(): Promise<Todo[]> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'getAll'],
        input: null,
      }),
    });
    
    const result = await this.handleResponse<{ result: Todo[] }>(response);
    return result.result;
  }

  /**
   * Get all todos with fresh image URLs
   */
  async getAllWithImages(): Promise<Todo[]> {
    const response = await orpc.todo.getAllWithImages.queryOptions();
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'getAllWithImages'],
        input: null,
      }),
    });
    
    const result = await this.handleResponse<{ result: Todo[] }>(response);
    return result.result;
  }

  /**
   * Create a new todo
   */
  async create(input: CreateTodoInput): Promise<Todo> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'create'],
        input,
      }),
    });
    
    const result = await this.handleResponse<{ result: Todo }>(response);
    return result.result;
  }

  /**
   * Create a todo with image using multipart form
   */
  async createWithImage(text: string, imageFile: File): Promise<Todo> {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('image', imageFile);

    const fetchFn = this.config.fetch || fetch;
    const response = await fetchFn(`${this.config.baseUrl}/todos/create-with-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for auth
      // Don't set Content-Type for FormData - browser will set it with boundary
    });

    return this.handleResponse<Todo>(response);
  }

  /**
   * Upload image for existing todo
   */
  async uploadImage(input: UploadImageInput): Promise<{ imageUrl: string }> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'uploadImage'],
        input,
      }),
    });
    
    const result = await this.handleResponse<{ result: { imageUrl: string } }>(response);
    return result.result;
  }

  /**
   * Toggle todo completion status
   */
  async toggle(input: UpdateTodoInput): Promise<void> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'toggle'],
        input,
      }),
    });
    
    await this.handleResponse(response);
  }

  /**
   * Delete a todo
   */
  async delete(input: DeleteTodoInput): Promise<void> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'delete'],
        input,
      }),
    });
    
    await this.handleResponse(response);
  }

  /**
   * Test R2 connection (debug endpoint)
   */
  async testR2(): Promise<{ success: boolean; message: string; hasCredentials: any }> {
    const response = await this.fetchWithAuth(`${this.config.baseUrl}/rpc`, {
      method: 'POST',
      body: JSON.stringify({
        path: ['todo', 'testR2'],
        input: null,
      }),
    });
    
    const result = await this.handleResponse<{ result: { success: boolean; message: string; hasCredentials: any } }>(response);
    return result.result;
  }
}

/**
 * Factory function to create a TodosApi instance
 */
export function createTodosApi(config: TodosApiConfig): TodosApi {
  return new TodosApi(config);
}

/**
 * Default configuration for browser environments
 */
export function createBrowserTodosApi(baseUrl: string): TodosApi {
  return new TodosApi({
    baseUrl,
    fetch: fetch,
  });
}