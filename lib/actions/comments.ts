"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCommentSchema } from "@/lib/validators/comment";
import { renderMarkdownSafe } from "@/lib/sanitize";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

const MAX_DEPTH = 8;

export async function createComment(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const parsed = createCommentSchema.safeParse({
    postId: formData.get("postId"),
    parentId: formData.get("parentId") || null,
    body: formData.get("body"),
  });
  if (!parsed.success) return fail(ERR.INVALID_INPUT, parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("createComment", `comment:${user.id}:${ip}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  // Verificar post existe (RLS lo expone si no está deleted)
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", parsed.data.postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!post) return fail(ERR.NOT_FOUND);

  // Si hay parent, calcular depth y path
  let depth = 0;
  let parentPath: string | null = null;

  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, post_id, path, depth, deleted_at")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!parent || parent.post_id !== parsed.data.postId || parent.deleted_at) {
      return fail("Comentario padre no encontrado");
    }
    if (parent.depth >= MAX_DEPTH) return fail("Has alcanzado el máximo de anidamiento");
    depth = parent.depth + 1;
    parentPath = String(parent.path ?? parent.id);
  }

  const html = renderMarkdownSafe(parsed.data.body);

  // Insertamos con un path provisional y luego lo actualizamos con el id real.
  // Truco: usamos un valor temporal y un round-trip.
  const tempPath = parentPath ? `${parentPath}.0` : "0";

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({
      post_id: parsed.data.postId,
      parent_id: parsed.data.parentId ?? null,
      author_id: user.id,
      body_md: parsed.data.body,
      body_html: html,
      depth,
      path: tempPath,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("createComment insert error", error);
    return fail(ERR.UNKNOWN);
  }

  const finalPath = parentPath ? `${parentPath}.${inserted.id}` : String(inserted.id);
  const { error: updErr } = await supabase
    .from("comments")
    .update({ path: finalPath })
    .eq("id", inserted.id);
  if (updErr) console.error("createComment path update error", updErr);

  revalidatePath(`/p/${parsed.data.postId}`, "page");
  return ok({ id: inserted.id });
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) return fail(ERR.FORBIDDEN);

  revalidatePath("/", "layout");
  return ok(undefined);
}
