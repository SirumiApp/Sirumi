-- Pruebas de códigos de descuento (D7). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, efectivo uuid, codigo text);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, efectivo) select b.id, a.id from public.businesses b join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
insert into public.discount_codes (business_id, code, kind, value) select negocio, 'NAVIDAD10', 'porcentaje', 10 from ctx;
update ctx set codigo = public.crear_invitacion(negocio, 'Camila');
insert into r select 'La dueña crea códigos', (select count(*) = 1 from public.discount_codes);
do $$ begin
  begin
    insert into public.discount_codes (business_id, code, kind, value) select negocio, 'MAL', 'porcentaje', 150 from ctx;
    insert into r values ('Un porcentaje no pasa de 100', false);
  exception when check_violation then insert into r values ('Un porcentaje no pasa de 100', true); end;
  begin
    insert into public.discount_codes (business_id, code, kind, value) select negocio, 'NAVIDAD10', 'monto', 5 from ctx;
    insert into r values ('No se repite el código en el negocio', false);
  exception when unique_violation then insert into r values ('No se repite el código en el negocio', true); end;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select public.unirse_con_codigo(codigo) from ctx;
insert into r select 'El vendedor ve los códigos para usarlos', (select count(*) = 1 from public.discount_codes);
do $$ begin
  begin
    insert into public.discount_codes (business_id, code, kind, value) select negocio, 'PIRATA', 'porcentaje', 90 from ctx;
    insert into r values ('El vendedor no crea códigos', false);
  exception when insufficient_privilege then insert into r values ('El vendedor no crea códigos', true); end;
end $$;
select public.cobrar_venta(jsonb_build_object('business_id', negocio, 'discount', 8500, 'discount_code', 'navidad10',
  'items', jsonb_build_array(jsonb_build_object('name', 'Bolso', 'unit_price', 85000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 76500)))) from ctx;
insert into r select 'La venta guarda el código usado', (select discount_code = 'NAVIDAD10' and total = 76500 from public.sales);
reset role;
select * from r;
rollback;
