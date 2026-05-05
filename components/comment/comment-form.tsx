"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/lib/actions/comments";
import { toast } from "@/components/ui/toaster";

type Props = {
  postId: number;
  parentId?: number | null;
  authed: boolean;
  onDone?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
};

export function CommentForm({ postId, parentId = null, authed, onDone, autoFocus, compact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

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
    const fd = new FormData(e.currentTarget);
    fd.set("body", value);
    startTransition(async () => {
      const result = await createComment(fd);
      if (!result.ok) {
        toast({ title: "No se pudo publicar", description: result.error, variant: "destructive" });
        return;
      }
      setValue("");
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
