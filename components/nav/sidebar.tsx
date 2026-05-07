import Link from "next/link";
import { Hash, Home, PenSquare, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function Sidebar({ activeSlug }: { activeSlug?: string }) {
  const supabase = await createClient();
  const [{ data: subforums }, { data: { user } }] = await Promise.all([
    supabase.from("subforums").select("slug, name").order("name", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  return (
    <aside
      className="hidden w-56 shrink-0 border-r border-border bg-background/40 px-3 py-6 md:block"
      aria-label="Navegación de subforos"
    >
      <nav className="space-y-1 text-sm">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent"
        >
          <Home className="h-4 w-4" /> Inicio
        </Link>
        <Link
          href="/?orden=top"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent"
        >
          <TrendingUp className="h-4 w-4" /> Top
        </Link>
        {user ? (
          <Link
            href="/crear"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 font-medium text-primary hover:bg-accent"
          >
            <PenSquare className="h-4 w-4" /> Crear post
          </Link>
        ) : null}
      </nav>

      <div className="mt-6">
        <div className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subforos
        </div>
        <nav className="space-y-0.5 text-sm">
          {(subforums ?? []).map((s) => (
            <Link
              key={s.slug}
              href={`/s/${s.slug}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent",
                activeSlug === s.slug && "bg-accent font-medium",
              )}
            >
              <Hash className="h-4 w-4 text-muted-foreground" /> {s.name}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
