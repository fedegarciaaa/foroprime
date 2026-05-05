import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatRelativeEs } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, role, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, score, comment_count, created_at, subforum:subforums(slug)")
      .eq("author_id", profile.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("comments")
      .select("id, post_id, body_md, score, created_at")
      .eq("author_id", profile.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const initial = (profile.display_name ?? profile.username).charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
          <AvatarFallback className="text-xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio ? <p className="mt-2 text-sm">{profile.bio}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Miembro desde {formatRelativeEs(profile.created_at)}
            {profile.role !== "user" ? (
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                {profile.role}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Posts recientes
        </h2>
        {posts && posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((p) => {
              const sf = p.subforum as unknown as { slug: string } | null;
              return (
                <Card key={p.id} className="p-3">
                  <Link
                    href={`/p/${p.id}/${p.slug}`}
                    className="block font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {sf ? <>en <Link href={`/s/${sf.slug}`} className="hover:underline">s/{sf.slug}</Link> · </> : null}
                    {p.score} pts · {p.comment_count} comentarios · {formatRelativeEs(p.created_at)}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin posts aún.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Comentarios recientes
        </h2>
        {comments && comments.length > 0 ? (
          <div className="space-y-2">
            {comments.map((c) => (
              <Card key={c.id} className="p-3 text-sm">
                <p className="line-clamp-2">{c.body_md}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.score} pts · {formatRelativeEs(c.created_at)} · <Link className="hover:underline" href={`/p/${c.post_id}/`}>ver hilo</Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>
        )}
      </section>
    </div>
  );
}
