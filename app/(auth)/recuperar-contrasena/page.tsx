import Link from "next/link";
import { Flame } from "lucide-react";
import { ResetPasswordForm } from "./form";

export const metadata = { title: "Recuperar contraseña" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Flame className="h-5 w-5 text-primary" /> ForoPrime
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <ResetPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Recuerdas tu contraseña?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
