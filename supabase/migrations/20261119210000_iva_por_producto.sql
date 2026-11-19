-- D6b · IVA por producto: exentos (0%), 5% u otra tarifa. Sin tarifa propia, el producto usa la general del negocio.
-- El descuento se reparte entre las líneas y el IVA se calcula por cada tarifa (igual que totalesVenta en la app).

alter table public.products add column tax_rate numeric check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100));
alter table public.sale_items add column tax_rate numeric;

create or replace function public.crear_producto(datos jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  negocio uuid := (datos ->> 'business_id')::uuid;
  bodega uuid := nullif(datos ->> 'warehouse_id', '')::uuid;
  producto uuid;
  v jsonb;
  variante uuid;
  codigo text;
  otro text;
  cantidad integer;
  posicion integer := 0;
begin
  if negocio is null or not public.es_dueno(negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  if bodega is not null and not exists (select 1 from public.warehouses where id = bodega and business_id = negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  insert into public.products (business_id, name, collection, emoji, price, cost, cost_breakdown, min_stock, tax_rate)
  values (
    negocio, trim(datos ->> 'name'), nullif(trim(coalesce(datos ->> 'collection', '')), ''), coalesce(datos ->> 'emoji', 'paquete'),
    (datos ->> 'price')::bigint, coalesce((datos ->> 'cost')::bigint, 0), datos -> 'cost_breakdown', coalesce((datos ->> 'min_stock')::integer, 0),
    nullif(datos ->> 'tax_rate', '')::numeric
  ) returning id into producto;

  for v in select * from jsonb_array_elements(coalesce(datos -> 'variants', '[]'::jsonb)) loop
    codigo := nullif(trim(coalesce(v ->> 'barcode', '')), '');
    if codigo is not null then
      select p.name into otro from public.product_variants pv join public.products p on p.id = pv.product_id
        where pv.business_id = negocio and pv.barcode = codigo;
      if otro is not null then
        raise exception 'codigoDeOtro' using errcode = 'P0001', detail = json_build_object('codigo', codigo, 'producto', otro)::text;
      end if;
    end if;
    insert into public.product_variants (product_id, business_id, color, size, barcode, position)
    values (producto, negocio, nullif(v ->> 'color', ''), nullif(v ->> 'size', ''), codigo, posicion)
    returning id into variante;
    posicion := posicion + 1;
    cantidad := coalesce((v ->> 'quantity')::integer, 0);
    if cantidad < 0 then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
    if cantidad > 0 then
      if bodega is null then raise exception 'sinBodega' using errcode = 'P0001'; end if;
      perform public._cambiar_stock(negocio, variante, bodega, cantidad);
      insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, reason)
      values (negocio, variante, bodega, 'inicial', cantidad, 'inventarioInicial');
    end if;
  end loop;
  return producto;
end;
$function$
;

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
  con_iva boolean := datos ? 'iva';
  grupos jsonb := '{}'::jsonb;
  grupo record;
  n_items integer;
  i_item integer := 0;
  acumulado bigint := 0;
  neto_linea bigint;
  tarifa_linea numeric;
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
  -- D6 + D6b: el descuento se reparte entre las líneas (la última se ajusta) y el IVA se calcula por cada tarifa:
  -- la del producto (exento 0, 5…) o, si no tiene, la general. Con IVA incluido el total no cambia; si se suma, va encima.
  if con_iva then
    n_items := jsonb_array_length(datos -> 'items');
    for linea in select * from jsonb_array_elements(datos -> 'items') loop
      i_item := i_item + 1;
      neto_linea := case when i_item = n_items then total - acumulado
        else round(total::numeric * ((linea ->> 'unit_price')::bigint * (linea ->> 'quantity')::integer) / greatest(subtotal, 1)) end;
      acumulado := acumulado + neto_linea;
      tarifa_linea := tarifa;
      if nullif(linea ->> 'variant_id', '') is not null then
        select coalesce(p.tax_rate, tarifa) into tarifa_linea from public.product_variants v join public.products p on p.id = v.product_id
          where v.id = (linea ->> 'variant_id')::uuid and v.business_id = negocio;
        tarifa_linea := coalesce(tarifa_linea, tarifa);
      end if;
      grupos := jsonb_set(grupos, array[(tarifa_linea::float8)::text], to_jsonb(coalesce((grupos ->> (tarifa_linea::float8)::text)::bigint, 0) + neto_linea));
    end loop;
    for grupo in select key::numeric as t, value::bigint as m from jsonb_each_text(grupos) loop
      if grupo.t > 0 then
        iva := iva + case when incluido then grupo.m - round(grupo.m / (1 + grupo.t / 100)) else round(grupo.m * grupo.t / 100) end;
      end if;
    end loop;
    if not incluido then total := total + iva; end if;
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
    case when fiado then 'fiada' else 'pagada' end, iva, case when con_iva then nullif(tarifa, 0) end, case when con_iva then incluido end,
    nullif(upper(trim(coalesce(datos ->> 'discount_code', ''))), ''), cliente_id, sin_conexion
  ) returning id into venta;

  for linea in select * from jsonb_array_elements(datos -> 'items') loop
    variante := nullif(linea ->> 'variant_id', '')::uuid;
    cantidad := (linea ->> 'quantity')::integer;
    precio := (linea ->> 'unit_price')::bigint;
    if cantidad is null or cantidad <= 0 or precio is null or precio < 0 then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
    costo := null;
    tarifa_linea := tarifa;
    if variante is not null then
      select p.cost, coalesce(p.tax_rate, tarifa) into costo, tarifa_linea from public.product_variants v join public.products p on p.id = v.product_id
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
    insert into public.sale_items (sale_id, business_id, variant_id, name, unit_price, unit_cost, quantity, line_total, tax_rate)
    values (venta, negocio, variante, coalesce(nullif(trim(linea ->> 'name'), ''), '—'), precio, costo, cantidad, precio * cantidad, case when con_iva then tarifa_linea end);
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
