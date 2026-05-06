import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { updateUserRole, toggleBan, adminDeleteUser } from "@/lib/actions/admin";
import { formatRelativeEs } from "@/lib/utils";

async function doUpdateRole(fd: FormData) {
  "use server";
  await updateUserRole(fd);
}

async function doToggleBan(fd: FormData) {
  "use server";
  await toggleBan(fd);
}

async function doDeleteUser(fd: FormData) {
  "use server";
  await adminDeleteUser(fd);
}

const ROLES = [
  { value: "user", label: "Usuario" },
  { value: "moderador", label: "Moderador" },
  { value: "admin", label: "Admin" },
];

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/usuarios");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || !["admin", "moderador", "moderator"].includes(myProfile.role)) notFound();

  const isAdmin = myProfile.role === "admin";

  // profiles: select público → el cliente normal lee todos los perfiles
  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, banned_at, created_at")
    .order("created_at", { ascending: false });

  const rows = users ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel de usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} usuarios registrados</p>
        </div>
        <Link href="/admin/denuncias" className="text-sm text-muted-foreground hover:underline">
          → Panel de denuncias
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((u) => {
          const initial = (u.display_name ?? u.username).charAt(0).toUpperCase();
          const isSelf = u.id === user.id;
          const isBanned = !!u.banned_at;

          return (
            <Card key={u.id} className={`p-4 ${isBanned ? "border-destructive/40 bg-destructive/5" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/u/${u.username}`} className="font-medium hover:underline">
                      @{u.username}
                    </Link>
                    {u.display_name ? (
                      <span className="text-sm text-muted-foreground">{u.display_name}</span>
                    ) : null}
                    {isBanned ? (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
                        Suspendido
                      </span>
                    ) : null}
                    {isSelf ? (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                        Tú
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Miembro desde {formatRelativeEs(u.created_at)}
                    {isBanned && u.banned_at ? ` · Suspendido ${formatRelativeEs(u.banned_at)}` : ""}
                  </p>
                </div>

                {!isSelf ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={doUpdateRole} className="flex items-center">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        onChange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </form>

                    <form action={doToggleBan}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                          isBanned
                            ? "border-border hover:bg-accent"
                            : "border-destructive/40 text-destructive hover:bg-destructive/10"
                        }`}
                      >
                        {isBanned ? "Reactivar" : "Suspender"}
                      </button>
                    </form>

                    {isAdmin ? (
                      <form action={doDeleteUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-destructive bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                          onClick={(e) => {
                            if (!confirm(`¿Eliminar la cuenta de @${u.username}? Esta acción es permanente.`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Eliminar cuenta
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
