-- Pruebas de topes. Corre dentro de una transacción que se deshace al final.
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
insert into public.budgets (category_id, monthly_limit) select id, 1200000 from public.categories where key = 'comida';
insert into r select 'A pone un tope', (select count(*)=1 from public.budgets);
do $$ begin
  begin
    insert into public.budgets (category_id, monthly_limit) select id, 500000 from public.categories where key = 'comida';
    insert into r values ('Un solo tope por categoría', false);
  exception when unique_violation then insert into r values ('Un solo tope por categoría', true); end;
  begin
    insert into public.budgets (category_id, monthly_limit) select id, 0 from public.categories where key = 'mercado';
    insert into r values ('El tope debe ser mayor que 0', false);
  exception when check_violation then insert into r values ('El tope debe ser mayor que 0', true); end;
end $$;

reset role;
create temp table cat_a as select id from public.categories where key = 'mercado' and user_id = '00000000-0000-0000-0000-00000000000a';
grant select on cat_a to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve los topes de A', (select count(*)=0 from public.budgets);
do $$ begin
  begin
    insert into public.budgets (category_id, monthly_limit) values ((select id from cat_a), 100);
    insert into r values ('B no pone topes en categorías de A', false);
  exception when insufficient_privilege then insert into r values ('B no pone topes en categorías de A', true); end;
end $$;
update public.budgets set monthly_limit = 1;
reset role;
insert into r select 'B no cambió el tope de A', (select monthly_limit=1200000 from public.budgets);
select * from r;
rollback;
