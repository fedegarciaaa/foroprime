"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { updatePost, deletePost } from "@/lib/actions/posts";

type Props = {
  postId: number;
  initialTitle: string;
  initialBodyMd: string;
  bodyHtml: string;
  subforumSlug: string;
  isAdmin?: boolean;
};

export function PostActions({ postId, initialTitle, initialBodyMd, bodyHtml, subforumSlug, isAdmin }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBodyMd);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", String(postId));
    fd.set("title", title);
    fd.set("body", body);
    startTransition(async () => {
      const result = await updatePost(fd);
      if (!result.ok) {
        toast({ title: "No se pudo guardar", description: result.error, variant: "destructive" });
        return;
      }
      setEditing(false);
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
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setTitle(initialTitle); setBody(initialBodyMd); setEditing(false); }}
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
