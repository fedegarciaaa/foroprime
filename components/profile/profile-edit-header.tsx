"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { uploadAvatar, updateProfile } from "@/lib/actions/profile";
import { formatRelativeEs } from "@/lib/utils";

type Props = {
  username: string;
  initialDisplayName: string;
  initialBio: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  initial: string;
};

export function ProfileEditHeader({
  username,
  initialDisplayName,
  initialBio,
  avatarUrl,
  role,
  createdAt,
  initial,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const hasChanges =
    displayName !== initialDisplayName || bio !== initialBio || !!pendingFile;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande", description: "Máximo 2 MB permitidos", variant: "destructive" });
      return;
    }
    setPendingFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function onSave() {
    startTransition(async () => {
      if (pendingFile) {
        const fd = new FormData();
        fd.set("avatar", pendingFile);
        const r = await uploadAvatar(fd);
        if (!r.ok) {
          toast({ title: "No se pudo subir la foto", description: r.error, variant: "destructive" });
          return;
        }
        setPendingFile(null);
        setPreviewUrl(null);
      }

      const fd = new FormData();
      fd.set("display_name", displayName);
      fd.set("bio", bio);
      const r = await updateProfile(fd);
      if (!r.ok) {
        toast({ title: "No se pudo guardar", description: r.error, variant: "destructive" });
        return;
      }

      router.refresh();
      toast({ title: "Perfil actualizado" });
    });
  }

  return (
    <header className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <Avatar className="h-16 w-16">
          {(previewUrl ?? avatarUrl) ? (
            <AvatarImage src={previewUrl ?? avatarUrl!} alt="" />
          ) : null}
          <AvatarFallback className="text-xl">{initial}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent"
          aria-label="Cambiar foto de perfil"
        >
          <Camera className="h-3 w-3" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nombre visible"
          maxLength={50}
          className="h-9 text-lg font-semibold"
        />
        <p className="text-sm text-muted-foreground">@{username}</p>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Una línea sobre ti (280 caracteres máx.)"
          maxLength={280}
          rows={2}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Miembro desde {formatRelativeEs(createdAt)}
            {role !== "user" && (
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                {role}
              </span>
            )}
          </p>
          {hasChanges && (
            <Button size="sm" onClick={onSave} disabled={pending}>
              <Check className="h-3.5 w-3.5" />
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          )}
        </div>
        {previewUrl && (
          <p className="text-xs text-muted-foreground">
            Nueva foto seleccionada · se guardará al pulsar "Guardar cambios"
          </p>
        )}
      </div>
    </header>
  );
}
