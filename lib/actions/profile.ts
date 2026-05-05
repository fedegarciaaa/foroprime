"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validators/profile";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

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
