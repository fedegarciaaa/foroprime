"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPostSchema, updatePostSchema } from "@/lib/validators/post";
import { renderMarkdownSafe } from "@/lib/sanitize";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp, slugify } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

export async function createPost(formData: FormData): Promise<ActionResult<{ id: number; slug: string; subforumSlug: string }>> {
  try {
    const parsed = createPostSchema.safeParse({
      subforumSlug: formData.get("subforumSlug"),
      title: formData.get("title"),
      body: formData.get("body"),
    });
    if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail(ERR.UNAUTHENTICATED);

    const { data: profile } = await supabase
      .from("profiles")
      .select("banned_at")
      .eq("id", user.id)
      .single();
    if (profile?.banned_at) return fail("Tu cuenta está suspendida y no puedes publicar");

    const ip = getClientIp(await headers());
    try {
      await enforceLimit("createPost", `post:${user.id}:${ip}`);
    } catch {
      return fail(ERR.RATE_LIMITED);
    }

    const { data: subforum, error: sfErr } = await supabase
      .from("subforums")
      .select("id, slug")
      .eq("slug", parsed.data.subforumSlug)
      .maybeSingle();
    if (sfErr || !subforum) return fail("Subforo no encontrado");

    const html = renderMarkdownSafe(parsed.data.body);
    const slug = slugify(parsed.data.title) || `post-${Date.now()}`;

    const { data: inserted, error } = await supabase
      .from("posts")
      .insert({
        subforum_id: subforum.id,
        author_id: user.id,
        title: parsed.data.title,
        slug,
        body_md: parsed.data.body,
        body_html: html,
      })
      .select("id, slug")
      .single();

    if (error || !inserted) {
      console.error("createPost insert error", error);
      return fail(ERR.UNKNOWN);
    }

    // Auto-suscribir al autor para recibir notificaciones de su propio post
    await supabase
      .from("post_subscriptions")
      .insert({ user_id: user.id, post_id: inserted.id })
      .then(() => {});

    revalidatePath(`/s/${subforum.slug}`);
    revalidatePath("/");
    return ok({ id: inserted.id, slug: inserted.slug, subforumSlug: subforum.slug });
  } catch (err) {
    console.error("createPost unexpected error", err);
    return fail(ERR.UNKNOWN);
  }
}

export async function updatePost(formData: FormData): Promise<ActionResult> {
  const parsed = updatePostSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    subforumSlug: "_unused_",
  });
  if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const html = renderMarkdownSafe(parsed.data.body);
  const { error } = await supabase
    .from("posts")
    .update({
      title: parsed.data.title,
      body_md: parsed.data.body,
      body_html: html,
    })
    .eq("id", parsed.data.id);
  // RLS bloquea si no es autor o moderador → error tipado por postgres

  if (error) return fail(ERR.FORBIDDEN);
  revalidatePath("/");
  return ok(undefined);
}

export async function deletePost(postId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  // Soft delete: marcar deleted_at. RLS permite update solo a autor o moderador.
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return fail(ERR.FORBIDDEN);

  revalidatePath("/");
  return ok(undefined);
}

export async function redirectToCreated(args: { subforumSlug: string; id: number; slug: string }): Promise<never> {
  redirect(`/p/${args.id}/${args.slug}`);
}
