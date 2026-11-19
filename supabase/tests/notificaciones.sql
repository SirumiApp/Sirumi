-- Pruebas de las notificaciones de venta. Corre en una transacción que se deshace al final
-- (el envío queda en la cola de pg_net y se deshace: no sale ningún aviso real).
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, efectivo uuid, codigo text, antes int);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio, efectivo) select b.id, a.id from public.businesses b join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
select public.registrar_celular('ExponentPushToken[prueba-dueno]', 'ios');
update ctx set codigo = public.crear_invitacion(negocio, 'Camila');
insert into r select 'El celular queda registrado a nombre de su dueña', (select count(*) = 1 from public.push_tokens);
do $$ begin
  begin
    insert into public.push_tokens (token, user_id) values ('ExponentPushToken[ajeno]', '00000000-0000-0000-0000-00000000000c');
    insert into r values ('Nadie registra celulares a nombre de otro', false);
  exception when insufficient_privilege then insert into r values ('Nadie registra celulares a nombre de otro', true); end;
end $$;

-- Camila vende: a la dueña le llega el aviso.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select public.unirse_con_codigo(codigo) from ctx;
reset role;
update ctx set antes = (select count(*) from net.http_request_queue);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select public.cobrar_venta(jsonb_build_object('business_id', negocio, 'items', jsonb_build_array(jsonb_build_object('name', 'Bolso', 'unit_price', 85000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 85000)))) from ctx;
reset role;
insert into r select 'Cuando una vendedora vende, sale un aviso para la dueña', (select count(*) = (select antes from ctx) + 1 from net.http_request_queue);
insert into r select 'El aviso dice el monto, quién vendió y el número',
  (select convert_from(body, 'utf8') like '%¡Venta! $ 85.000%' and convert_from(body, 'utf8') like '%Camila vendió · POS-0001 · Efectivo%' from net.http_request_queue order by id desc limit 1);

-- La dueña vende ella misma: no se avisa a sí misma.
update ctx set antes = (select count(*) from net.http_request_queue);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.cobrar_venta(jsonb_build_object('business_id', negocio, 'items', jsonb_build_array(jsonb_build_object('name', 'X', 'unit_price', 1000, 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('nombre', 'Efectivo', 'cuenta', efectivo, 'monto', 1000)))) from ctx;
reset role;
insert into r select 'Si vende la dueña, no se avisa a sí misma', (select count(*) = (select antes from ctx) from net.http_request_queue);
insert into r select 'Formato de pesos: $ 1.250.000', (select public.formato_pesos(1250000) = '$ 1.250.000');
select * from r;
rollback;
