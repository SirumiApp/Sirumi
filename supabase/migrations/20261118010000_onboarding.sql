-- Fase 2 · Paso 5: onboarding (docs/specs/01-onboarding.md).
-- Datos nuevos del perfil, bodegas y cuentas, y la función que guarda todo el onboarding de una vez.

-- ─────────────────────────────────────────────────────────────
-- Perfil
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column usage text check (usage in ('personal', 'negocio', 'ambos')),
  add column document_type text,
  add column document_number text,
  add column onboarded_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- warehouses: bodegas del negocio (una marcada como principal)
-- ─────────────────────────────────────────────────────────────
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create index warehouses_business_id_idx on public.warehouses (business_id);
create unique index warehouses_una_principal on public.warehouses (business_id) where is_main;

alter table public.warehouses enable row level security;

create policy "Los miembros ven las bodegas"
  on public.warehouses for select to authenticated
  using (public.es_miembro(business_id));

create policy "El dueño crea bodegas"
  on public.warehouses for insert to authenticated
  with check (public.es_dueno(business_id));

create policy "El dueño edita bodegas"
  on public.warehouses for update to authenticated
  using (public.es_dueno(business_id))
  with check (public.es_dueno(business_id));

create policy "El dueño borra bodegas"
  on public.warehouses for delete to authenticated
  using (public.es_dueno(business_id));

-- ─────────────────────────────────────────────────────────────
-- accounts: cuentas de banco, billeteras y efectivo, de una persona o de un negocio
-- ─────────────────────────────────────────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('personal', 'negocio')),
  user_id uuid references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('banco', 'billetera', 'efectivo')),
  initial_balance bigint not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  -- Una cuenta personal tiene dueño persona; una de negocio, negocio.
  check (
    (owner_type = 'personal' and user_id is not null and business_id is null)
    or (owner_type = 'negocio' and business_id is not null and user_id is null)
  )
);

create index accounts_user_id_idx on public.accounts (user_id);
create index accounts_business_id_idx on public.accounts (business_id);

alter table public.accounts enable row level security;

create policy "Cada quien ve sus cuentas y las de sus negocios"
  on public.accounts for select to authenticated
  using (
    (owner_type = 'personal' and user_id = (select auth.uid()))
    or (owner_type = 'negocio' and public.es_miembro(business_id))
  );

create policy "Cada quien crea sus cuentas; en el negocio, el dueño"
  on public.accounts for insert to authenticated
  with check (
    (owner_type = 'personal' and user_id = (select auth.uid()))
    or (owner_type = 'negocio' and public.es_dueno(business_id))
  );

create policy "Cada quien edita sus cuentas; en el negocio, el dueño"
  on public.accounts for update to authenticated
  using (
    (owner_type = 'personal' and user_id = (select auth.uid()))
    or (owner_type = 'negocio' and public.es_dueno(business_id))
  )
  with check (
    (owner_type = 'personal' and user_id = (select auth.uid()))
    or (owner_type = 'negocio' and public.es_dueno(business_id))
  );

create policy "Cada quien borra sus cuentas; en el negocio, el dueño"
  on public.accounts for delete to authenticated
  using (
    (owner_type = 'personal' and user_id = (select auth.uid()))
    or (owner_type = 'negocio' and public.es_dueno(business_id))
  );

revoke all on public.warehouses, public.accounts from anon;

-- ─────────────────────────────────────────────────────────────
-- completar_onboarding: guarda todo en una sola transacción.
-- Si la persona ya terminó el onboarding, no hace nada (se puede reintentar sin duplicar).
-- datos = {
--   full_name, phone, country, currency, document_type, document_number,
--   usage, business_name, plan (jsonb), policy_version,
--   consents: { terminos, datos, ia, novedades }   (true/false)
-- }
-- ─────────────────────────────────────────────────────────────
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
    values (negocio_id, 'Bodega principal', true);

    insert into public.accounts (owner_type, business_id, name, kind, is_main)
    values ('negocio', negocio_id, 'Efectivo', 'efectivo', true);
  end if;
end;
$$;

revoke execute on function public.completar_onboarding(jsonb) from public, anon;
grant execute on function public.completar_onboarding(jsonb) to authenticated;
