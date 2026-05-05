import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const sp = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flame className="h-5 w-5 text-primary" /> ForoPrime
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Entra para participar en la conversación.
      </p>
      <LoginForm initialError={sp.error === "oauth" ? "No pudimos completar el inicio con Google" : undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
          Crea una
        </Link>
      </p>
    </div>
  );
}
