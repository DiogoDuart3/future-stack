import { useState, useEffect, useCallback } from 'react';

export interface OfflineTodo {
  id: string;
  text: string;
  completed: boolean;
  imageUrl?: string | null;
  imageFile?: File | null;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  error?: string;
  localId?: string;
  serverId?: number;
  createdAt: number;
}

export interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  todoId: string;
  data?: any;
  retryCount: number;
  lastAttempt?: number;
}

const TODOS_KEY = 'offline-todos';
const SYNC_QUEUE_KEY = 'sync-queue';

export function useOfflineSync() {
  const [todos, setTodos] = useState<OfflineTodo[]>([]);
  const [syncQueue, setSyncQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem(TODOS_KEY);
    const savedQueue = localStorage.getItem(SYNC_QUEUE_KEY);
    
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (error) {
        console.error('Failed to parse saved todos:', error);
      }
    }
    
    if (savedQueue) {
      try {
        setSyncQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Failed to parse sync queue:', error);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error('Failed to save todos:', error);
    }
  }, [todos]);

  useEffect(() => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }, [syncQueue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate unique local ID
  const generateLocalId = useCallback(() => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add todo (offline-first)
  const addTodo = useCallback(async (text: string, imageFile?: File) => {
    const localId = generateLocalId();
    const newTodo: OfflineTodo = {
      id: localId,
      text: text.trim(),
      completed: false,
      imageFile,
      status: isOnline ? 'syncing' : 'pending',
      localId,
      createdAt: Date.now(),
    };

    // Add to local state immediately
    setTodos(prev => [newTodo, ...prev]);

    // Queue for sync
    const queueAction: QueuedAction = {
      id: generateLocalId(),
      type: 'create',
      todoId: localId,
      data: { text, image: imageFile },
      retryCount: 0,
    };

    setSyncQueue(prev => [...prev, queueAction]);

    return newTodo;
  }, [isOnline, generateLocalId]);

  // Toggle todo completion
  const toggleTodo = useCallback(async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    const updatedTodo: OfflineTodo = {
      ...todo,
      completed: !todo.completed,
      status: isOnline ? 'syncing' : 'pending',
    };

    setTodos(prev => prev.map(t => t.id === todoId ? updatedTodo : t));

    // Queue for sync
    const queueAction: QueuedAction = {
      id: generateLocalId(),
      type: 'update',
      todoId,
      data: {
        completed: updatedTodo.completed,
        serverId: todo.serverId,
      },
      retryCount: 0,
    };

    setSyncQueue(prev => [...prev, queueAction]);

    return updatedTodo;
  }, [todos, isOnline, generateLocalId]);

  // Delete todo
  const deleteTodo = useCallback(async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    // Remove from local state
    setTodos(prev => prev.filter(t => t.id !== todoId));

    // Only queue for deletion if it was synced to server
    if (todo.serverId) {
      const queueAction: QueuedAction = {
        id: generateLocalId(),
        type: 'delete',
        todoId,
        data: { serverId: todo.serverId },
        retryCount: 0,
      };

      setSyncQueue(prev => [...prev, queueAction]);
    }
  }, [todos, generateLocalId]);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    if (isSyncing || !isOnline || syncQueue.length === 0) return;

    setIsSyncing(true);
    
    try {
      for (const action of syncQueue) {
        if (action.retryCount < 3) {
          await syncAction(action);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, syncQueue]);

  // Sync individual action
  const syncAction = async (action: QueuedAction) => {
    try {
      switch (action.type) {
        case 'create':
          const formData = new FormData();
          formData.append('text', action.data.text);
          if (action.data.image) {
            formData.append('image', action.data.image);
          }

          const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/todos/create-with-image`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const serverTodo = await response.json();
            
            setTodos(prev => prev.map(t => 
              t.id === action.todoId 
                ? { ...t, status: 'synced', serverId: serverTodo.id, imageUrl: serverTodo.imageUrl }
                : t
            ));

            setSyncQueue(prev => prev.filter(a => a.id !== action.id));
          } else {
            throw new Error('Failed to create todo');
          }
          break;

        // Add other sync cases here...
      }
    } catch (error) {
      console.error('Sync failed:', error);
      
      if (action.type === 'create') {
        setTodos(prev => prev.map(t => 
          t.id === action.todoId 
            ? { ...t, status: 'error', error: error instanceof Error ? error.message : 'Sync failed' }
            : t
        ));
      }

      setSyncQueue(prev => prev.map(a => 
        a.id === action.id 
          ? { ...a, retryCount: a.retryCount + 1, lastAttempt: Date.now() }
          : a
      ));
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      syncPendingActions();
    }
  }, [isOnline, syncQueue.length, isSyncing, syncPendingActions]);

  return {
    todos,
    setTodos,
    syncQueue,
    isOnline,
    isSyncing,
    addTodo,
    toggleTodo,
    deleteTodo,
    syncPendingActions,
    getPendingCount: () => syncQueue.length,
  };
}