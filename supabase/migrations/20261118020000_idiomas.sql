-- Idiomas: la persona elige español o inglés.
-- Se guarda el idioma en el perfil, los nombres que se crean solos llegan en ese idioma
-- y el tipo de documento se guarda como código (cc, ce, pasaporte…) en lugar del nombre en español.

alter table public.profiles
  add column language text not null default 'es' check (language in ('es', 'en'));

-- Los documentos guardados antes con su nombre en español pasan a código.
update public.profiles set document_type = case document_type
  when 'Cédula de ciudadanía' then 'cc'
  when 'Cédula de extranjería' then 'ce'
  when 'Pasaporte' then 'pasaporte'
  when 'PPT' then 'ppt'
  when 'ID estatal / licencia' then 'id_estatal'
  when 'CURP' then 'curp'
  when 'INE' then 'ine'
  when 'DNI' then 'dni'
  when 'RUT' then 'rut'
  when 'Cédula' then 'cedula'
  when 'CPF' then 'cpf'
  when 'DNI / NIE' then 'dni_nie'
  else document_type
end
where document_type is not null;

-- completar_onboarding ahora también recibe: language, warehouse_name y cash_account_name.
create or replace function public.completar_onboarding(datos jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  uso text := datos ->> 'usage';
  version_politica text := nullif(trim(datos ->> 'policy_version'), '');
  negocio_id uuid;
begin
  if usuario is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  if exists (select 1 from public.profiles where id = usuario and onboarded_at is not null) then
    return;
  end if;

  if coalesce((datos -> 'consents' ->> 'terminos')::boolean, false) is not true
     or coalesce((datos -> 'consents' ->> 'datos')::boolean, false) is not true then
    raise exception 'Faltan las autorizaciones obligatorias';
  end if;

  if version_politica is null then
    raise exception 'Falta la versión de la política';
  end if;

  if uso not in ('personal', 'negocio', 'ambos') then
    raise exception 'Uso no válido';
  end if;

  update public.profiles set
    full_name = nullif(trim(datos ->> 'full_name'), ''),
    phone = nullif(trim(datos ->> 'phone'), ''),
    country = coalesce(nullif(datos ->> 'country', ''), country),
    currency = coalesce(nullif(datos ->> 'currency', ''), currency),
    document_type = nullif(trim(datos ->> 'document_type'), ''),
    document_number = nullif(trim(datos ->> 'document_number'), ''),
    language = coalesce(nullif(datos ->> 'language', ''), language),
    usage = uso,
    preferences = preferences || jsonb_build_object('plan', coalesce(datos -> 'plan', 'null'::jsonb)),
    onboarded_at = now()
  where id = usuario;

  -- Una fila por cada autorización, con versión de la política, fecha y medio (Ley 1581).
  insert into public.consents (user_id, kind, granted, policy_version, channel)
  select usuario, k, coalesce((datos -> 'consents' ->> k)::boolean, false), version_politica, 'app'
  from unnest(array['terminos', 'datos', 'ia', 'novedades']) as k;

  if uso in ('negocio', 'ambos') then
    insert into public.businesses (name, created_by)
    values (coalesce(nullif(trim(datos ->> 'business_name'), ''), 'Mi negocio'), usuario)
    returning id into negocio_id;

    insert into public.business_members (business_id, user_id, role)
    values (negocio_id, usuario, 'owner');

    insert into public.warehouses (business_id, name, is_main)
    values (negocio_id, coalesce(nullif(trim(datos ->> 'warehouse_name'), ''), 'Bodega principal'), true);

    insert into public.accounts (owner_type, business_id, name, kind, is_main)
    values ('negocio', negocio_id, coalesce(nullif(trim(datos ->> 'cash_account_name'), ''), 'Efectivo'), 'efectivo', true);
  end if;
end;
$$;

