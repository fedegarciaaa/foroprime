import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { resolveReport } from "@/lib/actions/reports";
import { formatRelativeEs } from "@/lib/utils";

type Report = {
  id: number;
  reason: string;
  comment: string | null;
  created_at: string;
  post: { id: number; title: string; slug: string; deleted_at: string | null } | null;
  reporter: { username: string } | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam o publicidad no deseada",
  ofensivo: "Contenido ofensivo o acoso",
  desinformacion: "Desinformación o noticias falsas",
  ilegal: "Contenido ilegal",
  otro: "Otro motivo",
};

async function resolveWithDelete(fd: FormData) {
  "use server";
  fd.set("deletePost", "true");
  await resolveReport(fd);
}

async function resolveOnly(fd: FormData) {
  "use server";
  fd.set("deletePost", "false");
  await resolveReport(fd);
}

export default async function DenunciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/denuncias");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "moderador"].includes(profile.role)) notFound();

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, comment, created_at, post:posts(id, title, slug, deleted_at), reporter:profiles!reporter_id(username)",
    )
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  const rows = (reports ?? []) as unknown as Report[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de denuncias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length === 0
            ? "No hay denuncias pendientes."
            : `${rows.length} denuncia${rows.length === 1 ? "" : "s"} pendiente${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {rows.map((report) => {
        const post = report.post;
        const postDeleted = !!post?.deleted_at;
        return (
          <Card key={report.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {REASON_LABELS[report.reason] ?? report.reason}
                </p>
                <p className="text-xs text-muted-foreground">
                  Denunciado por{" "}
                  {report.reporter ? (
                    <Link href={`/u/${report.reporter.username}`} className="hover:underline">
                      @{report.reporter.username}
                    </Link>
                  ) : (
                    "usuario desconocido"
                  )}{" "}
                  · {formatRelativeEs(report.created_at)}
                </p>
              </div>
              {postDeleted ? (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Post eliminado
                </span>
              ) : null}
            </div>

            {post && !postDeleted ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <Link
                  href={`/p/${post.id}/${post.slug}`}
                  className="text-sm font-medium hover:underline"
                  target="_blank"
                >
                  {post.title}
                </Link>
              </div>
            ) : null}

            {report.comment ? (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-sm italic text-muted-foreground">
                &ldquo;{report.comment}&rdquo;
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <form action={resolveOnly}>
                <input type="hidden" name="reportId" value={report.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Resolver sin acción
                </button>
              </form>

              {post && !postDeleted ? (
                <form action={resolveWithDelete}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    Eliminar post y resolver
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
