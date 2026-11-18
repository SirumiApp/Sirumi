-- Fase 2 · Paso 6 (parte 3): Plan personal — metas, deudas, activos y evolución del patrimonio
-- (docs/specs/02-personal.md, pantalla 5; reglas A5, A6 y A7). Montos en pesos enteros.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  emoji text not null default 'diana',
  target bigint not null check (target > 0),
  saved bigint not null default 0 check (saved >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (saved <= target)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  emoji text not null default 'tarjeta',
  balance bigint not null check (balance >= 0),
  -- Tasa efectiva anual en porcentaje (28 = 28% EA).
  rate_ea numeric(6, 2) not null default 0 check (rate_ea >= 0 and rate_ea <= 300),
  min_payment bigint not null default 0 check (min_payment >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  emoji text not null default 'cajero',
  value bigint not null check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una foto del patrimonio por mes (la última del mes vale).
create table public.net_worth_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  assets_total bigint not null,
  goals_total bigint not null,
  debts_total bigint not null,
  net bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

create trigger goals_updated_at before update on public.goals for each row execute function public.tocar_updated_at();
create trigger debts_updated_at before update on public.debts for each row execute function public.tocar_updated_at();
create trigger assets_updated_at before update on public.assets for each row execute function public.tocar_updated_at();

create index goals_user_idx on public.goals (user_id);
create index debts_user_idx on public.debts (user_id);
create index assets_user_idx on public.assets (user_id);

do $$
declare
  tabla text;
begin
  foreach tabla in array array['goals', 'debts', 'assets', 'net_worth_snapshots'] loop
    execute format('alter table public.%I enable row level security', tabla);
    execute format('create policy "Cada quien ve lo suyo" on public.%I for select to authenticated using (user_id = (select auth.uid()))', tabla);
    execute format('create policy "Cada quien crea lo suyo" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', tabla);
    execute format('create policy "Cada quien edita lo suyo" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tabla);
    execute format('create policy "Cada quien borra lo suyo" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', tabla);
    execute format('revoke all on public.%I from anon', tabla);
  end loop;
end $$;

-- A5 · Abonar a una meta: nunca supera el objetivo. Devuelve lo ahorrado.
create or replace function public.abonar_meta(meta uuid, monto bigint)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  update public.goals set saved = least(target, saved + greatest(monto, 0))
  where id = meta and user_id = (select auth.uid())
  returning saved;
$$;

-- A6 · Abonar a una deuda: nunca deja el saldo negativo. Devuelve el saldo.
create or replace function public.abonar_deuda(deuda uuid, monto bigint)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  update public.debts set balance = greatest(0, balance - greatest(monto, 0))
  where id = deuda and user_id = (select auth.uid())
  returning balance;
$$;

-- A7 · Guarda (o actualiza) la foto del patrimonio del mes actual en hora de Colombia, con los datos de ahora.
create or replace function public.guardar_foto_patrimonio()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  a bigint;
  g bigint;
  d bigint;
begin
  if usuario is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  select coalesce(sum(value), 0) into a from public.assets where user_id = usuario;
  select coalesce(sum(saved), 0) into g from public.goals where user_id = usuario;
  select coalesce(sum(balance), 0) into d from public.debts where user_id = usuario;
  insert into public.net_worth_snapshots (user_id, month, assets_total, goals_total, debts_total, net, updated_at)
  values (usuario, date_trunc('month', (now() at time zone 'America/Bogota'))::date, a, g, d, a + g - d, now())
  on conflict (user_id, month) do update
    set assets_total = excluded.assets_total, goals_total = excluded.goals_total,
        debts_total = excluded.debts_total, net = excluded.net, updated_at = now();
end;
$$;

revoke execute on function public.abonar_meta(uuid, bigint), public.abonar_deuda(uuid, bigint), public.guardar_foto_patrimonio() from public, anon;
grant execute on function public.abonar_meta(uuid, bigint), public.abonar_deuda(uuid, bigint), public.guardar_foto_patrimonio() to authenticated;
