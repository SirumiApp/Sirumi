-- Pruebas de vendedores con código. Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000d','d@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, feria uuid, efectivo uuid, v_bolso uuid, codigo text, codigo2 text, venta_c jsonb);
grant all on ctx to authenticated, anon;

-- A es dueña: arma el negocio, un producto con stock en dos bodegas, y crea un código para Camila (bodega Feria).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, principal, efectivo) select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into public.warehouses (business_id, name) select negocio, 'Feria' from ctx;
update ctx set feria = (select id from public.warehouses where name = 'Feria');
select public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Bolso', 'price', 85000, 'cost', 37000, 'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 5)))) from ctx;
update ctx set v_bolso = (select id from public.product_variants);
select public.mover_inventario(v_bolso, feria, 3, 'compraProveedor') from ctx;
insert into public.movements (owner_type, business_id, date, kind, amount, account_id) select 'negocio', negocio, '2026-11-01', 'aporte', 1000000, efectivo from ctx;
update ctx set codigo = public.crear_invitacion(negocio, 'Camila', feria), codigo2 = public.crear_invitacion(negocio, 'Diego');
insert into r select 'El código tiene 6 letras sin confusiones', (select codigo ~ '^[A-Z2-9]{6}$' from ctx);

-- C entra como vendedora con el código (camino del onboarding).
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into r select 'Revisar el código muestra el nombre del negocio', (select public.revisar_codigo(lower(codigo)) = 'Tienda' from ctx);
select public.completar_onboarding(jsonb_build_object('full_name', 'Camila', 'usage', 'vendedor', 'invite_code', codigo, 'policy_version', 'v1', 'consents', jsonb_build_object('terminos', true, 'datos', true))) from ctx;
insert into r select 'Con el código queda como vendedora del negocio, en su bodega', (select role = 'seller' and display_name = 'Camila' and warehouse_id = (select feria from ctx) from public.business_members where user_id = '00000000-0000-0000-0000-00000000000c');
insert into r select 'Ve productos, stock y bodegas para vender', (select count(*) = 1 from public.products) and (select count(*) = 2 from public.stock) and (select count(*) = 2 from public.warehouses);
insert into r select 'No ve la plata: cuentas, movimientos, configuración', (select count(*) = 0 from public.accounts) and (select count(*) = 0 from public.movements);
do $$ begin
  begin
    perform setup from public.businesses;
    insert into r values ('No lee la configuración del negocio', false);
  exception when insufficient_privilege then insert into r values ('No lee la configuración del negocio', true); end;
end $$;
insert into r select 'Ve las cuentas solo para cobrar (sin saldos)', (select count(*) = 1 from public.cuentas_para_vender((select negocio from ctx)));
insert into r select 'Ve solo si cobra IVA, no el resto de la configuración', (select public.configuracion_de_negocio((select negocio from ctx)) = '{"setup": {"responsable_iva": false}, "tax_regime": null}'::jsonb);

-- Vende: aunque pida la bodega principal, sale de su bodega (Feria).
update ctx set venta_c = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'warehouse_id', principal,
  'items', jsonb_build_array(jsonb_build_object('variant_id', v_bolso, 'name', 'Bolso', 'unit_price', 85000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 85000))));
insert into r select 'La vendedora cobra y la venta sale de SU bodega',
  (select warehouse_id = (select feria from ctx) and seller_id = '00000000-0000-0000-0000-00000000000c' from public.sales)
  and (select quantity = 2 from public.stock s, ctx where s.warehouse_id = ctx.feria);
insert into public.contacts (business_id, kind, name, data_consent) select negocio, 'cliente', 'Cliente de feria', true from ctx;
insert into r select 'Registra clientes en el POS', (select count(*) = 1 from public.contacts);
do $$ begin
  begin
    insert into public.contacts (business_id, kind, name, data_consent) select negocio, 'proveedor', 'X', true from ctx;
    insert into r values ('No registra proveedores', false);
  exception when insufficient_privilege then insert into r values ('No registra proveedores', true); end;
  begin
    perform public.devolver_venta((venta_c ->> 'id')::uuid) from ctx;
    insert into r values ('No puede devolver ventas', false);
  exception when insufficient_privilege then insert into r values ('No puede devolver ventas', true); end;
  begin
    perform public.crear_invitacion(negocio, 'Otro') from ctx;
    insert into r values ('No crea códigos', false);
  exception when insufficient_privilege then insert into r values ('No crea códigos', true); end;
  begin
    perform public.unirse_con_codigo(codigo) from ctx;
    insert into r values ('Un código sirve una sola vez', false);
  exception when raise_exception then insert into r values ('Un código sirve una sola vez', sqlerrm = 'codigoInvalido'); end;
end $$;

-- D entra con el otro código y no ve las ventas de Camila.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select public.unirse_con_codigo(codigo2) from ctx;
insert into r select 'Cada vendedor ve solo sus ventas', (select count(*) = 0 from public.sales) and (select count(*) = 0 from public.sale_items);

-- A (dueña) ve todo: la venta de Camila, la plata y quita a Diego.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into r select 'La dueña ve las ventas de sus vendedores y la plata', (select count(*) = 1 from public.sales) and (select sum(amount) = 1085000 from public.movements);
select public.quitar_vendedor(negocio, '00000000-0000-0000-0000-00000000000d') from ctx;
insert into r select 'La dueña quita a un vendedor', (select count(*) = 2 from public.business_members);
reset role;
select * from r;
rollback;
