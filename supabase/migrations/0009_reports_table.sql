-- Tabla de denuncias
create table if not exists public.reports (
  id            bigserial primary key,
  post_id       bigint not null references public.posts(id) on delete cascade,
  reporter_id   uuid   not null references public.profiles(id) on delete cascade,
  reason        text   not null,
  comment       text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id)
);

-- Evitar denuncias duplicadas del mismo usuario sobre el mismo post
create unique index if not exists reports_post_reporter_uidx
  on public.reports (post_id, reporter_id);

-- RLS
alter table public.reports enable row level security;

-- Solo admins y moderadores pueden leer las denuncias
create policy "admins can read reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderador')
    )
  );

-- Usuarios autenticados pueden insertar una denuncia
create policy "authenticated users can report"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Solo admins y moderadores pueden actualizar (resolver) denuncias
create policy "admins can update reports"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderador')
    )
  );

-- Otorgar rol admin a fede99garcia (el usuario administrador)
update public.profiles
set role = 'admin'
where username = 'fede99garcia';
