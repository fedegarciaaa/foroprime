-- Reemplazar subforos genéricos por los de la plataforma IPF
-- Los posts existentes se eliminan en cascada (FK con ON DELETE CASCADE)

delete from public.subforums
where slug in ('general', 'tecnologia', 'gaming', 'ciencia', 'off-topic');

insert into public.subforums (slug, name, description) values
  ('rotulacion', 'Rotulación', 'Técnicas, materiales, proyectos y recursos sobre rotulación.'),
  ('pantallas',  'Pantallas',  'Serigrafía, emulsiones, marcos y todo sobre pantallas.')
on conflict (slug) do nothing;
