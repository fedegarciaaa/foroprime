"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/lib/actions/posts";

export function CreatePostForm({ subforumSlug }: { subforumSlug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("subforumSlug", subforumSlug);

    startTransition(async () => {
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
