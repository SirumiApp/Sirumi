-- Pruebas de las fotos de productos (storage). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid);
grant all on ctx to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx select id from public.businesses;
insert into storage.objects (bucket_id, name, owner) select 'product-photos', negocio || '/foto.jpg', '00000000-0000-0000-0000-00000000000a' from ctx;
insert into r select 'El dueño sube la foto en la carpeta de su negocio', (select count(*) = 1 from storage.objects where bucket_id = 'product-photos' and name like (select negocio from ctx) || '/%');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('product-photos', '00000000-0000-0000-0000-000000000099/x.jpg');
    insert into r values ('No sube fotos a la carpeta de otro negocio', false);
  exception when insufficient_privilege then insert into r values ('No sube fotos a la carpeta de otro negocio', true); end;
  begin
    insert into storage.objects (bucket_id, name) values ('product-photos', 'sin-carpeta.jpg');
    insert into r values ('Una ruta sin negocio no se acepta', false);
  exception when insufficient_privilege then insert into r values ('Una ruta sin negocio no se acepta', true); end;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve las fotos', (select count(*) = 0 from storage.objects where bucket_id = 'product-photos' and name like (select negocio from ctx) || '/%');
reset role;
select * from r;
rollback;
