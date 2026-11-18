-- Fase 1 · Paso 4: tablas base de Sirumi.
-- profiles, consents, businesses y business_members, todas con Row Level Security.
-- Regla general: cada persona solo ve lo suyo; en un negocio, solo sus miembros según su rol.

-- ─────────────────────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────────────────────
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- profiles: una fila por usuario (id = auth.users.id)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  country text not null default 'CO',
  currency text not null default 'COP',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tocar_updated_at();

alter table public.profiles enable row level security;

create policy "Cada quien ve su perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Cada quien edita su perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- El perfil se crea solo cuando alguien se registra.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ─────────────────────────────────────────────────────────────
-- consents: autorizaciones (Ley 1581). Nunca se edita ni se borra una fila:
-- si la persona retira una autorización se agrega otra con granted = false.
-- ─────────────────────────────────────────────────────────────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('terminos', 'datos', 'ia', 'novedades')),
  granted boolean not null,
  policy_version text not null,
  channel text not null default 'app',
  created_at timestamptz not null default now()
);

create index consents_user_id_idx on public.consents (user_id, kind, created_at desc);

alter table public.consents enable row level security;

create policy "Cada quien ve sus autorizaciones"
  on public.consents for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Cada quien registra sus autorizaciones"
  on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- businesses y business_members
-- ─────────────────────────────────────────────────────────────
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind text,
  tax_regime text,
  nit text,
  city text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.tocar_updated_at();

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'seller')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members (user_id);

-- Funciones de ayuda para las políticas. Son security definer para que leer
-- business_members desde una política no vuelva a aplicar RLS (evita bucles).
create or replace function public.es_miembro(negocio uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = negocio and user_id = (select auth.uid())
  );
$$;

create or replace function public.es_dueno(negocio uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = negocio and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

create policy "Los miembros ven su negocio"
  on public.businesses for select to authenticated
  using (public.es_miembro(id));

create policy "El dueño edita su negocio"
  on public.businesses for update to authenticated
  using (public.es_dueno(id))
  with check (public.es_dueno(id));

create policy "El dueño borra su negocio"
  on public.businesses for delete to authenticated
  using (public.es_dueno(id));

create policy "Los miembros ven quién más está en su negocio"
  on public.business_members for select to authenticated
  using (public.es_miembro(business_id));

create policy "El dueño agrega miembros"
  on public.business_members for insert to authenticated
  with check (public.es_dueno(business_id));

create policy "El dueño cambia roles"
  on public.business_members for update to authenticated
  using (public.es_dueno(business_id))
  with check (public.es_dueno(business_id));

create policy "El dueño quita miembros"
  on public.business_members for delete to authenticated
  using (public.es_dueno(business_id));

-- Crear un negocio y quedar como dueño, en un solo paso.
create or replace function public.crear_negocio(
  nombre text,
  tipo text default null,
  ciudad text default null
)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  negocio public.businesses;
begin
  if usuario is null then
    raise exception 'Necesitas iniciar sesión para crear un negocio';
  end if;

  insert into public.businesses (name, kind, city, created_by)
  values (trim(nombre), tipo, ciudad, usuario)
  returning * into negocio;

  insert into public.business_members (business_id, user_id, role)
  values (negocio.id, usuario, 'owner');

  return negocio;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Permisos: los visitantes sin sesión (anon) no tocan nada de esto.
-- ─────────────────────────────────────────────────────────────
revoke all on public.profiles, public.consents, public.businesses, public.business_members from anon;
revoke update, delete on public.consents from authenticated;

revoke execute on function public.crear_negocio(text, text, text) from public, anon;
grant execute on function public.crear_negocio(text, text, text) to authenticated;
revoke execute on function public.es_miembro(uuid), public.es_dueno(uuid) from public, anon;
grant execute on function public.es_miembro(uuid), public.es_dueno(uuid) to authenticated;
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
