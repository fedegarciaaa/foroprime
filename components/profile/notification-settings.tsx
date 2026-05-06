"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { updateNotificationPreferences, unsubscribeFromPost } from "@/lib/actions/notifications";

type Prefs = {
  email_enabled: boolean;
  email_on_post_comment: boolean;
  email_on_comment_reply: boolean;
  email_on_post_deleted: boolean;
  email_on_account_status: boolean;
};

type Subscription = {
  post_id: number;
  post: { title: string; slug: string } | null;
};

type Props = {
  initialPrefs: Prefs;
  subscriptions: Subscription[];
};

export function NotificationSettings({ initialPrefs, subscriptions }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [pending, startTransition] = useTransition();
  const [subs, setSubs] = useState(subscriptions);

  function savePrefs(updated: Prefs) {
    setPrefs(updated);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email_enabled", String(updated.email_enabled));
      fd.set("email_on_post_comment", String(updated.email_on_post_comment));
      fd.set("email_on_comment_reply", String(updated.email_on_comment_reply));
      fd.set("email_on_post_deleted", String(updated.email_on_post_deleted));
      fd.set("email_on_account_status", String(updated.email_on_account_status));
      const result = await updateNotificationPreferences(fd);
      if (!result.ok) {
        toast({ title: "Error al guardar", description: result.error, variant: "destructive" });
        setPrefs(initialPrefs);
      }
    });
  }

  function toggle(key: keyof Prefs) {
    savePrefs({ ...prefs, [key]: !prefs[key] });
  }

  function handleUnsubscribe(postId: number) {
    startTransition(async () => {
      const result = await unsubscribeFromPost(postId);
      if (result.ok) {
        setSubs(s => s.filter(sub => sub.post_id !== postId));
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  }

  const itemClass = "flex items-center justify-between gap-4 py-3";
  const labelClass = "flex flex-col gap-0.5 cursor-pointer";

  return (
    <section id="notificaciones" className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notificaciones por email
        </h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-1 divide-y divide-border">
        {/* Master toggle */}
        <div className={itemClass}>
          <Label htmlFor="email_enabled" className={labelClass}>
            <span className="font-medium">Activar notificaciones por email</span>
            <span className="text-xs text-muted-foreground">Control general — desactivar silencia todo</span>
          </Label>
          <Switch
            id="email_enabled"
            checked={prefs.email_enabled}
            onCheckedChange={() => toggle("email_enabled")}
            disabled={pending}
          />
        </div>

        {/* Tipos individuales */}
        <div className={`${itemClass} ${!prefs.email_enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <Label htmlFor="email_on_post_comment" className={labelClass}>
            <span className="font-medium">Comentarios en mis posts</span>
            <span className="text-xs text-muted-foreground">Cuando alguien comenta en un post que sigues</span>
          </Label>
          <Switch
            id="email_on_post_comment"
            checked={prefs.email_on_post_comment}
            onCheckedChange={() => toggle("email_on_post_comment")}
            disabled={pending || !prefs.email_enabled}
          />
        </div>

        <div className={`${itemClass} ${!prefs.email_enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <Label htmlFor="email_on_comment_reply" className={labelClass}>
            <span className="font-medium">Respuestas a mis comentarios</span>
            <span className="text-xs text-muted-foreground">Cuando alguien responde directamente a un comentario tuyo</span>
          </Label>
          <Switch
            id="email_on_comment_reply"
            checked={prefs.email_on_comment_reply}
            onCheckedChange={() => toggle("email_on_comment_reply")}
            disabled={pending || !prefs.email_enabled}
          />
        </div>

        <div className={`${itemClass} ${!prefs.email_enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <Label htmlFor="email_on_post_deleted" className={labelClass}>
            <span className="font-medium">Mi post ha sido eliminado</span>
            <span className="text-xs text-muted-foreground">Cuando el equipo de moderación elimina uno de tus posts</span>
          </Label>
          <Switch
            id="email_on_post_deleted"
            checked={prefs.email_on_post_deleted}
            onCheckedChange={() => toggle("email_on_post_deleted")}
            disabled={pending || !prefs.email_enabled}
          />
        </div>

        <div className={itemClass}>
          <Label htmlFor="email_on_account_status" className={labelClass}>
            <span className="font-medium">Estado de mi cuenta</span>
            <span className="text-xs text-muted-foreground">Suspensión o reactivación de tu cuenta</span>
          </Label>
          <Switch
            id="email_on_account_status"
            checked={prefs.email_on_account_status}
            onCheckedChange={() => toggle("email_on_account_status")}
            disabled={pending}
          />
        </div>
      </div>

      {/* Suscripciones a posts */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Posts que sigues</h3>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sigues ningún post.</p>
        ) : (
          <div className="space-y-2">
            {subs.map(sub => (
              <div key={sub.post_id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                {sub.post ? (
                  <Link
                    href={`/p/${sub.post_id}/${sub.post.slug}`}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {sub.post.title}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    Post #{sub.post_id}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleUnsubscribe(sub.post_id)}
                  disabled={pending}
                  className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                  aria-label="Dejar de seguir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
