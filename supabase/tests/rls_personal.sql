-- Pruebas de categorías y movimientos personales. Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.crear_categorias_iniciales();
select public.crear_categorias_iniciales();
insert into r select 'Crea 7 categorías iniciales una sola vez', (select count(*)=7 from public.categories);
insert into public.movements (date, kind, amount, category_id, description)
  select '2026-11-15', 'gasto', 25000, id, 'Almuerzo' from public.categories where key='comida';
insert into r select 'Registra un gasto', (select count(*)=1 from public.movements);
do $$ begin
  begin
    insert into public.movements (date, kind, amount) values ('2026-11-15','gasto',0);
    insert into r values ('No acepta montos en cero', false);
  exception when check_violation then insert into r values ('No acepta montos en cero', true); end;
  begin
    insert into public.movements (date, kind, amount) values ('2026-11-15','venta',1000);
    insert into r values ('Personal solo acepta gasto o ingreso', false);
  exception when check_violation then insert into r values ('Personal solo acepta gasto o ingreso', true); end;
end $$;

reset role;
create temp table cat_a as select id from public.categories where key = 'comida' and user_id = '00000000-0000-0000-0000-00000000000a';
grant select on cat_a to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve categorías de A', (select count(*)=0 from public.categories);
insert into r select 'B no ve movimientos de A', (select count(*)=0 from public.movements);
update public.movements set amount = 1;
delete from public.movements;
do $$ begin
  begin
    insert into public.movements (date, kind, amount, category_id) values ('2026-11-15','gasto',1000, (select id from cat_a));
    insert into r values ('B no usa categorías de A', false);
  exception when insufficient_privilege then insert into r values ('B no usa categorías de A', true); end;
end $$;
do $$ begin
  begin
    insert into public.movements (user_id, date, kind, amount) values ('00000000-0000-0000-0000-00000000000a','2026-11-15','gasto',1000);
    insert into r values ('B no registra movimientos a nombre de A', false);
  exception when insufficient_privilege then insert into r values ('B no registra movimientos a nombre de A', true); end;
end $$;
reset role;
insert into r select 'B no pudo editar ni borrar lo de A', (select amount=25000 from public.movements where user_id='00000000-0000-0000-0000-00000000000a');
select * from r;
rollback;
