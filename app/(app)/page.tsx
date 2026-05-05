import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post/post-card";
import { loadPosts } from "@/components/post/post-list-loader";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const sp = await searchParams;
  const order = sp.orden === "top" ? "top" : "new";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { posts, authed } = await loadPosts({ order });

  return (
    <div className="space-y-4">
      {!user ? (
        <section className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/10 via-card to-accent/30 p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" /> Comunidad abierta
          </span>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Conversaciones que <span className="text-primary">importan</span>.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            ForoPrime es una comunidad moderna de subforos. Crea cuenta gratis para publicar, comentar y votar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/registro">
                Empezar gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {user ? "Tu feed" : "Lo que se está hablando"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Conversaciones {order === "top" ? "más votadas" : "más recientes"} de la comunidad.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-sm">
          <Link
            href="/"
            className={`rounded px-2.5 py-1 ${order === "new" ? "bg-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            Nuevo
          </Link>
          <Link
            href="/?orden=top"
            className={`rounded px-2.5 py-1 ${order === "top" ? "bg-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            Top
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <p className="mb-2">Aún no hay posts en ForoPrime.</p>
          <Button asChild size="sm">
            <Link href="/s/rotulacion/crear">Publica el primero</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} authed={authed} />
          ))}
        </div>
      )}
    </div>
  );
}
