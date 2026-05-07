import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreatePostForm } from "./form";

export const metadata = { title: "Crear post" };

export default async function CreatePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/s/${slug}/crear`);

  const { data: subforum } = await supabase
    .from("subforums")
    .select("slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!subforum) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href={`/s/${subforum.slug}`} className="hover:underline">
          ← Volver a s/{subforum.slug}
        </Link>
      </nav>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Nuevo post</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Publicando en <span className="font-medium text-foreground">s/{subforum.slug}</span> · {subforum.name}
      </p>
      <CreatePostForm subforumSlug={subforum.slug} userId={user.id} />
    </div>
  );
}
