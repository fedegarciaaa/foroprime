import { createClient } from "@/lib/supabase/server";
import type { PostCardData } from "@/components/post/post-card";

type Order = "new" | "top";

export async function loadPosts({
  subforumSlug,
  order = "new",
  limit = 25,
}: {
  subforumSlug?: string;
  order?: Order;
  limit?: number;
}): Promise<{ posts: PostCardData[]; authed: boolean; currentUserId: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  let query = supabase
    .from("posts")
    .select(
      "id, title, slug, body_md, score, comment_count, created_at, author_id, subforum:subforums!inner(slug, name), author:profiles!inner(username)",
    )
    .is("deleted_at", null)
    .limit(limit);

  if (subforumSlug) {
    query = query.eq("subforums.slug", subforumSlug);
  }

  query =
    order === "top"
      ? query.order("score", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("loadPosts error", error);
    return { posts: [], authed, currentUserId: user?.id ?? null };
  }

  const rows = (data ?? []) as Array<{
    id: number;
    title: string;
    slug: string;
    body_md: string;
    score: number;
    comment_count: number;
    created_at: string;
    author_id: string;
    subforum: { slug: string; name: string } | null;
    author: { username: string } | null;
  }>;

  // Buscar mis votos en bulk (si autenticado)
  const myVotes = new Map<number, -1 | 0 | 1>();
  if (user && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("post_id, value")
      .eq("user_id", user.id)
      .in("post_id", ids);
    for (const v of votes ?? []) {
      if (v.post_id != null) myVotes.set(v.post_id, v.value as -1 | 0 | 1);
    }
  }

  const posts: PostCardData[] = rows
    .filter((r) => r.subforum && r.author)
    .map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      body_md: r.body_md,
      score: r.score,
      comment_count: r.comment_count,
      created_at: r.created_at,
      subforum_slug: r.subforum!.slug,
      subforum_name: r.subforum!.name,
      author_username: r.author!.username,
      author_id: r.author_id,
      my_vote: myVotes.get(r.id) ?? 0,
    }));

  return { posts, authed, currentUserId: user?.id ?? null };
}
