"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useUploadMedia, useDeleteMedia } from "@/lib/queries/media";
import type { UploadedImage } from "@/lib/queries/media";
import {
  validateFileType,
  validateFileSize,
  MAX_IMAGES_PER_POST,
} from "@/lib/validators/media";

interface ImageItem {
  id: string; // filename portion from path (user-id/filename.ext → filename.ext)
  path: string;
  url: string;
  uploading?: boolean;
  progress?: number;
}

interface ImageUploadZoneProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  disabled?: boolean;
}

function extractFileId(path: string): string {
  return path.split("/").pop() ?? path;
}

export type { ImageItem };

export function ImageUploadZone({
  images,
  onChange,
  disabled = false,
}: ImageUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();

  // Keep a ref to always have the latest images inside async callbacks
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const remaining = MAX_IMAGES_PER_POST - images.length;
  const isFull = remaining <= 0;

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const toUpload = fileArray.slice(0, remaining);

    if (fileArray.length > remaining) {
      toast.error(`Maximum ${MAX_IMAGES_PER_POST} images per post`);
    }

    for (const file of toUpload) {
      // Client-side validation
      const typeCheck = validateFileType(file.type);
      if (!typeCheck.valid) {
        toast.error(typeCheck.error!);
        continue;
      }

      const sizeCheck = validateFileSize(file.size);
      if (!sizeCheck.valid) {
        toast.error(sizeCheck.error!);
        continue;
      }

      // Create optimistic preview
      const previewUrl = URL.createObjectURL(file);
      const tempId = `uploading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const tempItem: ImageItem = {
        id: tempId,
        path: "",
        url: previewUrl,
        uploading: true,
      };

      onChange([...imagesRef.current, tempItem]);

      try {
        const result: UploadedImage = await uploadMedia.mutateAsync(file);
        const newItem: ImageItem = {
          id: extractFileId(result.path),
          path: result.path,
          url: result.url,
        };

        // Replace temp with final using the ref for latest state
        onChange(
          imagesRef.current.map((img) => (img.id === tempId ? newItem : img)),
        );
      } catch (err) {
        toast.error((err as Error).message);
        // Remove the temp item
        onChange(imagesRef.current.filter((img) => img.id !== tempId));
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || isFull) return;
    processFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled && !isFull) setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset input so re-selecting same file works
    e.target.value = "";
  }

  function handleRemove(item: ImageItem) {
    onChange(images.filter((img) => img.id !== item.id));
    if (item.path) {
      deleteMedia.mutate(extractFileId(item.path), {
        onError: () => toast.error("Failed to delete image from storage"),
      });
    }
  }

  function handleReorder(dragIndex: number, dropIndex: number) {
    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onChange(reordered);
  }

  // Drag reorder state
  const [dragReorderIndex, setDragReorderIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Images</label>
        <span className="text-xs text-muted-foreground">
          {images.filter((i) => !i.uploading).length}/{MAX_IMAGES_PER_POST}
        </span>
      </div>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((item, index) => (
            <div
              key={item.id}
              className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                item.uploading
                  ? "animate-pulse border-dashed border-foreground/20"
                  : "border-border hover:border-foreground/30"
              } ${
                dragReorderIndex === index
                  ? "opacity-50 scale-95"
                  : "opacity-100"
              }`}
              draggable={!item.uploading && !disabled}
              onDragStart={() => setDragReorderIndex(index)}
              onDragEnd={() => setDragReorderIndex(null)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragReorderIndex !== null && dragReorderIndex !== index) {
                  handleReorder(dragReorderIndex, index);
                }
                setDragReorderIndex(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Upload spinner overlay */}
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                </div>
              )}

              {/* Remove button */}
              {!item.uploading && !disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground/70 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              )}

              {/* Drag handle indicator */}
              {!item.uploading && !disabled && (
                <div className="absolute bottom-1.5 left-1.5 flex h-5 items-center rounded bg-background/70 px-1.5 text-[10px] font-medium text-foreground/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {!isFull && !disabled && (
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragOver
              ? "border-foreground/40 bg-foreground/5"
              : "border-border hover:border-foreground/20 hover:bg-muted/30"
          }`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
          </svg>
          <div>
            <p className="text-sm text-muted-foreground">
              Drop images here or{" "}
              <span className="font-medium text-foreground">browse</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              JPEG, PNG, GIF, WEBP up to 5MB
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload images"
      />
    </div>
  );
}
