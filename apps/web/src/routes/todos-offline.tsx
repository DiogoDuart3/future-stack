import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  Upload,
  X,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { useImageHandling } from "@/hooks/useImageHandling";

export const Route = createFileRoute("/todos-offline")({
  component: OfflineTodosRoute,
});

interface OfflineTodo {
  id: string;
  text: string;
  completed: boolean;
  imageUrl?: string | null;
  imageData?: string | null; // Base64 image data for offline images
  status: "synced" | "pending" | "syncing" | "error";
  error?: string;
  localId?: string; // For offline-created todos
  serverId?: number; // Server ID after sync
  createdAt: number;
}

interface QueuedAction {
  id: string;
  type: "create" | "update" | "delete";
  todoId: string;
  data?: any;
  retryCount: number;
  lastAttempt?: number;
}

function OfflineTodosRoute() {
  const [todos, setTodos] = useState<OfflineTodo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { 
    selectedImage, 
    imagePreview, 
    fileInputRef, 
    handleImageSelect, 
    handleRemoveImage, 
    clearImage 
  } = useImageHandling();

  // Load server todos (when online)
  const serverTodos = useQuery({
    ...orpc.todo.getAllWithImages.queryOptions(),
    enabled: isOnline,
    refetchInterval: isOnline ? 30000 : false, // Refresh every 30s when online
  });

  // Local storage keys
  const TODOS_KEY = "offline-todos";
  const SYNC_QUEUE_KEY = "sync-queue";

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem(TODOS_KEY);
    const savedQueue = localStorage.getItem(SYNC_QUEUE_KEY);

    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }

    if (savedQueue) {
      setSyncQueue(JSON.parse(savedQueue));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Merge server todos with local todos (avoid duplicates)
  useEffect(() => {
    if (serverTodos.data && isOnline) {
      setTodos((currentTodos) => {
        // Create server todos with proper typing
        const serverTodosConverted = (serverTodos.data as any[])?.map((todo: any) => ({
          id: todo.id.toString(),
          text: todo.text,
          completed: todo.completed,
          imageUrl: todo.imageUrl,
          status: "synced" as const,
          serverId: todo.id,
          createdAt: Date.now(),
        }));

        // Create a Set of server IDs for quick lookup
        const serverIds = new Set((serverTodos.data as any[])?.map((todo: any) => todo.id));

        // Keep only local todos that:
        // 1. Are unsynced (pending/syncing/error) AND don't have a server match
        // 2. OR are synced but don't exist in server data (deleted on server)
        const filteredLocalTodos = currentTodos.filter((todo) => {
          const isUnsynced =
            todo.status === "pending" ||
            todo.status === "syncing" ||
            todo.status === "error";
          
          const hasServerMatch = todo.serverId && serverIds.has(todo.serverId);
          
          // Keep if unsynced and no server match, OR if synced but not in server (deleted)
          // But don't keep local todos that have been successfully synced and exist on server
          const shouldKeep = (isUnsynced && !hasServerMatch) || (todo.status === "synced" && !hasServerMatch);
          
          return shouldKeep;
        });

        // Combine server todos with filtered local todos
        const mergedTodos = [...serverTodosConverted, ...filteredLocalTodos];

        return mergedTodos.sort((a, b) => b.createdAt - a.createdAt);
      });
    }
  }, [serverTodos.data, isOnline]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      syncPendingActions();
    }
  }, [isOnline, syncQueue.length, isSyncing]);

  // Image handling is now provided by useImageHandling hook

  const generateLocalId = () =>
    `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const localId = generateLocalId();
    const newTodo: OfflineTodo = {
      id: localId,
      text: newTodoText.trim(),
      completed: false,
      imageData: imagePreview, // Store base64 data instead of File
      status: isOnline ? "syncing" : "pending",
      localId,
      createdAt: Date.now(),
    };

    // Add to local state immediately
    setTodos((prev) => [newTodo, ...prev]);

    // Queue for sync
    const queueAction: QueuedAction = {
      id: generateLocalId(),
      type: "create",
      todoId: localId,
      data: {
        text: newTodo.text,
        imageData: imagePreview, // Store base64 data for sync
      },
      retryCount: 0,
    };

    setSyncQueue((prev) => [...prev, queueAction]);

    // Clear form
    setNewTodoText("");
    clearImage();

    // Auto-sync effect will handle the sync when online
  };

  const handleToggleTodo = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    const updatedTodo: OfflineTodo = {
      ...todo,
      completed: !todo.completed,
      status: isOnline ? "syncing" : "pending",
    };

    setTodos((prev) => prev.map((t) => (t.id === todoId ? updatedTodo : t)));
    
    // Queue for sync
    const queueAction: QueuedAction = {
      id: generateLocalId(),
      type: "update",
      todoId,
      data: {
        completed: updatedTodo.completed,
        serverId: todo.serverId,
      },
      retryCount: 0,
    };

    setSyncQueue((prev) => [...prev, queueAction]);

    // Auto-sync effect will handle the sync when online
  };

  const handleDeleteTodo = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    console.log("Deleting todo:", {
      id: todoId,
      serverId: todo.serverId,
      status: todo.status,
    });

    // Remove from local state
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    // Only queue for deletion if it was synced to server
    if (todo.serverId) {
      const queueAction: QueuedAction = {
        id: generateLocalId(),
        type: "delete",
        todoId,
        data: { serverId: todo.serverId },
        retryCount: 0,
      };

      console.log("Queueing delete action:", queueAction);
      setSyncQueue((prev) => [...prev, queueAction]);

      // Auto-sync effect will handle the sync when online
    } else {
      console.log("Todo has no serverId, skipping server deletion");
    }
  };

  const syncAction = async (action: QueuedAction) => {
    try {
      // Only find todo for operations that need it (create, update)
      const todo =
        action.type === "create" || action.type === "update"
          ? todos.find((t) => t.id === action.todoId)
          : null;

      switch (action.type) {
        case "create":
          try {
            // First, create the todo with text using ORPC
            const todo = await orpc.todo.create.call({ text: action.data.text });
            
            // If there's an image, upload it using ORPC
            if (action.data.imageData) {
              // Convert base64 data URL back to base64 string
              const base64Data = action.data.imageData.split(',')[1];
              
              await orpc.todo.uploadImage.call({
                todoId: todo.id,
                filename: "image.jpg",
                contentType: "image/jpeg",
                fileData: base64Data,
              });
            }

            // Update local todo with server ID and mark as synced
            setTodos((prev) =>
              prev.map((t) =>
                t.id === action.todoId
                  ? {
                      ...t,
                      status: "synced",
                      serverId: todo.id,
                      imageUrl: todo.imageUrl,
                      // Keep the local ID, don't change it to server ID
                    }
                  : t
              )
            );

            // Remove from queue
            setSyncQueue((prev) => prev.filter((a) => a.id !== action.id));
          } catch (error) {
            throw new Error("Failed to create todo");
          }
          break;

        case "update":
          if (action.data.serverId) {
            await orpc.todo.toggle.call({
              id: action.data.serverId,
              completed: action.data.completed,
            });

            setTodos((prev) =>
              prev.map((t) =>
                t.id === action.todoId ? { ...t, status: "synced" } : t
              )
            );

            setSyncQueue((prev) => prev.filter((a) => a.id !== action.id));
          }
          break;

        case "delete":
          if (action.data.serverId) {
            console.log("Syncing delete for serverId:", action.data.serverId);
            await orpc.todo.delete.call({ id: action.data.serverId });
            console.log("Delete sync successful, removing from queue");
            setSyncQueue((prev) => prev.filter((a) => a.id !== action.id));
          } else {
            console.log("No serverId for delete action, removing from queue");
            setSyncQueue((prev) => prev.filter((a) => a.id !== action.id));
          }
          break;
      }
    } catch (error) {
      console.error(
        "Sync failed for action:",
        action.type,
        "todoId:",
        action.todoId,
        "error:",
        error
      );

      // Mark todo as error state (only for create/update since delete removes the todo)
      if (action.type === "create" || action.type === "update") {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === action.todoId
              ? {
                  ...t,
                  status: "error",
                  error: error instanceof Error ? error.message : "Sync failed",
                }
              : t
          )
        );
      }

      // For delete operations, we might want to show a notification or handle differently
      if (action.type === "delete") {
        console.error("Delete sync failed for serverId:", action.data.serverId);
        // Could show a toast notification here
      }

      // Update retry count
      setSyncQueue((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? { ...a, retryCount: a.retryCount + 1, lastAttempt: Date.now() }
            : a
        )
      );
    }
  };

  const syncPendingActions = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);

    try {
      // Sync actions one by one to avoid overwhelming the server
      for (const action of syncQueue) {
        if (action.retryCount < 3) {
          // Max 3 retries
          await syncAction(action);
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between requests
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const getPendingCount = () => syncQueue.length;

  const getStatusIcon = (todo: OfflineTodo) => {
    switch (todo.status) {
      case "syncing":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Debug function to clear local data (useful during development)
  const clearLocalData = () => {
    localStorage.removeItem(TODOS_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    setTodos([]);
    setSyncQueue([]);
    // Refetch server data
    serverTodos.refetch();
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <PWAInstallPrompt variant="card" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offline Todos</CardTitle>
              <CardDescription>
                Works offline with automatic sync
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isOnline ? "Online" : "Offline"}
              </span>
              {getPendingCount() > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {getPendingCount()} pending
                </span>
              )}
              {isSyncing && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAddTodo} className="mb-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newTodoText.trim()}>
                Add
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload" className="text-sm font-medium">
                Attach Image (optional)
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>

              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </form>

          {todos.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No todos yet. Add one above!
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={`rounded-md border p-3 ${
                    todo.status === "error"
                      ? "border-red-200 bg-red-50"
                      : todo.status === "pending"
                        ? "border-yellow-200 bg-yellow-50"
                        : todo.status === "syncing"
                          ? "border-blue-200 bg-blue-50"
                          : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleToggleTodo(todo.id)}
                        id={`todo-${todo.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <label
                            htmlFor={`todo-${todo.id}`}
                            className={`block cursor-pointer ${
                              todo.completed
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {todo.text}
                          </label>
                          {getStatusIcon(todo)}
                        </div>

                        {todo.error && (
                          <div className="text-xs text-red-600">
                            Error: {todo.error}
                          </div>
                        )}

                        {(todo.imageUrl || todo.imageData) && (
                          <div className="mt-2">
                            <img
                              src={todo.imageUrl || todo.imageData || ""}
                              alt="Todo attachment"
                              className="h-24 w-24 rounded-md object-cover border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTodo(todo.id)}
                      aria-label="Delete todo"
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {getPendingCount() > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  {getPendingCount()}{" "}
                  {getPendingCount() === 1 ? "action" : "actions"} pending sync
                </div>
                {isOnline && !isSyncing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncPendingActions}
                  >
                    Sync Now
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Local cache: {todos.length} todos, {getPendingCount()} pending
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={clearLocalData}
                className="text-xs h-7"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
