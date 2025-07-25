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
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { useState, useRef } from "react";

import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/todos")({
  component: TodosRoute,
});

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todos = useQuery(orpc.todo.getAll.queryOptions());
  // We're now using direct fetch instead of mutations for image upload
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onSuccess: () => { todos.refetch() },
    }),
  );
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => { todos.refetch() },
    }),
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim() && !isCreating) {
      setIsCreating(true);
      try {
        console.log('Creating todo with image:', { text: newTodoText, hasImage: !!selectedImage });
        
        // Create FormData for multipart request
        const formData = new FormData();
        formData.append('text', newTodoText.trim());
        
        if (selectedImage) {
          // Check file size (limit to 5MB)
          if (selectedImage.size > 5 * 1024 * 1024) {
            throw new Error('File too large. Maximum size is 5MB.');
          }
          formData.append('image', selectedImage);
          console.log('Added image to form data:', selectedImage.name, selectedImage.size, 'bytes');
        }
        
        // Send multipart request to our direct endpoint
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/todos/create-with-image`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for auth
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create todo');
        }
        
        const result = await response.json();
        console.log('Todo created successfully:', result);
        
        // Refresh todos list
        todos.refetch();
        
        // Clear form after successful creation
        setNewTodoText("");
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error('Failed to create todo:', error);
        // You could show a toast notification here
        alert(error instanceof Error ? error.message : 'Failed to create todo');
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="mb-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add a new task..."
                disabled={isCreating}
              />
              <Button
                type="submit"
                disabled={isCreating || !newTodoText.trim()}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
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
                  disabled={isCreating}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
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

            {todos.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : todos.data?.length === 0 ? (
              <p className="py-4 text-center">
                No todos yet. Add one above!
              </p>
            ) : (
              <ul className="space-y-3">
                {todos.data?.map((todo) => (
                  <li
                    key={todo.id}
                    className="rounded-md border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() =>
                            handleToggleTodo(todo.id, todo.completed)
                          }
                          id={`todo-${todo.id}`}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <label
                            htmlFor={`todo-${todo.id}`}
                            className={`block cursor-pointer ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {todo.text}
                          </label>
                          {todo.imageUrl && (
                            <div className="mt-2">
                              <img
                                src={todo.imageUrl}
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
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
