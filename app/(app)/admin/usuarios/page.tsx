import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { UserAdminActions } from "@/components/admin/user-admin-actions";
import { formatRelativeEs } from "@/lib/utils";

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
                  <UserAdminActions
                    userId={u.id}
                    username={u.username}
                    currentRole={u.role}
                    isBanned={isBanned}
                    canDelete={isAdmin}
                  />
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
