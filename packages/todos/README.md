# @future-stack/todos

Shared todos logic package for Ecomantem web applications.

## Features

- 🏷️ **TypeScript Types**: Consistent Todo types across all apps
- ✅ **Zod Validation**: Input validation schemas for all todo operations
- 🖼️ **File Handling**: Image validation and base64 conversion utilities
- 💾 **Offline Storage**: LocalStorage utilities for offline todo management
- 📱 **Cross-Platform**: Works with both regular React and TanStack Start apps

## Installation

This package is automatically available in the monorepo workspace:

```json
{
  "dependencies": {
    "@future-stack/todos": "workspace:*"
  }
}
```

## Usage

### Types

```typescript
import { Todo, CreateTodoInput, OfflineTodo } from '@future-stack/todos';

const todo: Todo = {
  id: 1,
  text: "Buy groceries",
  completed: false,
  imageUrl: null
};
```

### Validation

```typescript
import { 
  createTodoSchema,
  validateFileSize, 
  validateImageType 
} from '@future-stack/todos';

// Validate todo input
const input = createTodoSchema.parse({ text: "New todo" });

// Validate file uploads
if (validateImageType(file) && validateFileSize(file)) {
  // File is valid
}
```

### Storage (Offline Support)

```typescript
import { TodoStorage, createOfflineTodo } from '@future-stack/todos';

// Create and store offline todo
const offlineTodo = createOfflineTodo("Offline task");
TodoStorage.addTodo(offlineTodo);

// Retrieve offline todos
const todos = TodoStorage.getOfflineTodos();
```

### Utilities

```typescript
import { fileToBase64, generateLocalId } from '@future-stack/todos';

// Convert file to base64
const base64 = await fileToBase64(imageFile);

// Generate unique local ID
const localId = generateLocalId();
```

### API Client

```typescript
import { createBrowserTodosApi } from '@future-stack/todos';

// Create API client
const api = createBrowserTodosApi('http://localhost:3000');

// Use API methods
const todos = await api.getAllWithImages();
const newTodo = await api.createWithImage('Buy milk', imageFile);
await api.toggle({ id: 1, completed: true });
await api.delete({ id: 1 });
```

### React Query Hooks

```typescript
import { 
  createBrowserTodosApi, 
  createTodosHooks 
} from '@future-stack/todos';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Setup
const queryClient = new QueryClient();
const todosApi = createBrowserTodosApi('http://localhost:3000');
const todosHooks = createTodosHooks({ api: todosApi });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodosComponent />
    </QueryClientProvider>
  );
}

function TodosComponent() {
  // Fetch todos with images
  const { data: todos, isLoading } = todosHooks.useTodosWithImages();
  
  // Mutations
  const createTodo = todosHooks.useCreateTodoWithImage();
  const toggleTodo = todosHooks.useToggleTodo();
  const deleteTodo = todosHooks.useDeleteTodo();
  
  const handleCreate = async () => {
    await createTodo.mutateAsync({ text: 'New todo', image: file });
  };
  
  // ... component logic
}
```

## Apps Using This Package

- **`apps/web/`**: Main web application with full todo functionality
- **`apps/web-tanstack-start/`**: TanStack Start application with shared todo logic

## Development

```bash
# Build the package
bun run build

# Watch for changes
bun run dev

# Clean build artifacts
bun run clean
```

## Exports

The package exports everything you need:

- **Types**: `Todo`, `CreateTodoInput`, `UpdateTodoInput`, `DeleteTodoInput`, `UploadImageInput`, `OfflineTodo`, `TodoStatus`, `QueuedAction`
- **Schemas**: `todoSchema`, `createTodoSchema`, `updateTodoSchema`, etc.
- **Utilities**: `validateFileSize`, `validateImageType`, `fileToBase64`, `generateLocalId`, etc.
- **Storage**: `TodoStorage` class with localStorage utilities
- **API Client**: `TodosApi`, `createBrowserTodosApi`, `createTodosApi`
- **React Query Hooks**: `createTodosHooks` with `useTodosWithImages`, `useCreateTodoWithImage`, etc.
- **Constants**: `STORAGE_KEYS`, `SYNC_CONFIG`, `TODOS_QUERY_KEYS`