-- =============================================================================
-- ForoPrime — esquema inicial
-- Postgres 17 + Supabase
-- =============================================================================

create extension if not exists citext;
create extension if not exists ltree;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- profiles: 1:1 con auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext unique not null
                  check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name  text,
  bio           text check (char_length(bio) <= 280),
  avatar_url    text,
  role          text not null default 'user'
                  check (role in ('user', 'moderator', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- subforums
-- -----------------------------------------------------------------------------
create table public.subforums (
  id          bigint generated always as identity primary key,
  slug        citext unique not null
                check (slug ~ '^[a-z0-9-]{3,30}$'),
  name        text not null check (char_length(name) between 2 and 50),
  description text check (char_length(description) <= 500),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
create table public.posts (
  id            bigint generated always as identity primary key,
  subforum_id   bigint not null references public.subforums(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 200),
  slug          text not null,
  body_md       text not null check (char_length(body_md) <= 20000),
  body_html     text not null,
  score         int  not null default 0,
  comment_count int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  deleted_at    timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(body_md, '')), 'B')
  ) stored
);

create index posts_search_idx          on public.posts using gin (search_vector);
create index posts_subforum_created_idx on public.posts (subforum_id, created_at desc) where deleted_at is null;
create index posts_score_idx           on public.posts (score desc, created_at desc) where deleted_at is null;
create index posts_author_idx          on public.posts (author_id, created_at desc) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- comments — adjacency list + materialized path (ltree)
-- -----------------------------------------------------------------------------
create table public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts(id) on delete cascade,
  parent_id   bigint references public.comments(id) on delete cascade,
  author_id   uuid   not null references public.profiles(id) on delete cascade,
  body_md     text   not null check (char_length(body_md) between 1 and 5000),
  body_html   text   not null,
  path        ltree  not null,
  depth       smallint not null default 0 check (depth between 0 and 8),
  score       int    not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  deleted_at  timestamptz
);

create index comments_path_idx     on public.comments using gist (path);
create index comments_post_idx     on public.comments (post_id, created_at);
create index comments_author_idx   on public.comments (author_id, created_at desc) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- votes — un voto por usuario por target (post xor comment)
-- -----------------------------------------------------------------------------
create table public.votes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    bigint references public.posts(id)    on delete cascade,
  comment_id bigint references public.comments(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  -- Exactamente uno de post_id / comment_id debe ser no nulo
  constraint votes_target_xor check ((post_id is not null) <> (comment_id is not null))
);

-- Índices únicos parciales: garantizan un voto por (user, target)
create unique index votes_user_post_uidx
  on public.votes (user_id, post_id)
  where post_id is not null;

create unique index votes_user_comment_uidx
  on public.votes (user_id, comment_id)
  where comment_id is not null;

create index votes_post_idx    on public.votes (post_id)    where post_id is not null;
create index votes_comment_idx on public.votes (comment_id) where comment_id is not null;
