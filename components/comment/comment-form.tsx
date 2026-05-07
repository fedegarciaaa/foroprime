"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/ui/image-picker";
import { createComment } from "@/lib/actions/comments";
import { uploadPostImage } from "@/lib/storage/images";
import { toast } from "@/components/ui/toaster";

type Props = {
  postId: number;
  parentId?: number | null;
  authed: boolean;
  userId?: string;
  onDone?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
};

export function CommentForm({ postId, parentId = null, authed, userId, onDone, autoFocus, compact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  if (!authed) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <a href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </a>{" "}
        para participar en el debate.
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim()) return;
    const form = e.currentTarget;
    startTransition(async () => {
      // Upload images first
      let imageUrls: string[] = [];
      if (imageFiles.length > 0 && userId) {
        try {
          imageUrls = await Promise.all(imageFiles.map((f) => uploadPostImage(f, userId)));
        } catch {
          toast({ title: "No se pudieron subir las imágenes", variant: "destructive" });
          return;
        }
      }

      const fd = new FormData(form);
      fd.set("body", value);
      if (imageUrls.length > 0) {
        fd.set("imageUrls", imageUrls.join(","));
      }

      const result = await createComment(fd);
      if (!result.ok) {
        toast({ title: "No se pudo publicar", description: result.error, variant: "destructive" });
        return;
      }
      setValue("");
      setImageFiles([]);
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Textarea
        name="body"
        rows={compact ? 3 : 4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={parentId ? "Responde al comentario…" : "Comparte tu opinión…"}
        autoFocus={autoFocus}
        maxLength={5000}
        required
      />
      {userId && <ImagePicker files={imageFiles} onChange={setImageFiles} />}
      <div className="flex items-center justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending || !value.trim()}>
          {pending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
