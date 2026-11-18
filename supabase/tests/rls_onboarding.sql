-- Pruebas del onboarding y de la seguridad de bodegas y cuentas. Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','{"full_name":"Ana"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','{}','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$ begin
  begin
    perform public.completar_onboarding('{"usage":"personal","policy_version":"v1","consents":{"terminos":true,"datos":false}}');
    insert into r values ('Sin la autorización de datos no se crea la cuenta', false);
  exception when others then insert into r values ('Sin la autorización de datos no se crea la cuenta', true); end;
end $$;
select public.completar_onboarding('{"full_name":"Ana Pérez","phone":"+57 3001234567","country":"CO","currency":"COP","usage":"ambos","business_name":"Tienda de Ana","policy_version":"v1","plan":{"objetivo":"ahorro","ingreso":6000000,"separar":2000000},"consents":{"terminos":true,"datos":true,"ia":false,"novedades":true}}');
select public.completar_onboarding('{"usage":"ambos","business_name":"Otra","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into r select 'Perfil guardado', (select full_name='Ana Pérez' and usage='ambos' and onboarded_at is not null and preferences->'plan'->>'ingreso'='6000000' from public.profiles);
insert into r select 'Una fila por autorización (4)', (select count(*)=4 from public.consents);
insert into r select 'Guarda las negadas también', (select not granted from public.consents where kind='ia');
insert into r select 'Repetir no duplica el negocio', (select count(*)=1 from public.businesses);
insert into r select 'Negocio con su nombre y dueña', (select b.name='Tienda de Ana' and m.role='owner' from public.businesses b join public.business_members m on m.business_id=b.id);
insert into r select 'Bodega principal creada', (select count(*)=1 from public.warehouses where name='Bodega principal' and is_main);
insert into r select 'Cuenta Efectivo creada', (select count(*)=1 from public.accounts where name='Efectivo' and kind='efectivo' and owner_type='negocio');
insert into public.accounts (owner_type, user_id, name, kind) values ('personal','00000000-0000-0000-0000-00000000000a','Nequi','billetera');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve bodegas de A', (select count(*)=0 from public.warehouses);
insert into r select 'B no ve cuentas de A', (select count(*)=0 from public.accounts);
do $$ begin
  begin
    insert into public.accounts (owner_type, user_id, name, kind) values ('personal','00000000-0000-0000-0000-00000000000a','Falsa','banco');
    insert into r values ('B no crea cuentas a nombre de A', false);
  exception when insufficient_privilege then insert into r values ('B no crea cuentas a nombre de A', true); end;
end $$;
select public.completar_onboarding('{"full_name":"Beto","usage":"personal","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into r select 'Solo personal: no crea negocio', (select count(*)=0 from public.businesses);
reset role;
select * from r;
rollback;
