import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploadForm } from "@/components/profile/avatar-upload-form";
import { SettingsForm } from "./form";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ajustes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .single();

  const initial = (profile?.display_name ?? profile?.username ?? "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Edita tu perfil público. Tu nombre de usuario{" "}
          <span className="font-medium text-foreground">@{profile?.username}</span> no se puede cambiar.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Foto de perfil</h2>
        <AvatarUploadForm
          currentAvatarUrl={profile?.avatar_url ?? null}
          initial={initial}
        />
      </section>

      <div className="border-t border-border" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Información</h2>
        <SettingsForm
          initialDisplayName={profile?.display_name ?? ""}
          initialBio={profile?.bio ?? ""}
        />
      </section>
    </div>
  );
}
