-- Pruebas del POS (reglas D1–D5). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, principal uuid, local uuid, efectivo uuid, nequi uuid, bolso uuid, v_bolso uuid, cliente uuid, venta1 jsonb, venta2 jsonb, venta3 jsonb);
grant all on ctx to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, principal, efectivo)
  select b.id, w.id, a.id from public.businesses b join public.warehouses w on w.business_id = b.id and w.is_main join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into public.warehouses (business_id, name) select negocio, 'Local' from ctx;
insert into public.accounts (owner_type, business_id, name, kind) select 'negocio', negocio, 'Nequi', 'billetera' from ctx;
insert into public.contacts (business_id, kind, name, data_consent) select negocio, 'cliente', 'María', true from ctx;
update ctx set local = (select id from public.warehouses where name = 'Local'), nequi = (select id from public.accounts where name = 'Nequi'), cliente = (select id from public.contacts);
update ctx set bolso = public.crear_producto(jsonb_build_object('business_id', negocio, 'name', 'Bolso', 'price', 85000, 'cost', 37000,
  'warehouse_id', principal, 'variants', jsonb_build_array(jsonb_build_object('quantity', 3))));
update ctx set v_bolso = (select id from public.product_variants where product_id = ctx.bolso);

-- D1 + D3: bolso 85.000 con 10% → 76.500, pagado 25% efectivo + 75% Nequi.
update ctx set venta1 = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'discount', 8500,
  'items', jsonb_build_array(jsonb_build_object('variant_id', v_bolso, 'name', 'Bolso', 'unit_price', 85000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 19125), jsonb_build_object('nombre', 'Nequi', 'cuenta', nequi, 'monto', 57375))));
insert into r select 'D1: total 76.500, número POS 1, costo real guardado',
  (select total = 76500 and discount = 8500 and number = 1 from public.sales s, ctx where s.id = (ctx.venta1 ->> 'id')::uuid)
  and (select unit_cost = 37000 from public.sale_items);
insert into r select 'D3: un movimiento de venta pagado por cada parte, en su cuenta',
  (select count(*) = 2 and sum(amount) = 76500 and bool_and(paid) from public.movements m, ctx where m.sale_id = (ctx.venta1 ->> 'id')::uuid);
insert into r select 'D2: el stock de la bodega de venta baja (3 → 2)', (select quantity = 2 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.principal);

-- Fiado con cliente: queda por cobrar y sin cuenta; número 2.
update ctx set venta2 = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'date', '2026-11-19', 'warehouse_id', principal, 'contact_id', cliente,
  'items', jsonb_build_array(jsonb_build_object('variant_id', null, 'name', 'Arreglo', 'unit_price', 20000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Fiado', 'cuenta', null, 'monto', 20000))));
insert into r select 'Fiado: venta pendiente, sin cuenta, con cliente; número 2',
  (select status = 'fiada' and number = 2 from public.sales s, ctx where s.id = (ctx.venta2 ->> 'id')::uuid)
  and (select not paid and account_id is null and contact_id is not null from public.movements m, ctx where m.sale_id = (ctx.venta2 ->> 'id')::uuid);

do $$ begin
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'warehouse_id', principal,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_bolso, 'name', 'Bolso', 'unit_price', 85000, 'quantity', 5)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 425000)))) from ctx;
    insert into r values ('D2: no vende más de lo que hay en la bodega', false);
  exception when raise_exception then insert into r values ('D2: no vende más de lo que hay en la bodega', sqlerrm = 'stockInsuficiente'); end;
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'warehouse_id', principal,
      'items', jsonb_build_array(jsonb_build_object('variant_id', null, 'name', 'X', 'unit_price', 1000, 'quantity', 1)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Fiado', 'cuenta', null, 'monto', 1000)))) from ctx;
    insert into r values ('Fiado sin cliente no se cobra', false);
  exception when raise_exception then insert into r values ('Fiado sin cliente no se cobra', sqlerrm = 'fiadoSinCliente'); end;
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'warehouse_id', principal,
      'items', jsonb_build_array(jsonb_build_object('variant_id', null, 'name', 'X', 'unit_price', 1000, 'quantity', 1)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 900)))) from ctx;
    insert into r values ('Los pagos tienen que sumar el total', false);
  exception when raise_exception then insert into r values ('Los pagos tienen que sumar el total', sqlerrm = 'pagosNoCuadran'); end;
end $$;
insert into r select 'Si el cobro falla no queda nada a medias (2 ventas, stock 2)',
  (select count(*) = 2 from public.sales) and (select quantity = 2 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.principal);

-- D4: devolver la venta 1 → stock vuelve a la bodega, la plata se va, queda devuelta; no se devuelve dos veces.
select public.devolver_venta((venta1 ->> 'id')::uuid) from ctx;
insert into r select 'D4: devolver devuelve el stock a la misma bodega y quita la plata',
  (select quantity = 3 from public.stock s, ctx where s.variant_id = ctx.v_bolso and s.warehouse_id = ctx.principal)
  and (select count(*) = 0 from public.movements m, ctx where m.sale_id = (ctx.venta1 ->> 'id')::uuid)
  and (select status = 'devuelta' from public.sales s, ctx where s.id = (ctx.venta1 ->> 'id')::uuid);
do $$ begin
  begin
    perform public.devolver_venta((venta1 ->> 'id')::uuid) from ctx;
    insert into r values ('D4: una venta devuelta no se devuelve otra vez', false);
  exception when raise_exception then insert into r values ('D4: una venta devuelta no se devuelve otra vez', sqlerrm = 'yaDevuelta'); end;
  begin
    insert into public.sales (business_id, number, date, subtotal, total) select negocio, 99, current_date, 1, 1 from ctx;
    insert into r values ('Nadie crea ventas directo (solo cobrando)', false);
  exception when insufficient_privilege then insert into r values ('Nadie crea ventas directo (solo cobrando)', true); end;
end $$;

-- B no ve ni cobra en el negocio de A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve ventas ni sus líneas', (select count(*) = 0 from public.sales) and (select count(*) = 0 from public.sale_items);
do $$ begin
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'items', jsonb_build_array(jsonb_build_object('name', 'X', 'unit_price', 1, 'quantity', 1)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 1)))) from ctx;
    insert into r values ('Un extraño no cobra en un negocio ajeno', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no cobra en un negocio ajeno', true); end;
end $$;
reset role;
select * from r;
rollback;
