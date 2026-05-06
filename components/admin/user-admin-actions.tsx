"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toaster";
import { updateUserRole, toggleBan, adminDeleteUser } from "@/lib/actions/admin";

const ROLES = [
  { value: "user", label: "Usuario" },
  { value: "moderador", label: "Moderador" },
  { value: "admin", label: "Admin" },
];

type Props = {
  userId: string;
  username: string;
  currentRole: string;
  isBanned: boolean;
  canDelete: boolean;
};

export function UserAdminActions({ userId, username, currentRole, isBanned, canDelete }: Props) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", role);
      const result = await updateUserRole(fd);
      if (!result.ok) toast({ title: "Error al cambiar rol", description: result.error, variant: "destructive" });
      else toast({ title: "Rol actualizado" });
    });
  }

  function handleToggleBan() {
    const msg = isBanned
      ? `¿Reactivar la cuenta de @${username}?`
      : `¿Suspender la cuenta de @${username}? No podrá publicar ni comentar.`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const result = await toggleBan(fd);
      if (!result.ok) toast({ title: "Error", description: result.error, variant: "destructive" });
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la cuenta de @${username}? Esta acción es permanente e irreversible.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const result = await adminDeleteUser(fd);
      if (!result.ok) toast({ title: "Error al eliminar", description: result.error, variant: "destructive" });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentRole}
        onChange={handleRoleChange}
        disabled={pending}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleToggleBan}
        disabled={pending}
        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isBanned
            ? "border-border hover:bg-accent"
            : "border-destructive/40 text-destructive hover:bg-destructive/10"
        }`}
      >
        {isBanned ? "Reactivar" : "Suspender"}
      </button>

      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          Eliminar cuenta
        </button>
      ) : null}
    </div>
  );
}
