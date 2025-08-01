import { useState, useRef } from 'react';
import { createImagePreview } from '@/utils/imageCompression';

// Local validation functions
const validateImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

const validateFileSize = (file: File): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size <= maxSize;
};

export function useImageHandling() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size using shared utilities
      if (!validateImageType(file)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }
      if (!validateFileSize(file)) {
        alert('File too large. Maximum size is 5MB.');
        return;
      }
      
      setSelectedImage(file);
      
      // Show compressed preview
      try {
        const preview = await createImagePreview(file);
        setImagePreview(preview);
        
        // Log compression info
        console.log('Preview compression:', {
          original: file.size,
          preview: preview.length,
        });
      } catch (error) {
        console.error('Failed to create preview:', error);
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    selectedImage,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    handleRemoveImage,
    clearImage,
  };
} 