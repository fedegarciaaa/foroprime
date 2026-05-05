-- =============================================================================
-- ForoPrime — seed inicial de subforos
-- =============================================================================
insert into public.subforums (slug, name, description) values
  ('general',    'General',     'Conversaciones de cualquier tema. El espacio común de la comunidad.'),
  ('tecnologia', 'Tecnología',  'Software, hardware, gadgets, IA y todo lo que enchufa.'),
  ('gaming',     'Gaming',      'Videojuegos, estrenos, gameplay, hardware y debates de la industria.'),
  ('ciencia',    'Ciencia',     'Descubrimientos, papers, divulgación y discusión científica.'),
  ('off-topic',  'Off-Topic',   'Temas variados que no encajan en otros subforos.')
on conflict (slug) do nothing;
