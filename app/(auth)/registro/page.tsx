import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./form";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flame className="h-5 w-5 text-primary" /> ForoPrime
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Únete a ForoPrime</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Crea una cuenta para publicar, comentar y votar.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Entra
        </Link>
      </p>
    </div>
  );
}
