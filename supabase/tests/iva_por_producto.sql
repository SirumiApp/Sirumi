-- D6b · IVA por producto. Transacción que se deshace.
begin;
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, efectivo uuid, v19 uuid, v5 uuid, v0 uuid, venta jsonb);
grant all on ctx to authenticated, anon;
create temp table prod(n text, id uuid);
grant all on prod to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
update ctx set negocio = null;
insert into ctx (negocio, principal, efectivo) select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into prod select 'general', public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Taza', 'price', 119000, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
insert into prod select 'cinco', public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Café', 'price', 105000, 'tax_rate', 5, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
insert into prod select 'exento', public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Libro', 'price', 50000, 'tax_rate', 0, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
update ctx set v19 = (select v.id from public.product_variants v join prod on prod.id = v.product_id and prod.n = 'general'),
  v5 = (select v.id from public.product_variants v join prod on prod.id = v.product_id and prod.n = 'cinco'),
  v0 = (select v.id from public.product_variants v join prod on prod.id = v.product_id and prod.n = 'exento');
insert into r select 'El producto guarda su tarifa', (select tax_rate = 5 from public.products where name = 'Café') and (select tax_rate is null from public.products where name = 'Taza');
-- Igual al ejemplo de la app: 119.000 (19%) + 105.000 (5%) + 50.000 (exento), IVA incluido → IVA 24.000.
update ctx set venta = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'iva', jsonb_build_object('tarifa', 19, 'incluido', true),
  'items', jsonb_build_array(jsonb_build_object('variant_id', v19, 'name', 'Taza', 'unit_price', 119000, 'quantity', 1), jsonb_build_object('variant_id', v5, 'name', 'Café', 'unit_price', 105000, 'quantity', 1), jsonb_build_object('variant_id', v0, 'name', 'Libro', 'unit_price', 50000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 274000))));
insert into r select 'IVA mezclado: 19.000 + 5.000 = 24.000, total 274.000', (select tax = 24000 and total = 274000 from public.sales);
insert into r select 'Cada línea guarda su tarifa', (select array_agg(tax_rate::float8 order by unit_price desc) = array[19, 5, 0]::float8[] from public.sale_items);
-- Con 10% de descuento y solo 19% + 5%: 17.100 + 4.500 = 21.600 (igual que la app).
update ctx set venta = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'discount', 22400, 'iva', jsonb_build_object('tarifa', 19, 'incluido', true),
  'items', jsonb_build_array(jsonb_build_object('variant_id', v19, 'name', 'Taza', 'unit_price', 119000, 'quantity', 1), jsonb_build_object('variant_id', v5, 'name', 'Café', 'unit_price', 105000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 201600))));
insert into r select 'Con descuento: IVA 21.600', (select tax = 21600 from public.sales s, ctx where s.id = (ctx.venta ->> 'id')::uuid);
reset role;
select * from r;
rollback;
