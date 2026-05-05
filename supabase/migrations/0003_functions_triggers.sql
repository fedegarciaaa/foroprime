-- =============================================================================
-- ForoPrime — funciones y triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- handle_new_user: crea profile al registrar un auth.users
-- Genera username único desde metadata OAuth o email, evitando colisiones.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate     text;
  attempt       int := 0;
  max_attempts  int := 20;
begin
  -- Derivar base: metadata OAuth (preferred_username, name, full_name) o local-part del email
  base_username := lower(coalesce(
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'user_name',
    split_part(new.raw_user_meta_data->>'name', ' ', 1),
    split_part(new.email, '@', 1),
    'user'
  ));
  -- Sanear: solo [a-z0-9_], longitud 3-20
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then
    base_username := 'user' || substring(replace(new.id::text, '-', '') from 1 for 6);
  end if;
  base_username := substring(base_username from 1 for 16);

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) and attempt < max_attempts loop
    attempt := attempt + 1;
    candidate := substring(base_username from 1 for 16) || lpad(attempt::text, 2, '0');
  end loop;

  if exists (select 1 from public.profiles where username = candidate) then
    candidate := 'user' || substring(replace(new.id::text, '-', '') from 1 for 12);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', candidate),
    new.raw_user_meta_data->>'avatar_url'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- recompute_post_score / recompute_comment_score
-- -----------------------------------------------------------------------------
create or replace function public.recompute_post_score(p_post_id bigint)
returns void language sql as $$
  update public.posts
  set score = coalesce((select sum(value)::int from public.votes where post_id = p_post_id), 0)
  where id = p_post_id;
$$;

create or replace function public.recompute_comment_score(p_comment_id bigint)
returns void language sql as $$
  update public.comments
  set score = coalesce((select sum(value)::int from public.votes where comment_id = p_comment_id), 0)
  where id = p_comment_id;
$$;

create or replace function public.votes_after_change()
returns trigger language plpgsql as $$
declare
  target_post bigint;
  target_comment bigint;
begin
  if tg_op = 'DELETE' then
    target_post := old.post_id;
    target_comment := old.comment_id;
  else
    target_post := new.post_id;
    target_comment := new.comment_id;
    -- en update de cambio de target (no debería pasar) recalcular ambos
    if tg_op = 'UPDATE' and old.post_id is distinct from new.post_id then
      perform public.recompute_post_score(old.post_id);
    end if;
    if tg_op = 'UPDATE' and old.comment_id is distinct from new.comment_id then
      perform public.recompute_comment_score(old.comment_id);
    end if;
  end if;
  if target_post is not null then
    perform public.recompute_post_score(target_post);
  end if;
  if target_comment is not null then
    perform public.recompute_comment_score(target_comment);
  end if;
  return null;
end;
$$;

drop trigger if exists votes_after_ins on public.votes;
drop trigger if exists votes_after_upd on public.votes;
drop trigger if exists votes_after_del on public.votes;

create trigger votes_after_ins after insert on public.votes
  for each row execute function public.votes_after_change();
create trigger votes_after_upd after update on public.votes
  for each row execute function public.votes_after_change();
create trigger votes_after_del after delete on public.votes
  for each row execute function public.votes_after_change();

-- -----------------------------------------------------------------------------
-- comment_count denormalizado en posts
-- -----------------------------------------------------------------------------
create or replace function public.comments_after_change()
returns trigger language plpgsql as $$
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

drop trigger if exists comments_after_ins on public.comments;
drop trigger if exists comments_after_upd on public.comments;
drop trigger if exists comments_after_del on public.comments;

create trigger comments_after_ins after insert on public.comments
  for each row execute function public.comments_after_change();
create trigger comments_after_upd after update of deleted_at on public.comments
  for each row execute function public.comments_after_change();
create trigger comments_after_del after delete on public.comments
  for each row execute function public.comments_after_change();

-- -----------------------------------------------------------------------------
-- updated_at automático en posts/comments/profiles
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RPC: vote_post — upsert atómico (toggle si igual valor, update si distinto)
-- =============================================================================
create or replace function public.vote_post(p_post_id bigint, p_value smallint)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_value smallint;
  new_score int;
begin
  if p_value not in (-1, 0, 1) then
    raise exception 'invalid vote value';
  end if;

  select value into current_value from public.votes
   where user_id = auth.uid() and post_id = p_post_id;

  if current_value is null and p_value <> 0 then
    insert into public.votes (user_id, post_id, value) values (auth.uid(), p_post_id, p_value);
  elsif current_value is not null and p_value = 0 then
    delete from public.votes where user_id = auth.uid() and post_id = p_post_id;
  elsif current_value is not null and current_value <> p_value then
    update public.votes set value = p_value, created_at = now()
     where user_id = auth.uid() and post_id = p_post_id;
  end if;

  select score into new_score from public.posts where id = p_post_id;
  return coalesce(new_score, 0);
end;
$$;

create or replace function public.vote_comment(p_comment_id bigint, p_value smallint)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_value smallint;
  new_score int;
begin
  if p_value not in (-1, 0, 1) then
    raise exception 'invalid vote value';
  end if;

  select value into current_value from public.votes
   where user_id = auth.uid() and comment_id = p_comment_id;

  if current_value is null and p_value <> 0 then
    insert into public.votes (user_id, comment_id, value) values (auth.uid(), p_comment_id, p_value);
  elsif current_value is not null and p_value = 0 then
    delete from public.votes where user_id = auth.uid() and comment_id = p_comment_id;
  elsif current_value is not null and current_value <> p_value then
    update public.votes set value = p_value, created_at = now()
     where user_id = auth.uid() and comment_id = p_comment_id;
  end if;

  select score into new_score from public.comments where id = p_comment_id;
  return coalesce(new_score, 0);
end;
$$;

-- =============================================================================
-- RPC: get_comment_tree — árbol ordenado por path
-- =============================================================================
create or replace function public.get_comment_tree(p_post_id bigint)
returns table (
  id          bigint,
  parent_id   bigint,
  author_id   uuid,
  username    citext,
  display_name text,
  avatar_url  text,
  body_md     text,
  body_html   text,
  path        ltree,
  depth       smallint,
  score       int,
  created_at  timestamptz,
  deleted_at  timestamptz,
  my_vote     smallint
)
language sql
security invoker
stable
set search_path = public
as $$
  select c.id, c.parent_id, c.author_id, p.username, p.display_name, p.avatar_url,
         c.body_md, c.body_html, c.path, c.depth, c.score, c.created_at, c.deleted_at,
         v.value as my_vote
    from public.comments c
    join public.profiles p on p.id = c.author_id
    left join public.votes v on v.comment_id = c.id and v.user_id = auth.uid()
   where c.post_id = p_post_id
   order by c.path;
$$;

-- =============================================================================
-- RPC: search_posts — FTS con highlight
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
         ts_headline('spanish', po.body_md, query.tsq,
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

grant execute on function public.vote_post(bigint, smallint) to authenticated;
grant execute on function public.vote_comment(bigint, smallint) to authenticated;
grant execute on function public.get_comment_tree(bigint) to authenticated, anon;
grant execute on function public.search_posts(text, text, int, int) to authenticated, anon;
