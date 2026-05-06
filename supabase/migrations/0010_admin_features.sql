-- Columna banned_at en profiles
alter table public.profiles add column if not exists banned_at timestamptz;

-- Fix is_moderator para incluir 'moderador' (español) además de 'moderator' (inglés)
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('moderator', 'moderador', 'admin')
  );
$$;

-- Admin puede actualizar cualquier perfil (cambiar rol, banear)
create policy "profiles: admin puede actualizar cualquier"
  on public.profiles for update
  using (public.is_moderator((select auth.uid())));
