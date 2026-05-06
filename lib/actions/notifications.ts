"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";

export async function togglePostSubscription(postId: number): Promise<ActionResult<{ subscribed: boolean }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const { data: existing } = await supabase
    .from("post_subscriptions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    return ok({ subscribed: false });
  } else {
    await supabase
      .from("post_subscriptions")
      .insert({ user_id: user.id, post_id: postId });
    return ok({ subscribed: true });
  }
}

export async function updateNotificationPreferences(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const prefs = {
    user_id: user.id,
    email_enabled: formData.get("email_enabled") === "true",
    email_on_post_comment: formData.get("email_on_post_comment") === "true",
    email_on_comment_reply: formData.get("email_on_comment_reply") === "true",
    email_on_post_deleted: formData.get("email_on_post_deleted") === "true",
    email_on_account_status: formData.get("email_on_account_status") === "true",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(prefs, { onConflict: "user_id" });

  if (error) {
    console.error("updateNotificationPreferences error", error);
    return fail(ERR.UNKNOWN);
  }

  revalidatePath("/u/[username]", "page");
  return ok(undefined);
}

export async function unsubscribeFromPost(postId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  await supabase
    .from("post_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);

  revalidatePath("/u/[username]", "page");
  return ok(undefined);
}
