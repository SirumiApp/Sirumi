-- Fase 2 · Paso 7 (parte 1): plata del negocio (docs/specs/03-negocio.md; reglas B1–B8).
-- Operación normal del negocio, tarjetas de crédito, movimientos del negocio y traslados entre cuentas.

-- ─────────────────────────────────────────────────────────────
-- Operación normal y lo que el negocio tenía al arrancar (todo opcional).
-- setup = { ventas_mes, fijos_mes, costo_porcentaje, grupo_actividad, por_cobrar_inicial,
--           equipos, deuda_proveedores, prestamos, arranque_listo }
-- ─────────────────────────────────────────────────────────────
alter table public.businesses add column setup jsonb not null default '{}'::jsonb;

-- "Efectivo" siempre existe: no se puede borrar.
drop policy "Cada quien borra sus cuentas; en el negocio, el dueño" on public.accounts;
create policy "Cada quien borra sus cuentas; en el negocio, el dueño (menos Efectivo)" on public.accounts for delete to authenticated
  using (
    kind <> 'efectivo'
    and ((owner_type = 'personal' and user_id = (select auth.uid())) or (owner_type = 'negocio' and public.es_dueno(business_id)))
  );

-- ─────────────────────────────────────────────────────────────
-- Tarjetas de crédito del negocio (B3)
-- ─────────────────────────────────────────────────────────────
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  credit_limit bigint not null default 0 check (credit_limit >= 0),
  initial_debt bigint not null default 0 check (initial_debt >= 0),
  created_at timestamptz not null default now()
);
create index credit_cards_business_idx on public.credit_cards (business_id);
alter table public.credit_cards enable row level security;
create policy "Los miembros ven las tarjetas" on public.credit_cards for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea tarjetas" on public.credit_cards for insert to authenticated with check (public.es_dueno(business_id));
create policy "El dueño edita tarjetas" on public.credit_cards for update to authenticated using (public.es_dueno(business_id)) with check (public.es_dueno(business_id));
create policy "El dueño borra tarjetas" on public.credit_cards for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.credit_cards from anon;

-- ¿La cuenta / tarjeta es de ese negocio? (para las reglas de seguridad)
create or replace function public.cuenta_del_negocio(cuenta uuid, negocio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts where id = cuenta and business_id = negocio);
$$;
create or replace function public.tarjeta_del_negocio(tarjeta uuid, negocio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.credit_cards where id = tarjeta and business_id = negocio);
$$;
revoke execute on function public.cuenta_del_negocio(uuid, uuid), public.tarjeta_del_negocio(uuid, uuid) from public, anon;
grant execute on function public.cuenta_del_negocio(uuid, uuid), public.tarjeta_del_negocio(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Movimientos del negocio (B1): tipo, cuenta o tarjeta, pagado o pendiente
-- ─────────────────────────────────────────────────────────────
alter table public.movements
  add column account_id uuid references public.accounts (id) on delete restrict,
  add column card_id uuid references public.credit_cards (id) on delete restrict,
  add column paid boolean not null default true;

alter table public.movements drop constraint movements_check;
alter table public.movements add constraint movements_check check (
  (
    owner_type = 'personal' and user_id is not null and business_id is null
    and kind in ('gasto', 'ingreso') and account_id is null and card_id is null and paid
  )
  or (
    owner_type = 'negocio' and business_id is not null
    and kind in ('venta', 'compra', 'fijo', 'variable', 'inversion', 'aporte', 'prestamo', 'retiro', 'impuesto')
    and (
      -- Pagado: en una cuenta, o con tarjeta (solo salidas; nunca una entrada va a una tarjeta).
      (paid and account_id is not null and card_id is null)
      or (paid and card_id is not null and account_id is null and kind in ('compra', 'fijo', 'variable', 'inversion', 'retiro', 'impuesto'))
      -- Pendiente: solo venta, compra, fijo, variable e inversión, y todavía sin cuenta.
      or (not paid and account_id is null and card_id is null and kind in ('venta', 'compra', 'fijo', 'variable', 'inversion'))
    )
  )
);
create index movements_business_fecha_idx on public.movements (business_id, date desc);

create policy "Los miembros ven los movimientos del negocio" on public.movements for select to authenticated
  using (owner_type = 'negocio' and public.es_miembro(business_id));
create policy "El dueño registra movimientos del negocio" on public.movements for insert to authenticated
  with check (
    owner_type = 'negocio' and public.es_dueno(business_id)
    and (account_id is null or public.cuenta_del_negocio(account_id, business_id))
    and (card_id is null or public.tarjeta_del_negocio(card_id, business_id))
  );
create policy "El dueño edita movimientos del negocio" on public.movements for update to authenticated
  using (owner_type = 'negocio' and public.es_dueno(business_id))
  with check (
    owner_type = 'negocio' and public.es_dueno(business_id)
    and (account_id is null or public.cuenta_del_negocio(account_id, business_id))
    and (card_id is null or public.tarjeta_del_negocio(card_id, business_id))
  );
create policy "El dueño borra movimientos del negocio" on public.movements for delete to authenticated
  using (owner_type = 'negocio' and public.es_dueno(business_id));

-- ─────────────────────────────────────────────────────────────
-- Traslados entre cuentas propias y pagos a tarjetas (B2, B3)
-- ─────────────────────────────────────────────────────────────
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  date date not null,
  from_account uuid not null references public.accounts (id) on delete restrict,
  to_account uuid references public.accounts (id) on delete restrict,
  to_card uuid references public.credit_cards (id) on delete restrict,
  amount bigint not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  check ((to_account is not null) <> (to_card is not null)),
  check (to_account is null or to_account <> from_account)
);
create index transfers_business_idx on public.transfers (business_id, date desc);
alter table public.transfers enable row level security;
create policy "Los miembros ven los traslados" on public.transfers for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño registra traslados" on public.transfers for insert to authenticated
  with check (
    public.es_dueno(business_id) and public.cuenta_del_negocio(from_account, business_id)
    and (to_account is null or public.cuenta_del_negocio(to_account, business_id))
    and (to_card is null or public.tarjeta_del_negocio(to_card, business_id))
  );
create policy "El dueño borra traslados" on public.transfers for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.transfers from anon;

-- ─────────────────────────────────────────────────────────────
-- Quitar una cuenta del arranque: sus movimientos y traslados pasan a la cuenta principal (spec 03, §1).
-- ─────────────────────────────────────────────────────────────
create or replace function public.quitar_cuenta_negocio(cuenta uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  negocio uuid;
  principal uuid;
  movidos integer;
begin
  select business_id into negocio from public.accounts where id = cuenta and owner_type = 'negocio' and kind <> 'efectivo';
  if negocio is null or not public.es_dueno(negocio) then
    raise exception 'No se puede quitar esa cuenta';
  end if;
  select id into principal from public.accounts
  where business_id = negocio and id <> cuenta
  order by is_main desc, (kind = 'efectivo') desc, created_at
  limit 1;
  update public.movements set account_id = principal where account_id = cuenta;
  get diagnostics movidos = row_count;
  update public.transfers set from_account = principal where from_account = cuenta;
  update public.transfers set to_account = principal where to_account = cuenta;
  delete from public.transfers where to_account = from_account;
  delete from public.accounts where id = cuenta;
  return movidos;
end;
$$;
revoke execute on function public.quitar_cuenta_negocio(uuid) from public, anon;
grant execute on function public.quitar_cuenta_negocio(uuid) to authenticated;
