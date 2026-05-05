"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("auth", `login:${ip}:${parsed.data.email}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail("Email o contraseña incorrectos");

  return ok(undefined);
}

export async function signUpWithPassword(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("auth", `signup:${ip}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return fail("Ese email ya está registrado");
    }
    return fail(ERR.UNKNOWN);
  }
  return ok(undefined);
}

export async function signInWithGoogle(): Promise<never> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth");
  }
  redirect(data.url);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
