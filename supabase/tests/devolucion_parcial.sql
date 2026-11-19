-- D4b · devolución parcial. Transacción que se deshace.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, efectivo uuid, nequi uuid, v_taza uuid, v_cafe uuid, venta jsonb, it_taza uuid, it_cafe uuid, res jsonb);
grant all on ctx to authenticated, anon;
create temp table prod(n text, id uuid);
grant all on prod to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, principal, efectivo)
  select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into public.accounts (owner_type, business_id, name, kind) select 'negocio', negocio, 'Nequi', 'billetera' from ctx;
update ctx set nequi = (select id from public.accounts where name = 'Nequi');
insert into prod select 'taza', public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Taza', 'price', 28000, 'cost', 10000, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
insert into prod select 'cafe', public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Café', 'price', 32000, 'cost', 14000, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
update ctx set v_taza = (select v.id from public.product_variants v join prod on prod.id = v.product_id and prod.n = 'taza'),
               v_cafe = (select v.id from public.product_variants v join prod on prod.id = v.product_id and prod.n = 'cafe');
-- 2 tazas + 1 café = 88.000, 10% → 79.200: efectivo 39.600 + Nequi 39.600.
update ctx set venta = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'discount', 8800,
  'items', jsonb_build_array(jsonb_build_object('variant_id', v_taza, 'name', 'Taza', 'unit_price', 28000, 'quantity', 2), jsonb_build_object('variant_id', v_cafe, 'name', 'Café', 'unit_price', 32000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 39600), jsonb_build_object('nombre', 'Nequi', 'cuenta', nequi, 'monto', 39600))));
update ctx set it_taza = (select id from public.sale_items where name = 'Taza'), it_cafe = (select id from public.sale_items where name = 'Café');
-- Devuelve 1 taza → reembolso 25.200; venta 54.000 (27.000 + 27.000).
update ctx set res = public.devolver_parte((venta ->> 'id')::uuid, jsonb_build_array(jsonb_build_object('id', it_taza, 'cantidad', 1)));
insert into r select 'Reembolso 25.200 y la venta queda en 54.000', (select (res ->> 'reembolso')::bigint = 25200 from ctx)
  and (select total = 54000 and subtotal = 60000 and discount = 6000 and returned_amount = 25200 and status = 'pagada' from public.sales);
insert into r select 'Cada pago baja en proporción (27.000 + 27.000)', (select array_agg(amount order by amount) = array[27000::bigint, 27000] from public.movements where kind = 'venta')
  and (select sum((x ->> 'monto')::bigint) = 54000 from public.sales, jsonb_array_elements(payments) x);
insert into r select 'La taza vuelve al inventario (5 → 3 → 4)', (select quantity = 4 from public.stock s, ctx where s.variant_id = ctx.v_taza);
insert into r select 'La línea queda con 1 taza y 1 devuelta', (select quantity = 1 and returned_qty = 1 and line_total = 28000 from public.sale_items where name = 'Taza');
do $$ begin
  begin
    perform public.devolver_parte((venta ->> 'id')::uuid, jsonb_build_array(jsonb_build_object('id', it_cafe, 'cantidad', 2))) from ctx;
    insert into r values ('No se devuelve más de lo vendido', false);
  exception when raise_exception then insert into r values ('No se devuelve más de lo vendido', sqlerrm = 'cantidadInvalida'); end;
end $$;
-- B no puede.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$ begin
  begin
    perform public.devolver_parte((venta ->> 'id')::uuid, jsonb_build_array(jsonb_build_object('id', it_cafe, 'cantidad', 1))) from ctx;
    insert into r values ('Un extraño no devuelve', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no devuelve', true); end;
end $$;
-- A devuelve lo que queda → completa.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
update ctx set res = public.devolver_parte((venta ->> 'id')::uuid, jsonb_build_array(jsonb_build_object('id', it_taza, 'cantidad', 1), jsonb_build_object('id', it_cafe, 'cantidad', 1)));
insert into r select 'Devolver lo que queda: devolución completa, sin plata ni stock pendiente',
  (select (res ->> 'completa')::boolean from ctx) and (select status = 'devuelta' from public.sales) and (select count(*) = 0 from public.movements where kind = 'venta')
  and (select quantity = 5 from public.stock s, ctx where s.variant_id = ctx.v_taza) and (select quantity = 5 from public.stock s, ctx where s.variant_id = ctx.v_cafe);
reset role;
select * from r;
rollback;
