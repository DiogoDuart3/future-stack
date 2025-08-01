import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/utils/orpc';
import { compressImage } from '@/utils/imageCompression';

export interface CreateTodoInput {
  text: string;
  imageFile?: File;
}

export function useTodoMutations() {
  const createTodoMutation = useMutation({
    mutationFn: async (input: CreateTodoInput) => {
      // First, create the todo with text
      const todo = await orpc.todo.create.call({ text: input.text });
      
      // If there's an image, compress and upload it
      if (input.imageFile) {
        console.log('Original image size:', input.imageFile.size, 'bytes');
        
        // Compress the image
        const compressedFile = await compressImage(input.imageFile);
        console.log('Compressed image size:', compressedFile.size, 'bytes');
        console.log('Compression ratio:', ((1 - compressedFile.size / input.imageFile.size) * 100).toFixed(1) + '%');
        
        // Convert compressed file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 data
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });
        
        // Upload the compressed image
        await orpc.todo.uploadImage.call({
          todoId: todo.id,
          filename: compressedFile.name,
          contentType: compressedFile.type,
          fileData: base64Data,
        });
      }
      
      return todo;
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async (input: { id: number; completed: boolean }) => {
      return await orpc.todo.toggle.call(input);
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (input: { id: number }) => {
      return await orpc.todo.delete.call(input);
    },
  });

  return {
    createTodoMutation,
    toggleTodoMutation,
    deleteTodoMutation,
  };
} 