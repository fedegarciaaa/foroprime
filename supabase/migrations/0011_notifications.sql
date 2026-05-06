-- ============================================================
-- Preferencias de notificación por usuario
-- ============================================================
create table if not exists public.notification_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  email_enabled        boolean not null default true,
  email_on_post_comment  boolean not null default true,  -- alguien comenta en mi post
  email_on_comment_reply boolean not null default true,  -- alguien responde a mi comentario
  email_on_post_deleted  boolean not null default true,  -- mi post es eliminado
  email_on_account_status boolean not null default true, -- cuenta suspendida/reactivada
  updated_at           timestamptz default now()
);

alter table public.notification_preferences enable row level security;

create policy "notif_prefs: lectura propia"
  on public.notification_preferences for select
  using (user_id = (select auth.uid()));

create policy "notif_prefs: escritura propia"
  on public.notification_preferences for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Suscripciones a posts
-- ============================================================
create table if not exists public.post_subscriptions (
  user_id    uuid    references public.profiles(id) on delete cascade,
  post_id    bigint  references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table public.post_subscriptions enable row level security;

create policy "post_subs: lectura propia"
  on public.post_subscriptions for select
  using (user_id = (select auth.uid()));

create policy "post_subs: insertar propia"
  on public.post_subscriptions for insert
  with check (user_id = (select auth.uid()));

create policy "post_subs: eliminar propia"
  on public.post_subscriptions for delete
  using (user_id = (select auth.uid()));
