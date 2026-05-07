"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePicker } from "@/components/ui/image-picker";
import { ImageGrid } from "@/components/ui/image-grid";
import { toast } from "@/components/ui/toaster";
import { updatePost, deletePost } from "@/lib/actions/posts";
import { uploadPostImage, MAX_IMAGES } from "@/lib/storage/images";

type Props = {
  postId: number;
  initialTitle: string;
  initialBodyMd: string;
  bodyHtml: string;
  subforumSlug: string;
  isAdmin?: boolean;
  initialImageUrls?: string[];
  userId?: string;
};

export function PostActions({ postId, initialTitle, initialBodyMd, bodyHtml, subforumSlug, isAdmin, initialImageUrls = [], userId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBodyMd);
  const [keptUrls, setKeptUrls] = useState<string[]>(initialImageUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // Upload new images
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0 && userId) {
        try {
          uploadedUrls = await Promise.all(newFiles.map((f) => uploadPostImage(f, userId)));
        } catch {
          toast({ title: "No se pudieron subir las imágenes", variant: "destructive" });
          return;
        }
      }

      const allUrls = [...keptUrls, ...uploadedUrls].slice(0, MAX_IMAGES);
      const fd = new FormData();
      fd.set("id", String(postId));
      fd.set("title", title);
      fd.set("body", body);
      if (allUrls.length > 0) {
        fd.set("imageUrls", allUrls.join(","));
      }

      const result = await updatePost(fd);
      if (!result.ok) {
        toast({ title: "No se pudo guardar", description: result.error, variant: "destructive" });
        return;
      }
      setEditing(false);
      setNewFiles([]);
      router.refresh();
      toast({ title: "Post actualizado" });
    });
  }

  function onDelete() {
    if (!confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const result = await deletePost(postId);
      if (!result.ok) {
        toast({ title: "No se pudo eliminar", description: result.error, variant: "destructive" });
        return;
      }
      router.push(`/s/${subforumSlug}`);
    });
  }

  const totalImages = keptUrls.length + newFiles.length;

  if (editing) {
    return (
      <form onSubmit={onSave} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title">Título</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-body">Contenido</Label>
          <Textarea
            id="edit-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            maxLength={20000}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Imágenes</Label>
          {keptUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keptUrls.map((url, i) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setKeptUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Eliminar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {totalImages < MAX_IMAGES && (
            <ImagePicker files={newFiles} onChange={setNewFiles} />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setTitle(initialTitle);
              setBody(initialBodyMd);
              setKeptUrls(initialImageUrls);
              setNewFiles([]);
              setEditing(false);
            }}
            disabled={pending}
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">{initialTitle}</h1>
      <div className="prose-fp text-sm" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <ImageGrid urls={initialImageUrls} />
      <div className="mt-4 flex gap-1">
        {!isAdmin ? (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive/70 hover:text-destructive"
          onClick={onDelete}
          disabled={pending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>
    </>
  );
}
