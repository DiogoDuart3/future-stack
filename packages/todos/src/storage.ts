import type { OfflineTodo, QueuedAction } from './types';
import { STORAGE_KEYS } from './utils';

/**
 * Local storage utilities for offline todos
 */
export class TodoStorage {
  /**
   * Get offline todos from localStorage
   */
  static getOfflineTodos(): OfflineTodo[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_TODOS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline todos:', error);
      return [];
    }
  }

  /**
   * Save offline todos to localStorage
   */
  static setOfflineTodos(todos: OfflineTodo[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_TODOS, JSON.stringify(todos));
    } catch (error) {
      console.error('Failed to save offline todos:', error);
    }
  }

  /**
   * Get sync queue from localStorage
   */
  static getSyncQueue(): QueuedAction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Save sync queue to localStorage
   */
  static setSyncQueue(queue: QueuedAction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  static getLastSync(): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return 0;
    }
  }

  /**
   * Set last sync timestamp
   */
  static setLastSync(timestamp: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  }

  /**
   * Clear all todo-related data from localStorage
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_TODOS);
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Add a todo to offline storage
   */
  static addTodo(todo: OfflineTodo): void {
    const todos = this.getOfflineTodos();
    todos.push(todo);
    this.setOfflineTodos(todos);
  }

  /**
   * Update a todo in offline storage
   */
  static updateTodo(localId: string, updates: Partial<OfflineTodo>): void {
    const todos = this.getOfflineTodos();
    const index = todos.findIndex(t => t.localId === localId);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...updates };
      this.setOfflineTodos(todos);
    }
  }

  /**
   * Remove a todo from offline storage
   */
  static removeTodo(localId: string): void {
    const todos = this.getOfflineTodos();
    const filtered = todos.filter(t => t.localId !== localId);
    this.setOfflineTodos(filtered);
  }

  /**
   * Add an action to the sync queue
   */
  static addToSyncQueue(action: QueuedAction): void {
    const queue = this.getSyncQueue();
    queue.push(action);
    this.setSyncQueue(queue);
  }

  /**
   * Remove an action from the sync queue
   */
  static removeFromSyncQueue(actionId: string): void {
    const queue = this.getSyncQueue();
    const filtered = queue.filter(action => action.id !== actionId);
    this.setSyncQueue(filtered);
  }

  /**
   * Update an action in the sync queue
   */
  static updateSyncQueueAction(actionId: string, updates: Partial<QueuedAction>): void {
    const queue = this.getSyncQueue();
    const index = queue.findIndex(action => action.id === actionId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      this.setSyncQueue(queue);
    }
  }
}