-- =============================================================================
-- Fix: search_posts headline incluye el título como fuente de texto
-- Antes: ts_headline solo usaba body_md → sin resaltado cuando el match es en el título
-- Ahora: usa title || '. ' || body_md → resalta matches tanto en título como en cuerpo
-- =============================================================================

create or replace function public.search_posts(
  q text,
  p_subforum text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id           bigint,
  subforum_id  bigint,
  subforum_slug citext,
  subforum_name text,
  author_id    uuid,
  username     citext,
  title        text,
  slug         text,
  headline     text,
  score        int,
  comment_count int,
  created_at   timestamptz,
  rank         real
)
language sql
security invoker
stable
set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('spanish', q) as tsq
  )
  select po.id, po.subforum_id, sf.slug as subforum_slug, sf.name as subforum_name,
         po.author_id, pr.username, po.title, po.slug,
         ts_headline('spanish',
           coalesce(po.title, '') || '. ' || coalesce(po.body_md, ''),
           query.tsq,
           'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=20, MinWords=5') as headline,
         po.score, po.comment_count, po.created_at,
         ts_rank(po.search_vector, query.tsq) as rank
    from public.posts po
    join public.subforums sf on sf.id = po.subforum_id
    join public.profiles pr on pr.id = po.author_id
    cross join query
   where po.deleted_at is null
     and po.search_vector @@ query.tsq
     and (p_subforum is null or sf.slug = p_subforum)
   order by rank desc, po.created_at desc
   limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;
