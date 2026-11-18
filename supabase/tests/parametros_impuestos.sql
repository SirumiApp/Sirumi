-- Pruebas de la tabla de parámetros de impuestos. Corre dentro de una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into r select 'Con sesión se leen los parámetros de 2026', (select (params->>'uvt')::int = 52374 from public.tax_parameters where year = 2026);
do $$ begin
  begin
    update public.tax_parameters set note = 'x';
    insert into r values ('Nadie los cambia desde la app', false);
  exception when insufficient_privilege then insert into r values ('Nadie los cambia desde la app', true); end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.tax_parameters;
    insert into r values ('Sin sesión no se leen', false);
  exception when insufficient_privilege then insert into r values ('Sin sesión no se leen', true); end;
end $$;
reset role;
select * from r;
rollback;
