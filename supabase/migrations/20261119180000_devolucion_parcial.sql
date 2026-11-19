-- D4b · Devolver parte de una venta: unidades de una o varias líneas.
-- Reembolso = valor de las unidades × total / subtotal (mismo descuento e IVA). La venta queda con sus nuevos totales,
-- cada pago (y su movimiento) baja en proporción, y al inventario vuelve lo que de verdad salió. Si se devuelve todo, es devolución completa.

alter table public.sale_items add column returned_qty integer not null default 0 check (returned_qty >= 0);
alter table public.sales add column returned_amount bigint not null default 0 check (returned_amount >= 0);

-- items = [{ id: sale_item, cantidad }] → { reembolso, completa }
create or replace function public.devolver_parte(venta uuid, items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.sales;
  it jsonb;
  linea public.sale_items;
  cantidad integer;
  valor bigint := 0;
  nuevo_subtotal bigint;
  nuevo_total bigint;
  salio integer;
  vuelve integer;
  suma_mov bigint;
  acumulado bigint := 0;
  m record;
  n integer;
  i integer := 0;
  nuevo_monto bigint;
  pagos jsonb := '[]'::jsonb;
  p jsonb;
  suma_pagos bigint;
begin
  select * into v from public.sales where id = venta for update;
  if v.id is null or not public.es_dueno(v.business_id) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if v.status = 'devuelta' then raise exception 'yaDevuelta' using errcode = 'P0001'; end if;

  for it in select * from jsonb_array_elements(coalesce(items, '[]'::jsonb)) loop
    cantidad := (it ->> 'cantidad')::integer;
    select * into linea from public.sale_items where id = (it ->> 'id')::uuid and sale_id = venta for update;
    if linea.id is null then raise exception 'sinPermiso' using errcode = '42501'; end if;
    if cantidad is null or cantidad <= 0 or cantidad > linea.quantity then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
    valor := valor + linea.unit_price * cantidad;
    update public.sale_items set quantity = quantity - cantidad, returned_qty = returned_qty + cantidad, line_total = unit_price * (quantity - cantidad) where id = linea.id;
    -- Al inventario vuelve lo que salió por esta venta (en una venta sin internet puede ser menos).
    if linea.variant_id is not null and v.warehouse_id is not null then
      select coalesce(-sum(quantity), 0) into salio from public.inventory_movements
        where group_id = venta and variant_id = linea.variant_id and kind in ('venta', 'devolucion');
      vuelve := least(cantidad, salio);
      if vuelve > 0 then
        perform public._cambiar_stock(v.business_id, linea.variant_id, v.warehouse_id, vuelve);
        insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
        values (v.business_id, linea.variant_id, v.warehouse_id, 'devolucion', vuelve, venta);
      end if;
    end if;
  end loop;
  if valor = 0 then raise exception 'carritoVacio' using errcode = 'P0001'; end if;

  nuevo_subtotal := greatest(0, v.subtotal - valor);
  if nuevo_subtotal = 0 then
    delete from public.movements where sale_id = venta;
    update public.sales set status = 'devuelta', returned_at = now(), returned_amount = returned_amount + v.total where id = venta;
    return jsonb_build_object('reembolso', v.total, 'completa', true);
  end if;
  nuevo_total := round(v.total::numeric * nuevo_subtotal / v.subtotal);

  -- Cada movimiento de la venta baja en proporción (el último se ajusta para que sume exacto).
  select coalesce(sum(amount), 0), count(*) into suma_mov, n from public.movements where sale_id = venta;
  for m in select id, amount from public.movements where sale_id = venta order by created_at, id loop
    i := i + 1;
    nuevo_monto := case when i = n then nuevo_total - acumulado else round(nuevo_total::numeric * m.amount / greatest(suma_mov, 1)) end;
    acumulado := acumulado + nuevo_monto;
    if nuevo_monto > 0 then update public.movements set amount = nuevo_monto where id = m.id; else delete from public.movements where id = m.id; end if;
  end loop;
  -- Lo mismo en el detalle de pagos de la venta.
  select coalesce(sum((x ->> 'monto')::bigint), 0) into suma_pagos from jsonb_array_elements(v.payments) x;
  acumulado := 0; i := 0; n := jsonb_array_length(v.payments);
  for p in select * from jsonb_array_elements(v.payments) loop
    i := i + 1;
    nuevo_monto := case when i = n then nuevo_total - acumulado else round(nuevo_total::numeric * (p ->> 'monto')::bigint / greatest(suma_pagos, 1)) end;
    acumulado := acumulado + nuevo_monto;
    pagos := pagos || jsonb_build_array(jsonb_set(p, '{monto}', to_jsonb(nuevo_monto)));
  end loop;

  update public.sales set
    subtotal = nuevo_subtotal,
    discount = round(v.discount::numeric * nuevo_subtotal / v.subtotal),
    tax = round(v.tax::numeric * nuevo_total / greatest(v.total, 1)),
    total = nuevo_total,
    payments = pagos,
    returned_amount = returned_amount + (v.total - nuevo_total)
  where id = venta;
  return jsonb_build_object('reembolso', v.total - nuevo_total, 'completa', false);
end;
$$;
revoke execute on function public.devolver_parte(uuid, jsonb) from public, anon;
grant execute on function public.devolver_parte(uuid, jsonb) to authenticated;
