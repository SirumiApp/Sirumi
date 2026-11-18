-- Fase 2 · Paso 8 (parte a): productos, variantes, stock por bodega y movimientos de inventario.
-- docs/specs/04-productos-inventario.md · reglas C1–C7.
-- El stock NUNCA se cambia directo: solo con las funciones de abajo, en una transacción, y nunca queda negativo.

-- ─────────────────────────────────────────────────────────────
-- Productos (C1: costo por unidad, con su desglose opcional)
-- ─────────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  collection text,
  emoji text not null default 'paquete',
  photo_path text,
  price bigint not null check (price > 0),
  cost bigint not null default 0 check (cost >= 0),
  -- { materia, manoDeObra, empaque, otros } si la persona desglosó el costo.
  cost_breakdown jsonb,
  min_stock integer not null default 0 check (min_stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_business_idx on public.products (business_id, name);
create trigger products_updated_at before update on public.products for each row execute function public.tocar_updated_at();
alter table public.products enable row level security;
create policy "Los miembros ven los productos" on public.products for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea productos" on public.products for insert to authenticated with check (public.es_dueno(business_id));
create policy "El dueño edita productos" on public.products for update to authenticated using (public.es_dueno(business_id)) with check (public.es_dueno(business_id));
create policy "El dueño borra productos" on public.products for delete to authenticated using (public.es_dueno(business_id));
revoke all on public.products from anon;

create or replace function public.producto_del_negocio(producto uuid, negocio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.products where id = producto and business_id = negocio);
$$;
revoke execute on function public.producto_del_negocio(uuid, uuid) from public, anon;
grant execute on function public.producto_del_negocio(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Variantes (C7) con código de barras único por negocio (C6)
-- ─────────────────────────────────────────────────────────────
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  color text,
  size text,
  barcode text check (barcode is null or length(trim(barcode)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);
create unique index product_variants_codigo_unico on public.product_variants (business_id, barcode) where barcode is not null;
alter table public.product_variants enable row level security;
create policy "Los miembros ven las variantes" on public.product_variants for select to authenticated using (public.es_miembro(business_id));
create policy "El dueño crea variantes" on public.product_variants for insert to authenticated
  with check (public.es_dueno(business_id) and public.producto_del_negocio(product_id, business_id));
create policy "El dueño edita variantes" on public.product_variants for update to authenticated
  using (public.es_dueno(business_id)) with check (public.es_dueno(business_id) and public.producto_del_negocio(product_id, business_id));
-- Borrar una variante: solo con quitar_variante (revisa que no tenga unidades).
revoke all on public.product_variants from anon;

-- ─────────────────────────────────────────────────────────────
-- Stock por variante y bodega (C2). Solo lectura desde la app.
-- ─────────────────────────────────────────────────────────────
create table public.stock (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  primary key (variant_id, warehouse_id)
);
create index stock_business_idx on public.stock (business_id);
alter table public.stock enable row level security;
create policy "Los miembros ven el stock" on public.stock for select to authenticated using (public.es_miembro(business_id));
revoke all on public.stock from anon;
revoke insert, update, delete on public.stock from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Movimientos de inventario: todo cambio de stock queda registrado (C2). Solo lectura desde la app.
-- quantity con signo: positivo entra, negativo sale.
-- ─────────────────────────────────────────────────────────────
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  kind text not null check (kind in ('inicial', 'entrada', 'salida', 'traslado', 'venta', 'devolucion', 'deshacer')),
  quantity integer not null check (quantity <> 0),
  reason text,
  note text,
  group_id uuid,
  undone boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_business_idx on public.inventory_movements (business_id, created_at desc);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id);
alter table public.inventory_movements enable row level security;
create policy "Los miembros ven los movimientos de inventario" on public.inventory_movements for select to authenticated using (public.es_miembro(business_id));
revoke all on public.inventory_movements from anon;
revoke insert, update, delete on public.inventory_movements from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Funciones de stock (corren como dueño de la base, revisando que quien llama sea dueño del negocio)
-- ─────────────────────────────────────────────────────────────

-- Suma (o resta) unidades en una bodega. Nunca deja el stock negativo (C2).
create or replace function public._cambiar_stock(negocio uuid, variante uuid, bodega uuid, delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actual integer;
  nombre_bodega text;
begin
  insert into public.stock (variant_id, warehouse_id, business_id, quantity) values (variante, bodega, negocio, 0)
    on conflict (variant_id, warehouse_id) do nothing;
  select quantity into actual from public.stock where variant_id = variante and warehouse_id = bodega for update;
  if actual + delta < 0 then
    select name into nombre_bodega from public.warehouses where id = bodega;
    raise exception 'stockInsuficiente' using errcode = 'P0001', detail = json_build_object('disponible', actual, 'bodega', nombre_bodega)::text;
  end if;
  update public.stock set quantity = actual + delta where variant_id = variante and warehouse_id = bodega;
  return actual + delta;
end;
$$;
revoke execute on function public._cambiar_stock(uuid, uuid, uuid, integer) from public, anon, authenticated;

-- Datos de una variante si quien llama es dueño de su negocio y la bodega es de ese negocio.
create or replace function public._negocio_de_variante(variante uuid, bodega uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  negocio uuid;
begin
  select business_id into negocio from public.product_variants where id = variante;
  if negocio is null or not public.es_dueno(negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  if bodega is not null and not exists (select 1 from public.warehouses where id = bodega and business_id = negocio) then
    raise exception 'sinPermiso' using errcode = '42501';
  end if;
  return negocio;
end;
$$;
revoke execute on function public._negocio_de_variante(uuid, uuid) from public, anon, authenticated;

-- Crear un producto con sus variantes y el inventario inicial, todo junto (spec 04, §3).
-- datos = { business_id, name, collection, emoji, price, cost, cost_breakdown, min_stock, warehouse_id,
--           variants: [{ color, size, barcode, quantity }] }
create or replace function public.crear_producto(datos jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
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
  insert into public.products (business_id, name, collection, emoji, price, cost, cost_breakdown, min_stock)
  values (
    negocio, trim(datos ->> 'name'), nullif(trim(coalesce(datos ->> 'collection', '')), ''), coalesce(datos ->> 'emoji', 'paquete'),
    (datos ->> 'price')::bigint, coalesce((datos ->> 'cost')::bigint, 0), datos -> 'cost_breakdown', coalesce((datos ->> 'min_stock')::integer, 0)
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
$$;

-- Entrada (cantidad > 0) o salida (cantidad < 0) de mercancía en una bodega (C3).
create or replace function public.mover_inventario(variante uuid, bodega uuid, cantidad integer, motivo text default null, nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid := public._negocio_de_variante(variante, bodega);
  movimiento uuid;
begin
  if cantidad is null or cantidad = 0 then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
  perform public._cambiar_stock(negocio, variante, bodega, cantidad);
  insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, reason, note)
  values (negocio, variante, bodega, case when cantidad > 0 then 'entrada' else 'salida' end, cantidad, motivo, nullif(trim(coalesce(nota, '')), ''))
  returning id into movimiento;
  return movimiento;
end;
$$;

-- Mover unidades entre bodegas (C4): el total no cambia.
create or replace function public.trasladar_inventario(variante uuid, desde uuid, hacia uuid, cantidad integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid := public._negocio_de_variante(variante, desde);
  grupo uuid := gen_random_uuid();
begin
  perform public._negocio_de_variante(variante, hacia);
  if cantidad is null or cantidad <= 0 or desde = hacia then raise exception 'cantidadInvalida' using errcode = 'P0001'; end if;
  perform public._cambiar_stock(negocio, variante, desde, -cantidad);
  perform public._cambiar_stock(negocio, variante, hacia, cantidad);
  insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
  values (negocio, variante, desde, 'traslado', -cantidad, grupo), (negocio, variante, hacia, 'traslado', cantidad, grupo);
  return grupo;
end;
$$;

-- Deshacer una entrada o salida (C3): una entrada solo si todavía están esas unidades.
create or replace function public.deshacer_movimiento_inventario(movimiento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.inventory_movements;
begin
  select * into m from public.inventory_movements where id = movimiento for update;
  if m.id is null or not public.es_dueno(m.business_id) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if m.kind not in ('entrada', 'salida', 'inicial') or m.undone or m.warehouse_id is null then
    raise exception 'noSeDeshace' using errcode = 'P0001';
  end if;
  perform public._cambiar_stock(m.business_id, m.variant_id, m.warehouse_id, -m.quantity);
  update public.inventory_movements set undone = true where id = movimiento;
  insert into public.inventory_movements (business_id, variant_id, warehouse_id, kind, quantity, group_id)
  values (m.business_id, m.variant_id, m.warehouse_id, 'deshacer', -m.quantity, m.id);
end;
$$;

-- Quitar una variante solo si no tiene unidades.
create or replace function public.quitar_variante(variante uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid := public._negocio_de_variante(variante, null);
begin
  if exists (select 1 from public.stock where variant_id = variante and quantity > 0) then
    raise exception 'varianteConStock' using errcode = 'P0001';
  end if;
  delete from public.product_variants where id = variante and business_id = negocio;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Bodegas (spec 04, §1): una principal; quitar solo si está vacía y si queda otra.
-- ─────────────────────────────────────────────────────────────
drop policy "El dueño borra bodegas" on public.warehouses;

create or replace function public.quitar_bodega(bodega uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  w public.warehouses;
  unidades integer;
begin
  select * into w from public.warehouses where id = bodega;
  if w.id is null or not public.es_dueno(w.business_id) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  if w.is_main then raise exception 'bodegaPrincipal' using errcode = 'P0001'; end if;
  select coalesce(sum(quantity), 0) into unidades from public.stock where warehouse_id = bodega;
  if unidades > 0 then
    raise exception 'bodegaConStock' using errcode = 'P0001', detail = json_build_object('unidades', unidades)::text;
  end if;
  delete from public.warehouses where id = bodega;
end;
$$;

create or replace function public.hacer_principal(bodega uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  negocio uuid;
begin
  select business_id into negocio from public.warehouses where id = bodega;
  if negocio is null or not public.es_dueno(negocio) then raise exception 'sinPermiso' using errcode = '42501'; end if;
  update public.warehouses set is_main = false where business_id = negocio and is_main;
  update public.warehouses set is_main = true where id = bodega;
end;
$$;

revoke execute on function public.crear_producto(jsonb), public.mover_inventario(uuid, uuid, integer, text, text),
  public.trasladar_inventario(uuid, uuid, uuid, integer), public.deshacer_movimiento_inventario(uuid),
  public.quitar_variante(uuid), public.quitar_bodega(uuid), public.hacer_principal(uuid) from public, anon;
grant execute on function public.crear_producto(jsonb), public.mover_inventario(uuid, uuid, integer, text, text),
  public.trasladar_inventario(uuid, uuid, uuid, integer), public.deshacer_movimiento_inventario(uuid),
  public.quitar_variante(uuid), public.quitar_bodega(uuid), public.hacer_principal(uuid) to authenticated;
