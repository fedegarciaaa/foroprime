import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/post-card";
import { loadPosts } from "@/components/post/post-list-loader";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `s/${slug}` };
}

export default async function SubforumPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ orden?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const order = sp.orden === "top" ? "top" : "new";

  const supabase = await createClient();
  const { data: subforum } = await supabase
    .from("subforums")
    .select("slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!subforum) notFound();

  const { posts, authed, currentUserId } = await loadPosts({ subforumSlug: subforum.slug, order });

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-border bg-gradient-to-br from-card to-accent/30 p-5">
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span className="text-sm font-medium">s/{subforum.slug}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{subforum.name}</h1>
        {subforum.description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subforum.description}</p>
        ) : null}
        <div className="mt-3">
          <Button asChild size="sm">
            <Link href={`/s/${subforum.slug}/crear`}>
              <PenSquare className="h-4 w-4" /> Crear post
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-sm">
          <Link
            href={`/s/${subforum.slug}`}
            className={`rounded px-2.5 py-1 ${order === "new" ? "bg-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            Nuevo
          </Link>
          <Link
            href={`/s/${subforum.slug}?orden=top`}
            className={`rounded px-2.5 py-1 ${order === "top" ? "bg-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            Top
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <p className="mb-2">Este subforo aún no tiene posts.</p>
          <Button asChild size="sm">
            <Link href={`/s/${subforum.slug}/crear`}>Publica el primero</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} authed={authed} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
