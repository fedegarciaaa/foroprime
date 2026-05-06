"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

const ALLOWED_ROLES = ["user", "moderador", "admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, profile, supabase };
}

function isAdmin(role: string | null | undefined) {
  return role === "admin" || role === "moderador" || role === "moderator";
}

export async function updateUserRole(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await getAdminUser();
  if (!user || !isAdmin(profile?.role)) return fail(ERR.FORBIDDEN);

  const targetId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  if (!targetId || !ALLOWED_ROLES.includes(role as Role)) return fail(ERR.INVALID_INPUT);

  // No se puede cambiar el propio rol
  if (targetId === user.id) return fail("No puedes cambiar tu propio rol");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", targetId);

  if (error) {
    console.error("updateUserRole error", error);
    return fail(ERR.UNKNOWN);
  }

  revalidatePath("/admin/usuarios");
  return ok(undefined);
}

export async function toggleBan(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await getAdminUser();
  if (!user || !isAdmin(profile?.role)) return fail(ERR.FORBIDDEN);

  const targetId = formData.get("userId") as string;
  if (!targetId) return fail(ERR.INVALID_INPUT);
  if (targetId === user.id) return fail("No puedes banearte a ti mismo");

  const admin = createAdminClient();

  // Leer estado actual
  const { data: target } = await admin
    .from("profiles")
    .select("banned_at")
    .eq("id", targetId)
    .single();

  if (!target) return fail(ERR.NOT_FOUND);

  const newBannedAt = target.banned_at ? null : new Date().toISOString();

  const { error } = await admin
    .from("profiles")
    .update({ banned_at: newBannedAt })
    .eq("id", targetId);

  if (error) {
    console.error("toggleBan error", error);
    return fail(ERR.UNKNOWN);
  }

  revalidatePath("/admin/usuarios");
  return ok(undefined);
}

export async function adminDeleteUser(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await getAdminUser();
  if (!user || profile?.role !== "admin") return fail(ERR.FORBIDDEN);

  const targetId = formData.get("userId") as string;
  if (!targetId) return fail(ERR.INVALID_INPUT);
  if (targetId === user.id) return fail("No puedes eliminar tu propia cuenta");

  const admin = createAdminClient();

  // Primero banear para bloquear acceso inmediato
  await admin.from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", targetId);

  // Eliminar de auth (borra también el profile via cascade)
  const { error } = await admin.auth.admin.deleteUser(targetId);

  if (error) {
    console.error("adminDeleteUser error", error);
    return fail(ERR.UNKNOWN);
  }

  revalidatePath("/admin/usuarios");
  return ok(undefined);
}
