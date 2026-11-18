-- Pruebas de inventario (reglas C2–C7): stock por bodega que nunca queda negativo, traslados, deshacer,
-- códigos únicos, bodegas y seguridad. Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, local uuid, bolso uuid, v_bolso uuid, cam uuid, v_negro_m uuid, mov uuid);
grant all on ctx to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, principal) select b.id, w.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main;
insert into public.warehouses (business_id, name) select negocio, 'Local' from ctx;
update ctx set local = (select id from public.warehouses where name = 'Local');

-- Producto de una variante con 28 en Principal, y camiseta con 4 variantes (C7) y 5 Negro/M en Principal.
update ctx set bolso = public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Bolso', 'price', 120000, 'cost', 50000,
  'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('barcode', '2900000000015', 'quantity', 28))));
update ctx set v_bolso = (select id from public.product_variants where product_id = ctx.bolso);
update ctx set cam = public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Camiseta', 'price', 45000, 'warehouse_id', principal,
  'variants', jsonb_build_array(
    jsonb_build_object('color', 'Negro', 'size', 'S'), jsonb_build_object('color', 'Negro', 'size', 'M', 'quantity', 5),
    jsonb_build_object('color', 'Blanco', 'size', 'S'), jsonb_build_object('color', 'Blanco', 'size', 'M'))));
update ctx set v_negro_m = (select id from public.product_variants where product_id = ctx.cam and color = 'Negro' and size = 'M');
insert into r select 'Crear producto deja variantes, stock y movimiento de inventario inicial',
  (select count(*) = 4 from public.product_variants v, ctx where v.product_id = ctx.cam)
  and (select quantity = 28 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.principal)
  and (select count(*) = 2 from public.inventory_movements where kind = 'inicial');

-- C4: mover 5 a Local → 23 y 19 (con 14 que entran primero al Local).
select public.mover_inventario(v_bolso, local, 14, 'compraProveedor') from ctx;
select public.trasladar_inventario(v_bolso, principal, local, 5) from ctx;
insert into r select 'C4: Principal 28 y Local 14, mover 5 → 23 y 19 (total 42)',
  (select quantity = 23 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.principal)
  and (select quantity = 19 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.local)
  and (select sum(quantity) = 42 from public.stock s, ctx where s.variant_id = ctx.v_bolso);

-- C3: Negro/M en Local con 0 → entrada de 5 → 5; deshacer → 0.
update ctx set mov = public.mover_inventario(v_negro_m, local, 5, 'compraProveedor');
insert into r select 'C3: entrada de 5 en Local', (select quantity = 5 from public.stock s, ctx where s.variant_id = ctx.v_negro_m and s.warehouse_id = ctx.local);
select public.deshacer_movimiento_inventario(mov) from ctx;
insert into r select 'C3: deshacer la entrada vuelve a 0', (select quantity = 0 from public.stock s, ctx where s.variant_id = ctx.v_negro_m and s.warehouse_id = ctx.local);

do $$ begin
  begin
    perform public.mover_inventario(v_negro_m, local, -1, 'merma') from ctx;
    insert into r values ('C2: no deja sacar más de lo que hay (nunca negativo)', false);
  exception when raise_exception then insert into r values ('C2: no deja sacar más de lo que hay (nunca negativo)', sqlerrm = 'stockInsuficiente'); end;
  begin
    perform public.deshacer_movimiento_inventario(mov) from ctx;
    insert into r values ('No se deshace dos veces', false);
  exception when raise_exception then insert into r values ('No se deshace dos veces', sqlerrm = 'noSeDeshace'); end;
  begin
    perform public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Copia', 'price', 1, 'variants', jsonb_build_array(jsonb_build_object('barcode', '2900000000015')))) from ctx;
    insert into r values ('C6: el código no se repite y dice con qué producto choca', false);
  exception when raise_exception then
    declare d text; begin get stacked diagnostics d = pg_exception_detail;
    insert into r values ('C6: el código no se repite y dice con qué producto choca', sqlerrm = 'codigoDeOtro' and d like '%Bolso%'); end;
  end;
  begin
    perform public.quitar_bodega(local) from ctx;
    insert into r values ('No se quita una bodega con unidades', false);
  exception when raise_exception then insert into r values ('No se quita una bodega con unidades', sqlerrm = 'bodegaConStock'); end;
  begin
    perform public.quitar_bodega(principal) from ctx;
    insert into r values ('No se quita la bodega principal', false);
  exception when raise_exception then insert into r values ('No se quita la bodega principal', sqlerrm = 'bodegaPrincipal'); end;
  begin
    perform public.quitar_variante(v_bolso) from ctx;
    insert into r values ('No se quita una variante con unidades', false);
  exception when raise_exception then insert into r values ('No se quita una variante con unidades', sqlerrm = 'varianteConStock'); end;
  begin
    update public.stock set quantity = 999;
    insert into r values ('Nadie cambia el stock directo', (select count(*) = 0 from public.stock where quantity = 999));
  exception when insufficient_privilege then insert into r values ('Nadie cambia el stock directo', true); end;
end $$;

select public.hacer_principal(local) from ctx;
insert into r select 'Hacer principal deja una sola principal',
  (select count(*) = 1 from public.warehouses where is_main) and (select is_main from public.warehouses w, ctx where w.id = ctx.local);

-- B no ve nada de A ni puede mover su inventario.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve productos, variantes, stock ni movimientos',
  (select count(*) = 0 from public.products) and (select count(*) = 0 from public.product_variants)
  and (select count(*) = 0 from public.stock) and (select count(*) = 0 from public.inventory_movements);
do $$ begin
  begin
    perform public.mover_inventario(v_bolso, principal, 100) from ctx;
    insert into r values ('Un extraño no mueve inventario ajeno', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no mueve inventario ajeno', true); end;
end $$;
reset role;
select * from r;
rollback;
