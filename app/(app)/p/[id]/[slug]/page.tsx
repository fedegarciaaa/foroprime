import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoteButtons } from "@/components/post/vote-buttons";
import { PostActions } from "@/components/post/post-actions";
import { ReportPostForm } from "@/components/post/report-post-form";
import { SubscribeToggle } from "@/components/post/subscribe-toggle";
import { CommentForm } from "@/components/comment/comment-form";
import { CommentTree, type CommentNode } from "@/components/comment/comment-tree";
import { formatRelativeEs } from "@/lib/utils";

type CommentRow = {
  id: number;
  parent_id: number | null;
  author_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  body_html: string;
  body_md: string;
  depth: number;
  score: number;
  created_at: string;
  deleted_at: string | null;
  my_vote: number | null;
};

function buildTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      parent_id: r.parent_id,
      author_id: r.author_id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      body_html: r.body_html,
      body_md: r.body_md,
      depth: r.depth,
      score: r.score,
      created_at: r.created_at,
      deleted_at: r.deleted_at,
      my_vote: ((r.my_vote ?? 0) as -1 | 0 | 1),
      children: [],
    });
  }
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("title")
    .eq("id", Number(id))
    .maybeSingle();
  return { title: data?.title ?? "Post" };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  let isAdmin = false;
  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = prof?.role === "admin" || prof?.role === "moderador" || prof?.role === "moderator";
  }

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, slug, body_html, body_md, score, comment_count, created_at, updated_at, deleted_at, author_id, subforum:subforums(slug, name), author:profiles(username, display_name, avatar_url)",
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.deleted_at) notFound();

  const isOwn = !!user && user.id === post.author_id;

  let myVote: -1 | 0 | 1 = 0;
  let isSubscribed = false;
  if (user) {
    const [voteResult, subResult] = await Promise.all([
      supabase.from("votes").select("value").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
      supabase.from("post_subscriptions").select("user_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
    ]);
    myVote = ((voteResult.data?.value ?? 0) as -1 | 0 | 1);
    isSubscribed = !!subResult.data;
  }

  const { data: commentRows } = await supabase.rpc("get_comment_tree", { p_post_id: postId });
  const tree = buildTree((commentRows ?? []) as CommentRow[]);

  const subforum = post.subforum as unknown as { slug: string; name: string } | null;
  const author = post.author as unknown as { username: string; display_name: string | null; avatar_url: string | null } | null;
  const initial = (author?.display_name ?? author?.username ?? "?").charAt(0).toUpperCase();

  const wasEdited = !!post.updated_at && post.updated_at !== post.created_at;

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-3 text-sm text-muted-foreground">
        {subforum ? (
          <Link href={`/s/${subforum.slug}`} className="hover:underline">
            ← s/{subforum.slug}
          </Link>
        ) : null}
      </nav>

      <Card className="p-5">
        <div className="flex gap-4">
          <div className="hidden shrink-0 sm:block">
            <VoteButtons
              target="post"
              targetId={post.id}
              initialScore={post.score}
              initialMyVote={myVote}
              authed={authed}
              isOwn={isOwn}
            />
          </div>
          <div className="min-w-0 flex-1">
            <header className="mb-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {subforum ? (
                  <Link href={`/s/${subforum.slug}`} className="font-medium text-foreground hover:underline">
                    s/{subforum.slug}
                  </Link>
                ) : null}
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    {author?.avatar_url ? <AvatarImage src={author.avatar_url} alt="" /> : null}
                    <AvatarFallback className="text-[8px]">{initial}</AvatarFallback>
                  </Avatar>
                  {author ? (
                    <Link href={`/u/${author.username}`} className="hover:underline">
                      @{author.username}
                    </Link>
                  ) : null}
                </span>
                <span>·</span>
                <span>{formatRelativeEs(post.created_at)}</span>
                {wasEdited ? (
                  <>
                    <span>·</span>
                    <span className="italic">editado {formatRelativeEs(post.updated_at!)}</span>
                  </>
                ) : null}
              </div>
              {!isOwn ? (
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{post.title}</h1>
              ) : null}
            </header>

            {isOwn || isAdmin ? (
              <PostActions
                postId={post.id}
                initialTitle={post.title}
                initialBodyMd={post.body_md}
                bodyHtml={post.body_html}
                subforumSlug={subforum?.slug ?? ""}
                isAdmin={isAdmin && !isOwn}
              />
            ) : (
              <>
                <h1 className="mb-3 text-2xl font-semibold tracking-tight">{post.title}</h1>
                <div className="prose-fp text-sm" dangerouslySetInnerHTML={{ __html: post.body_html }} />
              </>
            )}

            {authed ? (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <SubscribeToggle postId={post.id} initialSubscribed={isSubscribed} />
                {!isOwn && !isAdmin ? <ReportPostForm postId={post.id} /> : null}
              </div>
            ) : null}

            <div className="mt-3 sm:hidden">
              <VoteButtons
                target="post"
                targetId={post.id}
                initialScore={post.score}
                initialMyVote={myVote}
                authed={authed}
                isOwn={isOwn}
                layout="horizontal"
              />
            </div>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {post.comment_count} {post.comment_count === 1 ? "comentario" : "comentarios"}
        </h2>

        <div className="mb-6">
          <CommentForm postId={post.id} authed={authed} />
        </div>

        <CommentTree nodes={tree} postId={post.id} authed={authed} currentUserId={user?.id ?? null} isAdmin={isAdmin} />
      </section>
    </article>
  );
}
