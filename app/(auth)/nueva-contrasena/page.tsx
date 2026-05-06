import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./form";

export const metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar-contrasena");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flame className="h-5 w-5 text-primary" /> ForoPrime
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Elige una contraseña segura para tu cuenta.
      </p>
      <NewPasswordForm />
    </div>
  );
}
