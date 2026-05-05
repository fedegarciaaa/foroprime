-- =============================================================================
-- ForoPrime — Row Level Security
-- Toda la autorización vive aquí. Sin RLS no hay servicio.
-- =============================================================================

alter table public.profiles  enable row level security;
alter table public.subforums enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.votes     enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: ¿el usuario es moderador o admin?
-- -----------------------------------------------------------------------------
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_moderator(uuid) from public;
grant execute on function public.is_moderator(uuid) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles: select público"
  on public.profiles for select
  using (true);

create policy "profiles: update propio"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    -- el rol no se puede cambiar desde aquí (solo vía función admin)
    and role = (select role from public.profiles where id = (select auth.uid()))
  );

-- INSERT bloqueado: solo via trigger handle_new_user (security definer)

-- -----------------------------------------------------------------------------
-- subforums
-- -----------------------------------------------------------------------------
create policy "subforums: select público"
  on public.subforums for select
  using (true);

create policy "subforums: solo moderadores crean"
  on public.subforums for insert
  with check (public.is_moderator((select auth.uid())));

create policy "subforums: solo moderadores editan"
  on public.subforums for update
  using (public.is_moderator((select auth.uid())))
  with check (public.is_moderator((select auth.uid())));

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
create policy "posts: select público (no borrados)"
  on public.posts for select
  using (
    deleted_at is null
    or author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  );

create policy "posts: autor crea"
  on public.posts for insert
  with check (author_id = (select auth.uid()));

create policy "posts: autor o moderador edita"
  on public.posts for update
  using (
    author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  )
  with check (
    author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  );

create policy "posts: solo moderador hard-delete"
  on public.posts for delete
  using (public.is_moderator((select auth.uid())));

-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------
create policy "comments: select público (no borrados)"
  on public.comments for select
  using (
    deleted_at is null
    or author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  );

create policy "comments: autor crea"
  on public.comments for insert
  with check (author_id = (select auth.uid()));

create policy "comments: autor o moderador edita"
  on public.comments for update
  using (
    author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  )
  with check (
    author_id = (select auth.uid())
    or public.is_moderator((select auth.uid()))
  );

create policy "comments: solo moderador hard-delete"
  on public.comments for delete
  using (public.is_moderator((select auth.uid())));

-- -----------------------------------------------------------------------------
-- votes
-- -----------------------------------------------------------------------------
create policy "votes: select propio"
  on public.votes for select
  using (user_id = (select auth.uid()));

-- Anti auto-voto: el author del target no puede votarse a sí mismo
create policy "votes: insert propio sin auto-voto"
  on public.votes for insert
  with check (
    user_id = (select auth.uid())
    and (
      (post_id is not null
        and (select author_id from public.posts where id = post_id) <> (select auth.uid()))
      or
      (comment_id is not null
        and (select author_id from public.comments where id = comment_id) <> (select auth.uid()))
    )
  );

create policy "votes: update propio"
  on public.votes for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "votes: delete propio"
  on public.votes for delete
  using (user_id = (select auth.uid()));
