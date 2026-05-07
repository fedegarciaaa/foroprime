"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_IMAGES, MAX_SIZE_BYTES, ALLOWED_TYPES } from "@/lib/storage/images";

interface ImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function ImagePicker({ files, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const valid: File[] = [];
    const remaining = MAX_IMAGES - files.length;
    for (let i = 0; i < newFiles.length && valid.length < remaining; i++) {
      const f = newFiles[i];
      if (!f || !ALLOWED_TYPES.includes(f.type)) continue;
      if (f.size > MAX_SIZE_BYTES) continue;
      valid.push(f);
    }
    onChange([...files, ...valid]);
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="group relative h-20 w-20 overflow-hidden rounded-md border border-border"
            >
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Eliminar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < MAX_IMAGES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Añadir fotos
            {files.length > 0 && (
              <span className="text-xs">
                ({files.length}/{MAX_IMAGES})
              </span>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Máx. {MAX_IMAGES} fotos · 5 MB por imagen · JPG, PNG, WebP o GIF
          </p>
        </>
      )}
    </div>
  );
}
