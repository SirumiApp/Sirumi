-- Pruebas de seguridad (RLS) de las tablas base. Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','{"full_name":"Ana"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','{}','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into r select 'A ve solo su perfil', (select count(*) from public.profiles)=1 and (select full_name from public.profiles)='Ana';
insert into public.consents(kind,granted,policy_version) values ('datos',true,'2026-11');
select public.crear_negocio('Tienda de Ana');
insert into r select 'A ve su negocio', (select count(*) from public.businesses)=1;
insert into r select 'A es dueña', (select role from public.business_members)='owner';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve perfil de A', (select count(*) from public.profiles)=1;
insert into r select 'B no ve autorizaciones de A', (select count(*) from public.consents)=0;
insert into r select 'B no ve negocio de A', (select count(*) from public.businesses)=0;
insert into r select 'B no ve miembros de A', (select count(*) from public.business_members)=0;
update public.profiles set full_name='hack' where id='00000000-0000-0000-0000-00000000000a';
reset role;
insert into r select 'B no pudo editar perfil de A', (select full_name from public.profiles where id='00000000-0000-0000-0000-00000000000a')='Ana';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$ begin
  begin
    insert into public.business_members select id,'00000000-0000-0000-0000-00000000000b','owner' from public.businesses;
  exception when others then null; end;
  begin
    insert into public.consents(user_id,kind,granted,policy_version) values ('00000000-0000-0000-0000-00000000000a','datos',false,'x');
    insert into r values ('B no puede crear autorizaciones a nombre de A', false);
  exception when insufficient_privilege then insert into r values ('B no puede crear autorizaciones a nombre de A', true); end;
end $$;
reset role;
insert into r select 'B no se pudo meter al negocio de A', (select count(*) from public.business_members where user_id='00000000-0000-0000-0000-00000000000b')=0;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$ begin
  begin
    update public.consents set granted=false;
    insert into r values ('Nadie edita autorizaciones', false);
  exception when insufficient_privilege then insert into r values ('Nadie edita autorizaciones', true); end;
end $$;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform 1 from public.profiles;
    insert into r values ('Sin sesión no se ve nada', false);
  exception when insufficient_privilege then insert into r values ('Sin sesión no se ve nada', true); end;
end $$;
reset role;
select * from r;
rollback;
