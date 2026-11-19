-- Vendedores con código (pedido de Nicolás, nov 2026; antes en la v2). Referencia: Shopify POS (staff con PIN).
-- El dueño crea un código de 6 letras; la persona entra a Sirumi con ese código y solo ve el POS de ese negocio:
-- vende, registra clientes y ve SUS ventas. No ve saldos, movimientos, resultados ni las ventas de otros.

-- ─────────────────────────────────────────────────────────────
-- Miembros: nombre visible y bodega asignada (desde donde vende).
-- ─────────────────────────────────────────────────────────────
alter table public.business_members
  add column display_name text,
  add column warehouse_id uuid references public.warehouses (id) on delete set null;

alter table public.profiles drop constraint if exists profiles_usage_check;
alter table public.profiles add constraint profiles_usage_check check (usage in ('personal', 'negocio', 'ambos', 'vendedor'));

-- ─────────────────────────────────────────────────────────────
-- Invitaciones (códigos de 6 letras, sin letras que se confunden; duran 7 días y sirven una vez).
-- ─────────────────────────────────────────────────────────────
create table public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  warehouse_id uuid references public.warehouses (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index business_invites_business_idx on public.business_invites (business_id);
alter table public.business_invites enable row level security;
create policy "El dueño ve sus invitaciones" on public.business_invites for select to authenticated using (public.es_dueno(business_id));
create policy "El dueño borra sus invitaciones" on public.business_invites for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.business_invites from anon;
revoke insert, update on public.business_invites from authenticated;

create or replace function public.crear_invitacion(negocio uuid, nombre text, bodega uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  codigo text;
begin
  if not public.es_dueno(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if bodega is not null and not exists (select 1 from public.warehouses where id = bodega and business_id = negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  if nullif(trim(nombre), '') is null then raise exception 'vendedorSinNombre' using errcode = 'P0001'; end if;
  loop
    codigo := '';
    for i in 1..6 loop
      codigo := codigo || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.business_invites where code = codigo);
  end loop;
  insert into public.business_invites (business_id, code, display_name, warehouse_id) values (negocio, codigo, trim(nombre), bodega);
  return codigo;
end;
$$;

-- Antes de entrar: ¿el código sirve? Devuelve el nombre del negocio (para mostrar "Vas a vender en …").
create or replace function public.revisar_codigo(codigo text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  nombre text;
begin
  select b.name into nombre from public.business_invites i join public.businesses b on b.id = i.business_id
    where i.code = upper(trim(codigo)) and i.used_at is null and i.expires_at > now();
  if nombre is null then raise exception 'codigoInvalido' using errcode = 'P0001'; end if;
  return nombre;
end;
$$;

create or replace function public.unirse_con_codigo(codigo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  usuario uuid := (select auth.uid());
  inv public.business_invites;
begin
  if usuario is null then raise exception 'sinPermiso' using errcode = '42501'; end if;
  select * into inv from public.business_invites where code = upper(trim(codigo)) and used_at is null and expires_at > now() for update;
  if inv.id is null then raise exception 'codigoInvalido' using errcode = 'P0001'; end if;
  if exists (select 1 from public.business_members where business_id = inv.business_id and user_id = usuario) then
    raise exception 'yaEresMiembro' using errcode = 'P0001';
  end if;
  insert into public.business_members (business_id, user_id, role, display_name, warehouse_id)
  values (inv.business_id, usuario, 'seller', inv.display_name, inv.warehouse_id);
  update public.business_invites set used_by = usuario, used_at = now() where id = inv.id;
  return inv.business_id;
end;
$$;

revoke execute on function public.crear_invitacion(uuid, text, uuid), public.revisar_codigo(text), public.unirse_con_codigo(text) from public, anon;
grant execute on function public.crear_invitacion(uuid, text, uuid), public.revisar_codigo(text), public.unirse_con_codigo(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Lo que ve un vendedor: productos, stock, bodegas, clientes y formas de pago (para vender) y SUS ventas.
-- La plata del negocio (cuentas con saldos, movimientos, tarjetas, traslados, recurrentes, configuración) solo el dueño.
-- ─────────────────────────────────────────────────────────────
drop policy "Cada quien ve sus cuentas y las de sus negocios" on public.accounts;
create policy "Cada quien ve sus cuentas; en el negocio, el dueño" on public.accounts for select to authenticated
  using ((owner_type = 'personal' and user_id = (select auth.uid())) or (owner_type = 'negocio' and public.es_dueno(business_id)));

drop policy "Los miembros ven los movimientos del negocio" on public.movements;
create policy "El dueño ve los movimientos del negocio" on public.movements for select to authenticated
  using (owner_type = 'negocio' and public.es_dueno(business_id));

drop policy "Los miembros ven las tarjetas" on public.credit_cards;
create policy "El dueño ve las tarjetas" on public.credit_cards for select to authenticated using (public.es_dueno(business_id));
drop policy "Los miembros ven los traslados" on public.transfers;
create policy "El dueño ve los traslados" on public.transfers for select to authenticated using (public.es_dueno(business_id));
drop policy "Los miembros ven los pagos recurrentes" on public.recurring_payments;
create policy "El dueño ve los pagos recurrentes" on public.recurring_payments for select to authenticated using (public.es_dueno(business_id));
drop policy "Los miembros ven los movimientos de inventario" on public.inventory_movements;
create policy "El dueño ve los movimientos de inventario" on public.inventory_movements for select to authenticated using (public.es_dueno(business_id));

drop policy "Los miembros ven las ventas" on public.sales;
create policy "El dueño ve todas las ventas; el vendedor, las suyas" on public.sales for select to authenticated
  using (public.es_dueno(business_id) or (public.es_miembro(business_id) and seller_id = (select auth.uid())));
drop policy "Los miembros ven las líneas de venta" on public.sale_items;
create policy "Líneas de las ventas que cada quien puede ver" on public.sale_items for select to authenticated
  using (public.es_dueno(business_id) or exists (select 1 from public.sales s where s.id = sale_id and s.seller_id = (select auth.uid())));

-- El vendedor registra clientes en el POS (con su autorización, D5), pero no proveedores.
create policy "El vendedor registra clientes" on public.contacts for insert to authenticated
  with check (public.es_miembro(business_id) and kind = 'cliente');

-- La configuración del negocio (ventas, gastos, deudas, régimen) no la ve el vendedor.
revoke select on public.businesses from authenticated;
grant select (id, name, created_by, created_at, updated_at, kind, city) on public.businesses to authenticated;

-- Configuración: completa para el dueño; para el vendedor solo lo que el POS necesita (IVA).
create or replace function public.configuracion_de_negocio(negocio uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  b public.businesses;
begin
  select * into b from public.businesses where id = negocio;
  if b.id is null or not public.es_miembro(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if public.es_dueno(negocio) then
    return jsonb_build_object('setup', b.setup, 'tax_regime', b.tax_regime, 'nit', b.nit);
  end if;
  return jsonb_build_object('setup', jsonb_build_object('responsable_iva', coalesce((b.setup ->> 'responsable_iva')::boolean, false)), 'tax_regime', null);
end;
$$;

-- Cuentas para cobrar (nombre y tipo, sin saldos): las ve cualquier miembro.
create or replace function public.cuentas_para_vender(negocio uuid)
returns table (id uuid, name text, kind text, is_main boolean) language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.kind, a.is_main from public.accounts a
  where a.business_id = negocio and a.owner_type = 'negocio' and public.es_miembro(negocio)
  order by a.created_at;
$$;

-- Quitar a un vendedor (el dueño); el vendedor no puede quitar al dueño.
create or replace function public.quitar_vendedor(negocio uuid, usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_dueno(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  delete from public.business_members where business_id = negocio and user_id = usuario and role = 'seller';
end;
$$;

revoke execute on function public.configuracion_de_negocio(uuid), public.cuentas_para_vender(uuid), public.quitar_vendedor(uuid, uuid) from public, anon;
grant execute on function public.configuracion_de_negocio(uuid), public.cuentas_para_vender(uuid), public.quitar_vendedor(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Cobrar: el dueño o un vendedor del negocio (D4).
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
  tarifa numeric := coalesce((datos -> 'iva' ->> 'tarifa')::numeric, 0);
  incluido boolean := coalesce((datos -> 'iva' ->> 'incluido')::boolean, true);
  iva bigint := 0;
begin
  if negocio is null or not public.es_miembro(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  -- El vendedor vende desde su bodega asignada (si el dueño le puso una).
  if not public.es_dueno(negocio) then
    select coalesce(m.warehouse_id, bodega) into bodega from public.business_members m where m.business_id = negocio and m.user_id = (select auth.uid());
  end if;
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
  -- D6: con IVA incluido el total no cambia y se le saca el IVA; si se suma, va encima.
  if tarifa > 0 then
    if incluido then
      iva := total - round(total / (1 + tarifa / 100));
    else
      iva := round(total * tarifa / 100);
      total := total + iva;
    end if;
  end if;

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

  insert into public.sales (business_id, number, date, warehouse_id, contact_id, subtotal, discount, total, payments, received, change, status, tax, tax_rate, tax_included)
  values (
    negocio, numero, fecha, bodega, cliente, subtotal, descuento, total, datos -> 'payments',
    nullif(datos ->> 'received', '')::bigint, greatest(0, coalesce(nullif(datos ->> 'received', '')::bigint, total) - total),
    case when fiado then 'fiada' else 'pagada' end, iva, nullif(tarifa, 0), case when tarifa > 0 then incluido end
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

-- Onboarding: camino "Me invitaron a vender en un negocio".
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

  if uso not in ('personal', 'negocio', 'ambos', 'vendedor') then
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

  -- Quien viene a vender en un negocio entra con el código que le dio el dueño.
  if uso = 'vendedor' then
    perform public.unirse_con_codigo(datos ->> 'invite_code');
  end if;
end;
$$;
