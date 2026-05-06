-- =============================================================================
-- Fix: recompute_post_score y recompute_comment_score necesitan SECURITY DEFINER
-- El trigger fires como el usuario autenticado que vota, pero la política RLS de
-- posts solo permite UPDATE al autor o moderador → el score nunca se actualiza.
-- Con SECURITY DEFINER las funciones corren como el owner del schema (postgres)
-- que bypasea RLS, permitiendo actualizar el score de cualquier post.
-- =============================================================================

create or replace function public.recompute_post_score(p_post_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set score = coalesce((select sum(value)::int from public.votes where post_id = p_post_id), 0)
  where id = p_post_id;
$$;

create or replace function public.recompute_comment_score(p_comment_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.comments
  set score = coalesce((select sum(value)::int from public.votes where comment_id = p_comment_id), 0)
  where id = p_comment_id;
$$;

-- comments_after_change también actualiza comment_count en posts → mismo problema
create or replace function public.comments_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid bigint;
begin
  pid := coalesce(new.post_id, old.post_id);
  update public.posts
  set comment_count = (
    select count(*) from public.comments
    where post_id = pid and deleted_at is null
  )
  where id = pid;
  return null;
end;
$$;

-- Resincronizar scores de todos los posts con los votos reales
update public.posts p
set score = coalesce((select sum(v.value)::int from public.votes v where v.post_id = p.id), 0)
where p.deleted_at is null;

-- Resincronizar scores de todos los comentarios
update public.comments c
set score = coalesce((select sum(v.value)::int from public.votes v where v.comment_id = c.id), 0)
where c.deleted_at is null;
