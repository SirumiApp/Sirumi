-- Regla D7: códigos de descuento del negocio (NAVIDAD10 = 10%, FERIA5000 = $ 5.000).
-- Los ven todos los miembros (el vendedor los usa al cobrar); solo el dueño los crea, cambia o borra.
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{3,20}$'),
  kind text not null check (kind in ('porcentaje', 'monto')),
  value bigint not null check (value > 0 and (kind = 'monto' or value <= 100)),
  active boolean not null default true,
  expires_on date,
  created_at timestamptz not null default now(),
  unique (business_id, code)
);
alter table public.discount_codes enable row level security;
create policy "Los miembros ven los códigos" on public.discount_codes for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea códigos" on public.discount_codes for insert to authenticated with check (public.es_dueno(business_id));
create policy "El dueño cambia códigos" on public.discount_codes for update to authenticated using (public.es_dueno(business_id)) with check (public.es_dueno(business_id));
create policy "El dueño borra códigos" on public.discount_codes for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.discount_codes from anon;

-- La venta guarda qué código se usó (para el informe de ventas).
alter table public.sales add column discount_code text;

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

  insert into public.sales (business_id, number, date, warehouse_id, contact_id, subtotal, discount, total, payments, received, change, status, tax, tax_rate, tax_included, discount_code)
  values (
    negocio, numero, fecha, bodega, cliente, subtotal, descuento, total, datos -> 'payments',
    nullif(datos ->> 'received', '')::bigint, greatest(0, coalesce(nullif(datos ->> 'received', '')::bigint, total) - total),
    case when fiado then 'fiada' else 'pagada' end, iva, nullif(tarifa, 0), case when tarifa > 0 then incluido end,
    nullif(upper(trim(coalesce(datos ->> 'discount_code', ''))), '')
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
