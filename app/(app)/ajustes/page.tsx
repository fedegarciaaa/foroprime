import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ajustes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  redirect(`/u/${profile?.username ?? user.id}`);
}
