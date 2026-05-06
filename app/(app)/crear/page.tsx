import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const metadata = { title: "Crear post" };

export default async function CreatePickPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/crear");

  const { data: subforums } = await supabase
    .from("subforums")
    .select("slug, name, description")
    .order("name");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Crear post</h1>
      <p className="mb-6 text-sm text-muted-foreground">Elige el subforo donde quieres publicar</p>

      <ul className="space-y-2">
        {(subforums ?? []).map((sf) => (
          <li key={sf.slug}>
            <Link href={`/s/${sf.slug}/crear`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-foreground/30 hover:bg-accent/40">
                <div>
                  <p className="font-semibold">s/{sf.slug}</p>
                  {sf.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{sf.description}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
