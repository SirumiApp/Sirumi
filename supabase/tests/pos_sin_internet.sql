-- POS sin internet: idempotencia, stock que no alcanza, devolución. Transacción que se deshace.
begin;
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, efectivo uuid, v uuid, a jsonb, b jsonb, c jsonb);
grant all on ctx to authenticated, anon;
create temp table prod(id uuid);
grant all on prod to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, principal, efectivo)
  select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into prod select public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Taza', 'price', 28000, 'cost', 10000,
  'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 2)))) from ctx;
update ctx set v = (select id from public.product_variants where product_id = (select id from prod));
-- Venta sin internet de 3 tazas (solo hay 2), enviada dos veces.
update ctx set a = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'client_id', 'aaaaaaaa-0000-0000-0000-000000000001', 'sin_conexion', true,
  'items', jsonb_build_array(jsonb_build_object('variant_id', v, 'name', 'Taza', 'unit_price', 28000, 'quantity', 3)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 84000))));
update ctx set b = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'client_id', 'aaaaaaaa-0000-0000-0000-000000000001', 'sin_conexion', true,
  'items', jsonb_build_array(jsonb_build_object('variant_id', v, 'name', 'Taza', 'unit_price', 28000, 'quantity', 3)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 84000))));
insert into r select 'Enviada dos veces: una sola venta, el mismo número', (select count(*) = 1 from public.sales) and (select a ->> 'id' = b ->> 'id' and (b ->> 'repetida')::boolean from ctx);
insert into r select 'Sin internet: se registra aunque falte stock; queda en 0', (select quantity = 0 from public.stock s, ctx where s.variant_id = ctx.v) and (select total = 84000 and offline from public.sales);
insert into r select 'La plata entra completa', (select sum(amount) = 84000 from public.movements where kind = 'venta');
-- Con internet, sin stock: se rechaza como siempre.
do $$ begin
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v, 'name', 'Taza', 'unit_price', 28000, 'quantity', 1)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 28000)))) from ctx;
    insert into r values ('Con internet y sin stock: se rechaza', false);
  exception when raise_exception then insert into r values ('Con internet y sin stock: se rechaza', sqlerrm = 'stockInsuficiente'); end;
end $$;
-- Devolver: vuelven las 2 que de verdad salieron (no 3).
select public.devolver_venta((a ->> 'id')::uuid) from ctx;
insert into r select 'Devolver: vuelve lo que salió (2), no lo vendido (3)', (select quantity = 2 from public.stock s, ctx where s.variant_id = ctx.v);
reset role;
select * from r;
rollback;
