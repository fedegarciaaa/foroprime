"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validators/profile";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse({
    display_name: (formData.get("display_name") as string)?.trim() || null,
    bio: (formData.get("bio") as string)?.trim() || null,
  });
  if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("updateProfile", `profile:${user.id}:${ip}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.display_name, bio: parsed.data.bio })
    .eq("id", user.id);
  if (error) {
    console.error("updateProfile error", error);
    return fail(ERR.UNKNOWN);
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return fail(ERR.INVALID_INPUT, { avatar: ["Selecciona una imagen"] });
  if (!ALLOWED_TYPES.includes(file.type)) return fail("Solo se permiten imágenes JPEG, PNG, WebP o GIF");
  if (file.size > MAX_SIZE) return fail("La imagen no puede superar 2 MB");

  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("uploadAvatar storage error", uploadError);
    return fail(ERR.UNKNOWN);
  }

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  // Añadimos timestamp para romper la caché del navegador tras cada subida
  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: urlWithBust })
    .eq("id", user.id);

  if (updateError) {
    console.error("uploadAvatar profile update error", updateError);
    return fail(ERR.UNKNOWN);
  }

  revalidatePath("/", "layout");
  return ok(urlWithBust);
}
