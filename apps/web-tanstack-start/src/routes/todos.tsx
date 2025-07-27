import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import { validateFileSize, validateImageType } from '@ecomantem/todos'
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})

// Create the same ORPC setup as the main web app
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

const link = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

const client = createORPCClient(link);
const orpc = createTanstackQueryUtils(client);

function TodosRoute() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodosComponent />
    </QueryClientProvider>
  )
}

function TodosComponent() {
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use the same ORPC pattern as main web app
  const todos = useQuery((orpc as any).todo.getAllWithImages.queryOptions())
  
  const toggleMutation = useMutation(
    (orpc as any).todo.toggle.mutationOptions({
      onSuccess: () => { todos.refetch() },
    }),
  )
  
  const deleteMutation = useMutation(
    (orpc as any).todo.delete.mutationOptions({
      onSuccess: () => { todos.refetch() },
    }),
  )

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size using shared utilities
      if (!validateImageType(file)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP)')
        return
      }
      if (!validateFileSize(file)) {
        alert('File too large. Maximum size is 5MB.')
        return
      }
      
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodoText.trim() && !isCreating) {
      setIsCreating(true)
      try {
        console.log('Creating todo with image:', { text: newTodoText, hasImage: !!selectedImage })
        
        // Create FormData for multipart request (same as main web app)
        const formData = new FormData()
        formData.append('text', newTodoText.trim())
        
        if (selectedImage) {
          // File validation already done in handleImageSelect
          formData.append('image', selectedImage)
          console.log('Added image to form data:', selectedImage.name, selectedImage.size, 'bytes')
        }
        
        // Send multipart request to our direct endpoint (same as main web app)
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/todos/create-with-image`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for auth
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create todo')
        }
        
        const result = await response.json()
        console.log('Todo created successfully:', result)
        
        // Refresh todos list
        todos.refetch()
        
        // Clear form after successful creation
        setNewTodoText("")
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        console.error('Failed to create todo:', error)
        alert(error instanceof Error ? error.message : 'Failed to create todo')
      } finally {
        setIsCreating(false)
      }
    }
  }

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed })
  }

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id })
  }

  if (todos.error) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="text-red-600 text-center">
          Error loading todos: {(todos.error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Todos (TanStack Start + ORPC)</h1>
      
      <form onSubmit={handleAddTodo} className="mb-6 space-y-4 p-4 border border-gray-200 rounded-lg">
        <div>
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add a new todo..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isCreating}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="text-sm"
            disabled={isCreating}
          />
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!newTodoText.trim() || isCreating}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {isCreating ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      <div className="space-y-3">
        {todos.isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading todos...</p>
          </div>
        ) : todos.data?.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No todos yet. Add one above!</p>
        ) : (
          todos.data?.map((todo: any) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleTodo(todo.id, todo.completed)}
                className="w-4 h-4"
                disabled={toggleMutation.isPending}
              />
              <div className="flex-1">
                <span className={`block ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                  {todo.text}
                </span>
                {todo.imageUrl && (
                  <img
                    src={todo.imageUrl}
                    alt="Todo"
                    className="mt-2 w-20 h-20 object-cover rounded border"
                  />
                )}
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Status:</h3>
        <ul className="text-sm space-y-1">
          <li>📡 Server URL: {import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}</li>
          <li>🔗 ORPC Endpoint: {import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/rpc</li>
          <li>📊 Total todos: {todos.data?.length || 0}</li>
          <li>✅ Completed: {todos.data?.filter((t: any) => t.completed).length || 0}</li>
          <li>⏳ Pending: {todos.data?.filter((t: any) => !t.completed).length || 0}</li>
          <li>🔄 Loading: {todos.isLoading ? 'Yes' : 'No'}</li>
          {todos.error && <li>❌ Error: {(todos.error as Error).message}</li>}
        </ul>
      </div>
    </div>
  )
}