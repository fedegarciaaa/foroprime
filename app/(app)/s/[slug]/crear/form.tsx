"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/ui/image-picker";
import { createPost } from "@/lib/actions/posts";
import { uploadPostImage } from "@/lib/storage/images";

export function CreatePostForm({ subforumSlug, userId }: { subforumSlug: string; userId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setFieldErrors({});
    const form = e.currentTarget;

    startTransition(async () => {
      // Upload images first, then create post
      let imageUrls: string[] = [];
      if (imageFiles.length > 0 && userId) {
        try {
          imageUrls = await Promise.all(imageFiles.map((f) => uploadPostImage(f, userId)));
        } catch {
          setError("No se pudieron subir las imágenes. Inténtalo de nuevo.");
          return;
        }
      }

      const fd = new FormData(form);
      fd.set("subforumSlug", subforumSlug);
      if (imageUrls.length > 0) {
        fd.set("imageUrls", imageUrls.join(","));
      }

      const result = await createPost(fd);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(`/p/${result.data.id}/${result.data.slug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          placeholder="Un título claro y conciso"
        />
        {fieldErrors.title?.map((e) => (
          <p key={e} className="text-xs text-destructive">
            {e}
          </p>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Cuerpo</Label>
        <Textarea
          id="body"
          name="body"
          required
          minLength={1}
          maxLength={20000}
          rows={10}
          placeholder={"Cuenta tu historia, comparte el enlace, plantea la pregunta…\n\nMarkdown básico: **negrita**, *cursiva*, `código`, > cita, - lista, [enlace](https://...)"}
        />
        {fieldErrors.body?.map((e) => (
          <p key={e} className="text-xs text-destructive">
            {e}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          Soporta markdown básico. Los enlaces se sanean automáticamente.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Imágenes (opcional)</Label>
        <ImagePicker files={imageFiles} onChange={setImageFiles} />
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => history.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
