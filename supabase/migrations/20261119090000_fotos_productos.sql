-- Fase 2 · Paso 8 (parte b): fotos de los productos (spec 04, §3: se reducen a 240 px).
-- Bucket privado: la ruta es "<negocio>/<producto>.jpg". Solo los miembros del negocio las ven; solo el dueño las cambia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ¿La carpeta (primer pedazo de la ruta) es un negocio de esta persona? Si la ruta no es válida, no.
create or replace function public.negocio_de_ruta(ruta text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (split_part(ruta, '/', 1))::uuid;
exception when others then
  return null;
end;
$$;

create policy "Los miembros ven las fotos de sus productos" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.es_miembro(public.negocio_de_ruta(name)));
create policy "El dueño sube fotos de sus productos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.es_dueno(public.negocio_de_ruta(name)));
create policy "El dueño cambia fotos de sus productos" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.es_dueno(public.negocio_de_ruta(name)))
  with check (bucket_id = 'product-photos' and public.es_dueno(public.negocio_de_ruta(name)));
create policy "El dueño borra fotos de sus productos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.es_dueno(public.negocio_de_ruta(name)));
