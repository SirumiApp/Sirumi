-- Fase 2 · Paso 6 (parte 1): categorías y movimientos personales (docs/specs/02-personal.md).
-- Montos en pesos como enteros (bigint). Fechas sin hora (date).

-- ─────────────────────────────────────────────────────────────
-- categories: categorías de cada persona.
-- Las iniciales tienen `clave` (shopping, comida…) y su nombre sale de los textos de la app en el idioma elegido;
-- las que crea la persona tienen `name`. Si una inicial se renombra, `name` manda.
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text,
  name text,
  emoji text not null,
  color text not null,
  kind text not null default 'gasto' check (kind in ('gasto', 'ingreso')),
  hidden boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (key is not null or length(trim(coalesce(name, ''))) > 0)
);

create unique index categories_una_por_clave on public.categories (user_id, key) where key is not null;
create index categories_user_id_idx on public.categories (user_id, position);

alter table public.categories enable row level security;

create policy "Cada quien ve sus categorías" on public.categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Cada quien crea sus categorías" on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Cada quien edita sus categorías" on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Cada quien borra sus categorías" on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

-- Crea las categorías iniciales si la persona todavía no tiene ninguna. Se puede llamar muchas veces.
create or replace function public.crear_categorias_iniciales()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
begin
  if usuario is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  if exists (select 1 from public.categories where user_id = usuario) then
    return;
  end if;
  insert into public.categories (user_id, key, emoji, color, kind, position) values
    (usuario, 'shopping', 'bolsas-de-compras', 'azul', 'gasto', 1),
    (usuario, 'comida', 'hamburguesa', 'naranja', 'gasto', 2),
    (usuario, 'transporte', 'taxi', 'amarillo', 'gasto', 3),
    (usuario, 'mercado', 'aguacate', 'verde', 'gasto', 4),
    (usuario, 'salidas', 'bola-disco', 'morado', 'gasto', 5),
    (usuario, 'mascotas', 'perro', 'cafe', 'gasto', 6),
    (usuario, 'ingreso', 'bolsa-de-dinero', 'menta', 'ingreso', 7);
end;
$$;

revoke execute on function public.crear_categorias_iniciales() from public, anon;
grant execute on function public.crear_categorias_iniciales() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- movements: movimientos. Por ahora solo personales (gasto o ingreso);
-- el módulo de negocio agregará sus tipos y reglas.
-- ─────────────────────────────────────────────────────────────
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null default 'personal' check (owner_type in ('personal', 'negocio')),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  date date not null,
  kind text not null,
  amount bigint not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  description text,
  source text not null default 'manual' check (source in ('manual', 'pos', 'importacion', 'extracto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    owner_type = 'personal' and user_id is not null and business_id is null and kind in ('gasto', 'ingreso')
  )
);

create index movements_user_fecha_idx on public.movements (user_id, date desc);

create trigger movements_updated_at
  before update on public.movements
  for each row execute function public.tocar_updated_at();

alter table public.movements enable row level security;

create policy "Cada quien ve sus movimientos personales" on public.movements for select to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()));
create policy "Cada quien registra sus movimientos personales" on public.movements for insert to authenticated
  with check (
    owner_type = 'personal' and user_id = (select auth.uid())
    -- La categoría también tiene que ser suya.
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
  );
create policy "Cada quien edita sus movimientos personales" on public.movements for update to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()))
  with check (
    owner_type = 'personal' and user_id = (select auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
  );
create policy "Cada quien borra sus movimientos personales" on public.movements for delete to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()));

revoke all on public.categories, public.movements from anon;
