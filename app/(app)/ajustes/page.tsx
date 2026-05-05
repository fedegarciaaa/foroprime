import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("username, display_name, bio")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Ajustes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Edita tu perfil público. Tu nombre de usuario <span className="font-medium text-foreground">@{profile?.username}</span> no se puede cambiar.
      </p>
      <SettingsForm
        initialDisplayName={profile?.display_name ?? ""}
        initialBio={profile?.bio ?? ""}
      />
    </div>
  );
}
