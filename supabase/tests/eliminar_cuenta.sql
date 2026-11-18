-- Pruebas de "Eliminar mi cuenta". Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

-- A: negocio propio, movimientos y topes. B: negocio compartido con C (los dos dueños).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"ambos","business_name":"Tienda de Ana","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
select public.crear_categorias_iniciales();
insert into public.movements (date, kind, amount, category_id) select '2026-11-15','gasto',1000,id from public.categories where key='comida';
insert into public.budgets (category_id, monthly_limit) select id, 500000 from public.categories where key='comida';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Beto","usage":"negocio","business_name":"Socios","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
reset role;
insert into public.business_members (business_id, user_id, role) select id, '00000000-0000-0000-0000-00000000000c', 'owner' from public.businesses where name = 'Socios';

-- A elimina su cuenta
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.eliminar_mi_cuenta();
reset role;
insert into r select 'Se borra la cuenta de A', (select count(*)=0 from auth.users where id='00000000-0000-0000-0000-00000000000a');
insert into r select 'Se borra su perfil y sus autorizaciones', (select count(*)=0 from public.profiles where id='00000000-0000-0000-0000-00000000000a') and (select count(*)=0 from public.consents where user_id='00000000-0000-0000-0000-00000000000a');
insert into r select 'Se borran sus categorías, movimientos y topes', (select count(*)=0 from public.categories where user_id='00000000-0000-0000-0000-00000000000a') and (select count(*)=0 from public.movements where user_id='00000000-0000-0000-0000-00000000000a') and (select count(*)=0 from public.budgets where user_id='00000000-0000-0000-0000-00000000000a');
insert into r select 'Se borra el negocio del que era única dueña', (select count(*)=0 from public.businesses where name='Tienda de Ana') and (select count(*)=0 from public.warehouses w where not exists (select 1 from public.businesses b where b.id=w.business_id));

-- B elimina su cuenta: el negocio compartido queda a nombre de C
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.eliminar_mi_cuenta();
reset role;
insert into r select 'El negocio compartido sigue y queda a nombre de C', (select created_by='00000000-0000-0000-0000-00000000000c' from public.businesses where name='Socios');
insert into r select 'C sigue siendo dueña', (select count(*)=1 from public.business_members m join public.businesses b on b.id=m.business_id where b.name='Socios' and m.user_id='00000000-0000-0000-0000-00000000000c');
insert into r select 'C no se borró', (select count(*)=1 from auth.users where id='00000000-0000-0000-0000-00000000000c');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform public.eliminar_mi_cuenta();
    insert into r values ('Sin sesión no se puede usar', false);
  exception when insufficient_privilege then insert into r values ('Sin sesión no se puede usar', true); end;
end $$;
reset role;
select * from r;
rollback;
