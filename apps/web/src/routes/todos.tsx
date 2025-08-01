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
import { useState } from "react";

import { orpc } from "@/utils/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTodoMutations } from "@/hooks/useTodoMutations";
import { useImageHandling } from "@/hooks/useImageHandling";

export const Route = createFileRoute("/todos")({
  component: TodosRoute,
});

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState("");
  
  const todos = useQuery(orpc.todo.getAllWithImages.queryOptions());
  const { createTodoMutation, toggleTodoMutation, deleteTodoMutation } = useTodoMutations();
  const { 
    selectedImage, 
    imagePreview, 
    fileInputRef, 
    handleImageSelect, 
    handleRemoveImage, 
    clearImage 
  } = useImageHandling();

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim() && !createTodoMutation.isPending) {
      console.log('Creating todo with image:', { text: newTodoText, hasImage: !!selectedImage });
      
      try {
        await createTodoMutation.mutateAsync({
          text: newTodoText.trim(),
          imageFile: selectedImage || undefined,
        });
        
        // Clear form after successful creation
        setNewTodoText("");
        clearImage();
        todos.refetch();
      } catch (error) {
        console.error('Failed to create todo:', error);
        alert(error instanceof Error ? error.message : 'Failed to create todo');
      }
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleTodoMutation.mutate({ id, completed: !completed }, {
      onSuccess: () => { todos.refetch() }
    });
  };

  const handleDeleteTodo = (id: number) => {
    deleteTodoMutation.mutate({ id }, {
      onSuccess: () => { todos.refetch() }
    });
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
                disabled={createTodoMutation.isPending}
              />
              <Button
                type="submit"
                disabled={createTodoMutation.isPending || !newTodoText.trim()}
              >
                {createTodoMutation.isPending ? (
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
                  disabled={createTodoMutation.isPending}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={createTodoMutation.isPending}
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
            ) : (todos.data as any[])?.length === 0 ? (
              <p className="py-4 text-center">
                No todos yet. Add one above!
              </p>
            ) : (
              <ul className="space-y-3">
                {(todos.data as any[])?.map((todo: any) => (
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
