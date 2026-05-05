import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { enforceLimit } from "@/lib/ratelimit";
import { getClientIp, formatRelativeEs } from "@/lib/utils";

export const metadata = { title: "Buscar" };

type SearchRow = {
  id: number;
  subforum_id: number;
  subforum_slug: string;
  subforum_name: string;
  author_id: string;
  username: string;
  title: string;
  slug: string;
  headline: string;
  score: number;
  comment_count: number;
  created_at: string;
  rank: number;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sub = (sp.s ?? "").trim() || undefined;

  const supabase = await createClient();
  let results: SearchRow[] = [];
  let limited = false;

  if (q.length >= 2) {
    const ip = getClientIp(await headers());
    try {
      await enforceLimit("search", `search:${ip}`);
    } catch {
      limited = true;
    }

    if (!limited) {
      const args: { q: string; p_limit: number; p_offset: number; p_subforum?: string } = {
        q,
        p_limit: 25,
        p_offset: 0,
      };
      if (sub) args.p_subforum = sub;
      const { data, error } = await supabase.rpc("search_posts", args);
      if (error) console.error("search error", error);
      results = ((data ?? []) as SearchRow[]).filter(Boolean);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Buscar</h1>
        <p className="text-sm text-muted-foreground">
          {q ? <>Resultados para <span className="font-medium text-foreground">«{q}»</span></> : "Empieza escribiendo en la barra superior."}
        </p>
      </header>

      {limited ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Demasiadas búsquedas. Espera un momento e inténtalo de nuevo.
        </div>
      ) : null}

      {q && q.length < 2 ? (
        <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres.</p>
      ) : null}

      {q.length >= 2 && results.length === 0 && !limited ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Sin resultados. Prueba con otras palabras.
        </div>
      ) : null}

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <Link href={`/s/${r.subforum_slug}`} className="font-medium text-foreground hover:underline">
                  s/{r.subforum_slug}
                </Link>
                <span>·</span>
                <span>por <Link href={`/u/${r.username}`} className="hover:underline">@{r.username}</Link></span>
                <span>·</span>
                <span>{formatRelativeEs(r.created_at)}</span>
                <span>·</span>
                <span>{r.score} pts · {r.comment_count} comentarios</span>
              </div>
              <h3 className="mb-1 text-base font-semibold leading-snug">
                <Link href={`/p/${r.id}/${r.slug}`} className="hover:underline">
                  {r.title}
                </Link>
              </h3>
              {r.headline ? (
                <p
                  className="prose-fp text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: r.headline }}
                />
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
