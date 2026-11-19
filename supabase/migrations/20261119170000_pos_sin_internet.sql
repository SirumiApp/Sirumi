-- POS sin internet (ferias): la venta se guarda en el celular y se sube al volver la señal.
-- client_id: lo pone el celular; si la misma venta llega dos veces (reintento), no se duplica.
-- offline: la venta se hizo sin internet. Si al subirla el stock no alcanza, queda en 0 en vez de rechazarla
-- (la venta ya ocurrió); la persona ajusta el inventario después.

alter table public.sales add column client_id uuid, add column offline boolean not null default false;
create unique index sales_client_id_idx on public.sales (business_id, client_id) where client_id is not null;

create or replace function public._sacar_hasta_cero(negocio uuid, variante uuid, bodega uuid, cantidad integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actual integer;
  sale integer;
begin
  insert into public.stock (variant_id, warehouse_id, business_id, quantity) values (variante, bodega, negocio, 0)
    on conflict (variant_id, warehouse_id) do nothing;
  select quantity into actual from public.stock where variant_id = variante and warehouse_id = bodega for update;
  sale := least(actual, cantidad);
  update public.stock set quantity = actual - sale where variant_id = variante and warehouse_id = bodega;
  return sale;
end;
$$;
revoke execute on function public._sacar_hasta_cero(uuid, uuid, uuid, integer) from public, anon, authenticated;

create or replace function public.cobrar_venta(datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  cliente_id uuid := nullif(datos ->> 'client_id', '')::uuid;
  sin_conexion boolean := coalesce((datos ->> 'sin_conexion')::boolean, false);
  existente record;
  sale_stock integer;
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
  -- Venta hecha sin internet que se vuelve a enviar: si ya entró, se devuelve la misma (no se duplica).
  if cliente_id is not null then
    select id, number into existente from public.sales where business_id = negocio and client_id = cliente_id;
    if found then return jsonb_build_object('id', existente.id, 'number', existente.number, 'repetida', true); end if;
  end if;
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

  insert into public.sales (business_id, number, date, warehouse_id, contact_id, subtotal, discount, total, payments, received, change, status, tax, tax_rate, tax_included, discount_code, client_id, offline)
  values (
    negocio, numero, fecha, bodega, cliente, subtotal, descuento, total, datos -> 'payments',
    nullif(datos ->> 'received', '')::bigint, greatest(0, coalesce(nullif(datos ->> 'received', '')::bigint, total) - total),
    case when fiado then 'fiada' else 'pagada' end, iva, nullif(tarifa, 0), case when tarifa > 0 then incluido end,
    nullif(upper(trim(coalesce(datos ->> 'discount_code', ''))), ''), cliente_id, sin_conexion
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
      if sin_conexion then
        -- La venta ya pasó (sin internet): se registra igual. Si el stock no alcanza, queda en 0 (hay que contar).
        sale_stock := public._sacar_hasta_cero(negocio, variante, bodega, cantidad);
      else
        perform public._cambiar_stock(negocio, variante, bodega, -cantidad);
        sale_stock := cantidad;
      end if;
      if sale_stock > 0 then
        insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
        values (negocio, variante, bodega, 'venta', -sale_stock, venta);
      end if;
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
$function$
;

-- D4: al devolver, vuelve al inventario lo que de verdad salió por esta venta (en una venta sin internet puede ser menos).
create or replace function public.devolver_venta(venta uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.sales;
  fila record;
begin
  select * into v from public.sales where id = venta for update;
  if v.id is null or not public.es_dueno(v.business_id) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if v.status = 'devuelta' then raise exception 'yaDevuelta' using errcode = 'P0001'; end if;
  for fila in
    select variant_id, warehouse_id, -sum(quantity)::integer as cantidad from public.inventory_movements
    where group_id = venta and kind in ('venta', 'devolucion') group by variant_id, warehouse_id having sum(quantity) < 0
  loop
    perform public._cambiar_stock(v.business_id, fila.variant_id, fila.warehouse_id, fila.cantidad);
    insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
    values (v.business_id, fila.variant_id, fila.warehouse_id, 'devolucion', fila.cantidad, venta);
  end loop;
  delete from public.movements where sale_id = venta;
  update public.sales set status = 'devuelta', returned_at = now() where id = venta;
end;
$$;
