-- Fase 2 · Paso 9: Sirumi POS (docs/specs/05-pos-clientes.md · reglas D1–D5).
-- Cobrar y devolver son funciones de Postgres: todo pasa en una sola transacción o no pasa nada.

-- ─────────────────────────────────────────────────────────────
-- Formas de pago que crea la persona ("Datáfono Bold" → su cuenta). D3.
-- ─────────────────────────────────────────────────────────────
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index payment_methods_business_idx on public.payment_methods (business_id);
alter table public.payment_methods enable row level security;
create policy "Los miembros ven las formas de pago" on public.payment_methods for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea formas de pago" on public.payment_methods for insert to authenticated
  with check (public.es_dueno(business_id) and public.cuenta_del_negocio(account_id, business_id));
create policy "El dueño borra formas de pago" on public.payment_methods for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.payment_methods from anon;

-- ─────────────────────────────────────────────────────────────
-- Ventas y sus líneas (D4). Solo lectura desde la app: se crean y devuelven con funciones.
-- ─────────────────────────────────────────────────────────────
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  number integer not null,
  date date not null,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  seller_id uuid default auth.uid() references auth.users (id) on delete set null,
  subtotal bigint not null check (subtotal >= 0),
  discount bigint not null default 0 check (discount >= 0),
  total bigint not null check (total >= 0),
  -- [{ "nombre": "Efectivo", "cuenta": uuid | null, "monto": 25000 }] — cuenta null = fiado.
  payments jsonb not null default '[]'::jsonb,
  received bigint,
  change bigint,
  status text not null default 'pagada' check (status in ('pagada', 'fiada', 'devuelta')),
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index sales_business_idx on public.sales (business_id, created_at desc);
alter table public.sales enable row level security;
create policy "Los miembros ven las ventas" on public.sales for select to authenticated using (public.es_miembro(business_id));
revoke all on public.sales from anon;
revoke insert, update, delete on public.sales from authenticated;

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  name text not null,
  unit_price bigint not null check (unit_price >= 0),
  -- Costo por unidad al momento de vender (B5). Null en una venta libre (se usa el % de costo del negocio).
  unit_cost bigint check (unit_cost is null or unit_cost >= 0),
  quantity integer not null check (quantity > 0),
  line_total bigint not null check (line_total >= 0)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
alter table public.sale_items enable row level security;
create policy "Los miembros ven las líneas de venta" on public.sale_items for select to authenticated using (public.es_miembro(business_id));
revoke all on public.sale_items from anon;
revoke insert, update, delete on public.sale_items from authenticated;

alter table public.movements add column sale_id uuid references public.sales (id) on delete set null;
create index movements_sale_idx on public.movements (sale_id) where sale_id is not null;

-- ─────────────────────────────────────────────────────────────
-- Cobrar (D1–D5). datos = {
--   business_id, date, warehouse_id, contact_id, discount, received,
--   items: [{ variant_id | null, name, unit_price, quantity }],
--   payments: [{ nombre, cuenta | null, monto }]   (cuenta null = fiado; las partes suman el total)
-- } → { id, number }
-- ─────────────────────────────────────────────────────────────
create or replace function public.cobrar_venta(datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid := (datos ->> 'business_id')::uuid;
  bodega uuid := nullif(datos ->> 'warehouse_id', '')::uuid;
  cliente uuid := nullif(datos ->> 'contact_id', '')::uuid;
  fecha date := coalesce((datos ->> 'date')::date, current_date);
  venta uuid;
  numero integer;
  linea jsonb;
  pago jsonb;
  variante uuid;
  cantidad integer;
  precio bigint;
  costo bigint;
  subtotal bigint := 0;
  descuento bigint := greatest(0, coalesce((datos ->> 'discount')::bigint, 0));
  total bigint;
  suma_pagos bigint := 0;
  fiado boolean := false;
  partes integer := 0;
begin
  if negocio is null or not public.es_dueno(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if bodega is not null and not exists (select 1 from public.warehouses where id = bodega and business_id = negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  if cliente is not null and not public.contacto_del_negocio(cliente, negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(datos -> 'items', '[]'::jsonb)) = 0 then raise exception 'carritoVacio' using errcode = 'P0001'; end if;

  -- Número consecutivo: se bloquea el negocio para que dos cobros al tiempo no repitan número.
  perform 1 from public.businesses where id = negocio for update;
  select coalesce(max(number), 0) + 1 into numero from public.sales where business_id = negocio;

  for linea in select * from jsonb_array_elements(datos -> 'items') loop
    subtotal := subtotal + (linea ->> 'unit_price')::bigint * (linea ->> 'quantity')::integer;
  end loop;
  descuento := least(descuento, subtotal);
  total := subtotal - descuento;

  for pago in select * from jsonb_array_elements(coalesce(datos -> 'payments', '[]'::jsonb)) loop
    partes := partes + 1;
    suma_pagos := suma_pagos + (pago ->> 'monto')::bigint;
    if nullif(pago ->> 'cuenta', '') is null then
      fiado := true;
    elsif not public.cuenta_del_negocio((pago ->> 'cuenta')::uuid, negocio) then
      raise exception 'sinPermiso' using errcode = '42501';
    end if;
  end loop;
  if partes = 0 or partes > 2 or suma_pagos <> total then raise exception 'pagosNoCuadran' using errcode = 'P0001'; end if;
  if fiado and cliente is null then raise exception 'fiadoSinCliente' using errcode = 'P0001'; end if;
  if fiado and partes > 1 then raise exception 'fiadoNoDivide' using errcode = 'P0001'; end if;

  insert into public.sales (business_id, number, date, warehouse_id, contact_id, subtotal, discount, total, payments, received, change, status)
  values (
    negocio, numero, fecha, bodega, cliente, subtotal, descuento, total, datos -> 'payments',
    nullif(datos ->> 'received', '')::bigint, greatest(0, coalesce(nullif(datos ->> 'received', '')::bigint, total) - total),
    case when fiado then 'fiada' else 'pagada' end
  ) returning id into venta;

  for linea in select * from jsonb_array_elements(datos -> 'items') loop
    variante := nullif(linea ->> 'variant_id', '')::uuid;
    cantidad := (linea ->> 'quantity')::integer;
    precio := (linea ->> 'unit_price')::bigint;
    if cantidad is null or cantidad <= 0 or precio is null or precio < 0 then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
    costo := null;
    if variante is not null then
      select p.cost into costo from public.product_variants v join public.products p on p.id = v.product_id
        where v.id = variante and v.business_id = negocio;
      if not found then raise exception 'sinPermiso' using errcode = '42501'; end if;
      if bodega is null then raise exception 'sinBodega' using errcode = 'P0001'; end if;
      -- D2: sale de la bodega de venta; nunca deja el stock negativo.
      perform public._cambiar_stock(negocio, variante, bodega, -cantidad);
      insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
      values (negocio, variante, bodega, 'venta', -cantidad, venta);
    end if;
    insert into public.sale_items (sale_id, business_id, variant_id, name, unit_price, unit_cost, quantity, line_total)
    values (venta, negocio, variante, coalesce(nullif(trim(linea ->> 'name'), ''), '—'), precio, costo, cantidad, precio * cantidad);
  end loop;

  -- Un movimiento de venta por cada parte del pago (D3). Fiado: pendiente, sin cuenta.
  for pago in select * from jsonb_array_elements(datos -> 'payments') loop
    if (pago ->> 'monto')::bigint > 0 then
      insert into public.movements (owner_type, business_id, date, kind, amount, paid, account_id, contact_id, sale_id, description, source)
      values (
        'negocio', negocio, fecha, 'venta', (pago ->> 'monto')::bigint, nullif(pago ->> 'cuenta', '') is not null,
        nullif(pago ->> 'cuenta', '')::uuid, cliente, venta, 'POS-' || lpad(numero::text, 4, '0'), 'pos'
      );
    end if;
  end loop;

  return jsonb_build_object('id', venta, 'number', numero);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Devolver (D4): borra la plata de la venta, devuelve el stock a la misma bodega y la marca devuelta.
-- ─────────────────────────────────────────────────────────────
create or replace function public.devolver_venta(venta uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.sales;
  linea public.sale_items;
begin
  select * into v from public.sales where id = venta for update;
  if v.id is null or not public.es_dueno(v.business_id) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if v.status = 'devuelta' then raise exception 'yaDevuelta' using errcode = 'P0001'; end if;
  for linea in select * from public.sale_items where sale_id = venta and variant_id is not null loop
    if v.warehouse_id is not null then
      perform public._cambiar_stock(v.business_id, linea.variant_id, v.warehouse_id, linea.quantity);
      insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
      values (v.business_id, linea.variant_id, v.warehouse_id, 'devolucion', linea.quantity, venta);
    end if;
  end loop;
  delete from public.movements where sale_id = venta;
  update public.sales set status = 'devuelta', returned_at = now() where id = venta;
end;
$$;

revoke execute on function public.cobrar_venta(jsonb), public.devolver_venta(uuid) from public, anon;
grant execute on function public.cobrar_venta(jsonb), public.devolver_venta(uuid) to authenticated;
