-- Fix: posts_set_updated_at solo debe dispararse cuando cambia el contenido editorial
-- (título o cuerpo), no cuando cambia score, comment_count, deleted_at, etc.
-- Esto evita que votar un post lo marque como "editado".

drop trigger if exists posts_set_updated_at on public.posts;

create or replace function public.posts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- Solo marcar como editado si cambia el contenido editorial
  if (new.title is distinct from old.title or
      new.body_md is distinct from old.body_md or
      new.body_html is distinct from old.body_html) then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.posts_set_updated_at();

-- Limpiar updated_at incorrecto en posts existentes
-- (fue seteado por actualizaciones de score/votes, no por ediciones reales)
update public.posts
set updated_at = null
where updated_at is not null;
