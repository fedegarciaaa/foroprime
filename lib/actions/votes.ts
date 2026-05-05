"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/utils";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

export async function votePost(postId: number, value: -1 | 0 | 1): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("vote", `vote:${user.id}:${ip}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  const { data, error } = await supabase.rpc("vote_post", { p_post_id: postId, p_value: value });
  if (error) {
    if (error.code === "42501" || error.code === "P0001") return fail(ERR.FORBIDDEN);
    console.error("votePost rpc error", error);
    return fail(ERR.UNKNOWN);
  }
  revalidatePath("/", "layout");
  return ok(data ?? 0);
}

export async function voteComment(commentId: number, value: -1 | 0 | 1): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const ip = getClientIp(await headers());
  try {
    await enforceLimit("vote", `vote:${user.id}:${ip}`);
  } catch {
    return fail(ERR.RATE_LIMITED);
  }

  const { data, error } = await supabase.rpc("vote_comment", {
    p_comment_id: commentId,
    p_value: value,
  });
  if (error) {
    if (error.code === "42501" || error.code === "P0001") return fail(ERR.FORBIDDEN);
    console.error("voteComment rpc error", error);
    return fail(ERR.UNKNOWN);
  }
  revalidatePath("/", "layout");
  return ok(data ?? 0);
}
