-- Add image_urls to posts and comments
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Create post-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "post-images: lectura pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "post-images: subir autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "post-images: eliminar propio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update get_comment_tree to include image_urls
DROP FUNCTION IF EXISTS public.get_comment_tree(bigint);

CREATE OR REPLACE FUNCTION public.get_comment_tree(p_post_id bigint)
RETURNS TABLE(
  id bigint, parent_id bigint, author_id uuid,
  username citext, display_name text, avatar_url text,
  body_md text, body_html text, path ltree,
  depth smallint, score integer,
  created_at timestamp with time zone, deleted_at timestamp with time zone,
  my_vote smallint, image_urls text[]
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT c.id, c.parent_id, c.author_id, p.username, p.display_name, p.avatar_url,
         c.body_md, c.body_html, c.path, c.depth, c.score, c.created_at, c.deleted_at,
         v.value AS my_vote, c.image_urls
    FROM public.comments c
    JOIN public.profiles p ON p.id = c.author_id
    LEFT JOIN public.votes v ON v.comment_id = c.id AND v.user_id = auth.uid()
   WHERE c.post_id = p_post_id
   ORDER BY c.path;
$$;
