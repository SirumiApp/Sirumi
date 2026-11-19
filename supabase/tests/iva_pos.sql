-- Pruebas del IVA en el POS (regla D6). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, efectivo uuid, v1 jsonb, v2 jsonb);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, efectivo) select b.id, a.id from public.businesses b join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';

-- IVA incluido: 119.000 → IVA 19.000, total 119.000.
update ctx set v1 = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'iva', jsonb_build_object('tarifa', 19, 'incluido', true),
  'items', jsonb_build_array(jsonb_build_object('name', 'Servicio', 'unit_price', 119000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 119000))));
insert into r select 'D6: IVA incluido 119.000 → IVA 19.000 y total igual', (select tax = 19000 and total = 119000 and tax_included from public.sales s, ctx where s.id = (ctx.v1 ->> 'id')::uuid);

-- Sumar IVA: 100.000 → total 119.000 (los pagos deben sumar 119.000).
update ctx set v2 = public.cobrar_venta(jsonb_build_object('business_id', negocio, 'iva', jsonb_build_object('tarifa', 19, 'incluido', false),
  'items', jsonb_build_array(jsonb_build_object('name', 'Servicio', 'unit_price', 100000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 119000))));
insert into r select 'D6: sumar IVA 100.000 → total 119.000 y entra todo a la caja',
  (select tax = 19000 and total = 119000 and not tax_included from public.sales s, ctx where s.id = (ctx.v2 ->> 'id')::uuid)
  and (select sum(amount) = 119000 from public.movements m, ctx where m.sale_id = (ctx.v2 ->> 'id')::uuid);
do $$ begin
  begin
    perform public.cobrar_venta(jsonb_build_object('business_id', negocio, 'iva', jsonb_build_object('tarifa', 19, 'incluido', false),
      'items', jsonb_build_array(jsonb_build_object('name', 'X', 'unit_price', 100000, 'quantity', 1)),
      'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 100000)))) from ctx;
    insert into r values ('Si se suma IVA, cobrar sin el IVA no cuadra', false);
  exception when raise_exception then insert into r values ('Si se suma IVA, cobrar sin el IVA no cuadra', sqlerrm = 'pagosNoCuadran'); end;
end $$;
select public.cobrar_venta(jsonb_build_object('business_id', negocio, 'items', jsonb_build_array(jsonb_build_object('name', 'X', 'unit_price', 5000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 5000)))) from ctx;
insert into r select 'Sin IVA (como antes) sigue igual', (select tax = 0 and tax_rate is null and total = 5000 from public.sales where number = 3);
reset role;
select * from r;
rollback;
