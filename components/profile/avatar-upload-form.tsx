"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { uploadAvatar } from "@/lib/actions/profile";

type Props = {
  currentAvatarUrl: string | null;
  initial: string;
};

export function AvatarUploadForm({ currentAvatarUrl, initial }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande", description: "Máximo 2 MB permitidos", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onCancel() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onUpload() {
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      const result = await uploadAvatar(fd);
      if (!result.ok) {
        toast({ title: "No se pudo subir la foto", description: result.error, variant: "destructive" });
        return;
      }
      setFile(null);
      setPreview(null);
      router.refresh();
      toast({ title: "Foto de perfil actualizada" });
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <Avatar className="h-16 w-16">
          {preview ?? currentAvatarUrl ? (
            <AvatarImage src={preview ?? currentAvatarUrl!} alt="Avatar" />
          ) : null}
          <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
        </Avatar>
        {!preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent"
            aria-label="Cambiar foto de perfil"
          >
            <Camera className="h-3 w-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {preview ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Vista previa lista para subir</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onUpload} disabled={pending}>
              {pending ? "Subiendo…" : "Subir foto"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Cambiar foto
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP o GIF · máx. 2 MB</p>
        </div>
      )}
    </div>
  );
}
