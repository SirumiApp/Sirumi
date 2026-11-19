-- C9 inventario bajo y B14 resumen semanal (sin enviar de verdad: se cuentan los envíos). Transacción que se deshace.
begin;
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, efectivo uuid, v uuid, envios_antes bigint);
grant all on ctx to authenticated, anon;
create temp table prod(id uuid);
grant all on prod to authenticated, anon;
insert into ctx (envios_antes) select count(*) from net.http_request_queue;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
select public.registrar_celular('ExponentPushToken[prueba-a]', 'ios');
update ctx set (negocio, principal, efectivo) = (select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo');
insert into prod select public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Taza', 'price', 28000, 'cost', 10000, 'min_stock', 3, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
update public.products set min_stock = 3;
update ctx set v = (select id from public.product_variants where product_id = (select id from prod));
reset role;
create temp table marca as select count(*) n from net.http_request_queue;
set local role authenticated;
-- 5 → 4: no avisa. 4 → 2: cruza el mínimo (3), avisa. 2 → 1: ya estaba abajo, no avisa otra vez.
select public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', current_date, 'warehouse_id', principal, 'items', jsonb_build_array(jsonb_build_object('variant_id', v, 'name', 'Taza', 'unit_price', 28000, 'quantity', q)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 28000 * q)))) from ctx, (values (1), (2), (1)) as x(q);
reset role;
insert into r select 'Inventario bajo: un solo aviso al cruzar el mínimo (las ventas propias no avisan)',
  (select count(*) from net.http_request_queue) - (select n from marca) = 1
  and exists (select 1 from net.http_request_queue where convert_from(body, 'utf8') like '%Queda poco: Taza%');
insert into r select 'Resumen de la semana: ventas y número del POS',
  (select (x ->> 'ventas')::bigint = 112000 and (x ->> 'numero')::int = 3 and x ->> 'negocio' = 'Tienda' from (select public.resumen_de_semana('00000000-0000-0000-0000-00000000000a', current_date - 1, current_date) x) s);
insert into r select 'El resumen semanal está programado (lunes 13:00 UTC)', exists (select 1 from cron.job where jobname = 'resumen-semanal' and schedule = '0 13 * * 1');
select * from r;
rollback;
