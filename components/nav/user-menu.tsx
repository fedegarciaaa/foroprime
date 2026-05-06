"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, PenSquare, ShieldAlert, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role?: string;
};

export function UserMenu({ username, displayName, avatarUrl, role }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = (displayName ?? username ?? "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <Avatar className="h-8 w-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium">{displayName ?? username}</div>
          {username ? <div className="text-xs text-muted-foreground">@{username}</div> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {username ? (
          <DropdownMenuItem asChild>
            <Link href={`/u/${username}`}>
              <UserIcon className="h-4 w-4" /> Mi perfil
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/crear">
            <PenSquare className="h-4 w-4" /> Crear post
          </Link>
        </DropdownMenuItem>
        {role && ["admin", "moderador", "moderator"].includes(role) ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/denuncias">
                <ShieldAlert className="h-4 w-4" /> Panel de denuncias
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/usuarios">
                <Users className="h-4 w-4" /> Panel de usuarios
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
